'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { dbQuerySingle, dbExecute } from '@/lib/db';

const SESSION_COOKIE_NAME = 'amanah_dev_session';
const TOKEN_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.DATABASE_URL ||
  'amanah_drive_developer_auth_secure_secret_salt_2026';

export interface DeveloperUser {
  id: string;
  username: string;
  nama: string;
  role: string;
  email: string;
}

export interface SessionResult {
  isAuthenticated: boolean;
  user: DeveloperUser | null;
}

interface TokenPayload {
  id: string;
  username: string;
  nama: string;
  role: string;
  email: string;
  exp: number; // Unix timestamp
}

/**
 * Sign session payload with HMAC-SHA256
 */
function createSignedToken(payload: TokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify and decode signed session token
 */
function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(data)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get client IP & User Agent from request headers
 */
async function getRequestMetadata(): Promise<{ ip: string; userAgent: string }> {
  try {
    const headerStore = await headers();
    const forwardedFor = headerStore.get('x-forwarded-for');
    const realIp = headerStore.get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';
    const userAgent = headerStore.get('user-agent') || 'Browser Client';
    return { ip, userAgent };
  } catch {
    return { ip: '127.0.0.1', userAgent: 'Browser Client' };
  }
}

/**
 * Authenticate Developer using username/password against Supabase Auth & public.user_profiles
 */
export async function loginDeveloperAction(formData: {
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string; user?: DeveloperUser }> {
  const cleanUsername = (formData.username || '').trim();
  const cleanPassword = formData.password || '';

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'Username dan password wajib diisi.' };
  }

  try {
    // 1. Fetch user from PostgreSQL
    const userRow = await dbQuerySingle<{
      id: string;
      email: string;
      encrypted_password: string;
      username: string;
      nama: string;
      role: string;
    }>(
      `SELECT u.id, u.email, u.encrypted_password, p.username, p.nama, p.role
       FROM auth.users u
       JOIN public.user_profiles p ON p.id = u.id
       WHERE LOWER(p.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [cleanUsername]
    );

    if (!userRow) {
      return { success: false, error: 'Kredensial tidak valid atau akun Developer tidak ditemukan.' };
    }

    // 2. Verify password with bcryptjs
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(cleanPassword, userRow.encrypted_password);
    } catch {
      isPasswordValid = false;
    }

    // Fallback verification via PostgreSQL crypt function if bcryptjs encounters salt compatibility
    if (!isPasswordValid) {
      const cryptCheck = await dbQuerySingle<{ is_valid: boolean }>(
        `SELECT (encrypted_password = extensions.crypt($1, encrypted_password)) AS is_valid
         FROM auth.users
         WHERE id = $2`,
        [cleanPassword, userRow.id]
      );
      if (cryptCheck?.is_valid) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return { success: false, error: 'Password yang Anda masukkan salah.' };
    }

    const { ip, userAgent } = await getRequestMetadata();

    // 3. Create Session Token (30 days validity)
    const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
    const exp = Date.now() + SESSION_DURATION_MS;
    const tokenPayload: TokenPayload = {
      id: userRow.id,
      username: userRow.username,
      nama: userRow.nama || 'Alfi',
      role: userRow.role,
      email: userRow.email,
      exp,
    };

    const token = createSignedToken(tokenPayload);

    // 4. Set Secure HTTP-only Cookie (30 days)
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    });

    // 5. Record Audit Log for Successful Login
    await dbExecute(
      `INSERT INTO public.audit_logs (
        actor_id, actor_username, actor_role, ip_address, user_agent,
        modul, aksi, entitas_tipe, entitas_id, judul, deskripsi, perubahan, tingkat_urgensi
      ) VALUES (
        $1, $2, $3, $4, $5,
        'auth', 'login', 'auth_session', $6, $7, $8, $9, 'info'
      )`,
      [
        userRow.id,
        userRow.username,
        userRow.role,
        ip,
        userAgent,
        userRow.id,
        `Login Sesi Developer: ${userRow.username}`,
        `Autentikasi sesi Developer berhasil dengan kredensial terverifikasi.`,
        JSON.stringify({
          client_ip: ip,
          browser: userAgent.slice(0, 100),
          login_time: new Date().toISOString(),
          status: 'success',
        }),
      ]
    );

    const user: DeveloperUser = {
      id: userRow.id,
      username: userRow.username,
      nama: userRow.nama,
      role: userRow.role,
      email: userRow.email,
    };

    return { success: true, user };
  } catch (err: any) {
    console.error('Error during developer login:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat memproses login.',
    };
  }
}

/**
 * Get active developer session from cookie
 */
export async function getDeveloperSession(): Promise<SessionResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return { isAuthenticated: false, user: null };
    }

    const payload = verifyToken(token);
    if (!payload) {
      // Clear invalid cookie
      try {
        cookieStore.delete(SESSION_COOKIE_NAME);
      } catch {}
      return { isAuthenticated: false, user: null };
    }

    // Sliding Expiration: Automatically extend cookie session when accessed if < 20 days remaining
    try {
      const remainingMs = payload.exp - Date.now();
      if (remainingMs < 20 * 24 * 60 * 60 * 1000) {
        const renewedPayload: TokenPayload = {
          ...payload,
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };
        const renewedToken = createSignedToken(renewedPayload);
        cookieStore.set({
          name: SESSION_COOKIE_NAME,
          value: renewedToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
          sameSite: 'lax',
        });
      }
    } catch {}

    return {
      isAuthenticated: true,
      user: {
        id: payload.id,
        username: payload.username,
        nama: payload.nama || 'Alfi',
        role: payload.role,
        email: payload.email,
      },
    };
  } catch {
    return { isAuthenticated: false, user: null };
  }
}

/**
 * Logout developer session
 */
export async function logoutDeveloperAction(): Promise<{ success: boolean }> {
  try {
    const session = await getDeveloperSession();
    const { ip, userAgent } = await getRequestMetadata();

    if (session.isAuthenticated && session.user) {
      await dbExecute(
        `INSERT INTO public.audit_logs (
          actor_id, actor_username, actor_role, ip_address, user_agent,
          modul, aksi, entitas_tipe, entitas_id, judul, deskripsi, perubahan, tingkat_urgensi
        ) VALUES (
          $1, $2, $3, $4, $5,
          'auth', 'logout', 'auth_session', $6, $7, $8, $9, 'info'
        )`,
        [
          session.user.id,
          session.user.username,
          session.user.role,
          ip,
          userAgent,
          session.user.id,
          `Logout Sesi Developer: ${session.user.username}`,
          `Pengguna mengakhiri sesi Developer secara aman.`,
          JSON.stringify({ logout_time: new Date().toISOString() }),
        ]
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return { success: true };
  } catch (err) {
    console.error('Error during logout:', err);
    return { success: true };
  }
}
