'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { dbQuerySingle, dbQuery, dbExecute } from '@/lib/db';
import { UserProfile, UserRole } from '@/types/database';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'amanah_session';
const TOKEN_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.DATABASE_URL ||
  'amanah_drive_rbac_session_secret_2026';

export interface AuthSessionPayload {
  id: string;
  username: string;
  nama: string;
  email: string;
  roles: UserRole[];
  staff_id: string | null;
  exp: number;
}

/**
 * Sign session payload with HMAC-SHA256
 */
function createSignedToken(payload: AuthSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify and decode session token
 */
function verifyToken(token: string): AuthSessionPayload | null {
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

    const payload: AuthSessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get client IP & User Agent
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
 * Login user via username/email & password
 */
export async function loginAction(formData: {
  username: string;
  password: string;
}): Promise<{
  success: boolean;
  error?: string;
  user?: {
    id: string;
    username: string;
    nama: string;
    email: string;
    roles: UserRole[];
    staff_id: string | null;
  };
}> {
  const cleanUsername = (formData.username || '').trim();
  const cleanPassword = formData.password || '';

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'Username dan password wajib diisi.' };
  }

  try {
    // 1. Fetch user from user_profiles
    const userRow = await dbQuerySingle<{
      id: string;
      username: string;
      nama: string;
      email: string;
      roles: string[];
      staff_id: string | null;
      password_hash: string | null;
      aktif: boolean;
    }>(
      `SELECT id, username, nama, email, roles, staff_id, password_hash, aktif
       FROM public.user_profiles
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [cleanUsername]
    );

    if (!userRow) {
      return { success: false, error: 'Kredensial tidak valid atau akun tidak ditemukan.' };
    }

    if (!userRow.aktif) {
      return { success: false, error: 'Akun Anda sedang dinonaktifkan. Hubungi Administrator.' };
    }

    // 2. Password verification
    let isPasswordValid = false;

    // Check against user_profiles.password_hash
    if (userRow.password_hash) {
      try {
        isPasswordValid = await bcrypt.compare(cleanPassword, userRow.password_hash);
      } catch {
        isPasswordValid = false;
      }
    }

    // Fallback: Check against auth.users.encrypted_password
    if (!isPasswordValid) {
      const authUser = await dbQuerySingle<{ encrypted_password: string }>(
        `SELECT encrypted_password FROM auth.users WHERE id = $1 LIMIT 1`,
        [userRow.id]
      );
      if (authUser?.encrypted_password) {
        try {
          isPasswordValid = await bcrypt.compare(cleanPassword, authUser.encrypted_password);
        } catch {}
      }
    }

    if (!isPasswordValid) {
      return { success: false, error: 'Password yang Anda masukkan salah.' };
    }

    const roles = (userRow.roles || []) as UserRole[];
    const { ip, userAgent } = await getRequestMetadata();

    // 3. Create Session Token (7 Days validity)
    const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
    const exp = Date.now() + SESSION_DURATION_SECONDS * 1000;

    const payload: AuthSessionPayload = {
      id: userRow.id,
      username: userRow.username,
      nama: userRow.nama,
      email: userRow.email,
      roles,
      staff_id: userRow.staff_id,
      exp,
    };

    const token = createSignedToken(payload);

    // 4. Set Secure HTTP-only Cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
      sameSite: 'lax',
    });

    // 5. Audit log
    try {
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
          roles.join(', '),
          ip,
          userAgent,
          userRow.id,
          `Login Pengguna: ${userRow.username} (${userRow.nama})`,
          `Pengguna berhasil masuk ke sistem dengan role [${roles.join(', ')}].`,
          JSON.stringify({ client_ip: ip, login_time: new Date().toISOString() }),
        ]
      );
    } catch (auditErr) {
      console.warn('Could not record login audit log:', auditErr);
    }

    return {
      success: true,
      user: {
        id: userRow.id,
        username: userRow.username,
        nama: userRow.nama,
        email: userRow.email,
        roles,
        staff_id: userRow.staff_id,
      },
    };
  } catch (err: any) {
    console.error('Error during loginAction:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat memproses login.',
    };
  }
}

/**
 * Get currently authenticated user from session cookie
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) {
      try {
        cookieStore.delete(SESSION_COOKIE_NAME);
      } catch {}
      return null;
    }

    // Fetch fresh profile from database
    const userRow = await dbQuerySingle<UserProfile>(
      `SELECT 
         p.*,
         CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS staff
       FROM public.user_profiles p
       LEFT JOIN public.staff s ON p.staff_id = s.id
       WHERE p.id = $1 AND p.aktif = true
       LIMIT 1`,
      [payload.id]
    );

    if (!userRow) {
      try {
        cookieStore.delete(SESSION_COOKIE_NAME);
      } catch {}
      return null;
    }

    return userRow;
  } catch {
    return null;
  }
}

/**
 * Logout action
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    const { ip, userAgent } = await getRequestMetadata();

    if (user) {
      try {
        await dbExecute(
          `INSERT INTO public.audit_logs (
            actor_id, actor_username, actor_role, ip_address, user_agent,
            modul, aksi, entitas_tipe, entitas_id, judul, deskripsi, perubahan, tingkat_urgensi
          ) VALUES (
            $1, $2, $3, $4, $5,
            'auth', 'logout', 'auth_session', $6, $7, $8, $9, 'info'
          )`,
          [
            user.id,
            user.username,
            (user.roles || []).join(', '),
            ip,
            userAgent,
            user.id,
            `Logout Pengguna: ${user.username}`,
            `Pengguna mengakhiri sesi kerja.`,
            JSON.stringify({ logout_time: new Date().toISOString() }),
          ]
        );
      } catch {}
    }

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return { success: true };
  } catch (err) {
    console.error('Error in logoutAction:', err);
    return { success: true };
  }
}

/**
 * Get all users for Developer Management Panel
 */
export async function getAllUsersAction(): Promise<UserProfile[]> {
  const current = await getCurrentUser();
  if (!current || !current.roles.includes('developer')) {
    throw new Error('Akses ditolak. Hanya role Developer yang dapat mengakses daftar pengguna.');
  }

  try {
    const rows = await dbQuery<UserProfile>(`
      SELECT 
        p.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS staff
      FROM public.user_profiles p
      LEFT JOIN public.staff s ON p.staff_id = s.id
      ORDER BY p.nama ASC;
    `);
    return rows;
  } catch (e) {
    console.error('Error fetching all users:', e);
    return [];
  }
}

/**
 * Update user roles via Developer Checkbox Panel
 */
export async function updateUserRolesAction(
  userId: string,
  roles: UserRole[]
): Promise<{ success: boolean; error?: string }> {
  const current = await getCurrentUser();
  if (!current || !current.roles.includes('developer')) {
    return { success: false, error: 'Akses ditolak. Hanya Developer yang dapat mengubah role.' };
  }

  try {
    await dbExecute(
      `UPDATE public.user_profiles 
       SET roles = $1, role = $2, updated_at = NOW() 
       WHERE id = $3`,
      [
        roles,
        roles.includes('developer') ? 'developer' : roles[0] || 'staff',
        userId,
      ]
    );

    const { ip, userAgent } = await getRequestMetadata();
    await dbExecute(
      `INSERT INTO public.audit_logs (
        actor_id, actor_username, actor_role, ip_address, user_agent,
        modul, aksi, entitas_tipe, entitas_id, judul, deskripsi, perubahan, tingkat_urgensi
      ) VALUES (
        $1, $2, 'developer', $3, $4,
        'user_management', 'update_roles', 'user_profile', $5, $6, $7, $8, 'warning'
      )`,
      [
        current.id,
        current.username,
        ip,
        userAgent,
        userId,
        `Update Role Pengguna (ID: ${userId})`,
        `Developer ${current.username} memperbarui hak akses role menjadi [${roles.join(', ')}].`,
        JSON.stringify({ updated_roles: roles }),
      ]
    );

    revalidatePath('/settings');
    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating user roles:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui role pengguna.' };
  }
}

/**
 * Update user password via Developer Panel
 */
export async function updateUserPasswordAction(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const current = await getCurrentUser();
  if (!current || !current.roles.includes('developer')) {
    return { success: false, error: 'Akses ditolak. Hanya Developer yang dapat mengubah password.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password baru minimal 6 karakter.' };
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update in user_profiles
    await dbExecute(
      `UPDATE public.user_profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );

    // Update in auth.users
    await dbExecute(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error updating user password:', err);
    return { success: false, error: err?.message || 'Gagal mengubah password pengguna.' };
  }
}

/**
 * Update authenticated user's profile photo (WebP format)
 */
export async function updateProfilePhotoAction(
  fotoUrl: string
): Promise<{ success: boolean; error?: string; foto_url?: string }> {
  const current = await getCurrentUser();
  if (!current) {
    return { success: false, error: 'Sesi Anda telah berakhir. Silakan login kembali.' };
  }

  if (!fotoUrl || (!fotoUrl.startsWith('data:image/') && !fotoUrl.startsWith('http') && !fotoUrl.startsWith('/'))) {
    return { success: false, error: 'Format gambar tidak valid.' };
  }

  try {
    // 1. Update user_profiles
    await dbExecute(
      `UPDATE public.user_profiles SET foto_url = $1, updated_at = NOW() WHERE id = $2`,
      [fotoUrl, current.id]
    );

    // 2. If staff_id linked, also update public.staff so instructor portal reflects the photo
    if (current.staff_id) {
      try {
        await dbExecute(
          `UPDATE public.staff SET foto_url = $1, updated_at = NOW() WHERE id = $2`,
          [fotoUrl, current.staff_id]
        );
      } catch (err) {
        console.warn('Could not sync photo to staff record:', err);
      }
    }

    const { ip, userAgent } = await getRequestMetadata();
    try {
      await dbExecute(
        `INSERT INTO public.audit_logs (
          actor_id, actor_username, actor_role, ip_address, user_agent,
          modul, aksi, entitas_tipe, entitas_id, judul, deskripsi, perubahan, tingkat_urgensi
        ) VALUES (
          $1, $2, $3, $4, $5,
          'account_settings', 'update_photo', 'user_profile', $6, $7, $8, $9, 'info'
        )`,
        [
          current.id,
          current.username,
          (current.roles || []).join(', '),
          ip,
          userAgent,
          current.id,
          `Update Foto Profil: ${current.username}`,
          `Pengguna memperbarui foto profil mereka.`,
          JSON.stringify({ has_photo: true, updated_at: new Date().toISOString() }),
        ]
      );
    } catch {}

    revalidatePath('/', 'layout');
    return { success: true, foto_url: fotoUrl };
  } catch (err: any) {
    console.error('Error updating profile photo:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan foto profil.' };
  }
}

/**
 * Change password by verifying old password + new password + confirm new password
 */
export async function changePasswordWithOldPasswordAction(payload: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const current = await getCurrentUser();
  if (!current) {
    return { success: false, error: 'Sesi Anda telah berakhir. Silakan login kembali.' };
  }

  const { oldPassword, newPassword, confirmPassword } = payload;

  if (!oldPassword) {
    return { success: false, error: 'Password lama wajib diisi.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password baru minimal 6 karakter.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Konfirmasi password baru tidak cocok.' };
  }

  try {
    // 1. Fetch user's current password hash
    const userRow = await dbQuerySingle<{ password_hash: string | null }>(
      `SELECT password_hash FROM public.user_profiles WHERE id = $1 LIMIT 1`,
      [current.id]
    );

    let isOldPasswordValid = false;
    if (userRow?.password_hash) {
      isOldPasswordValid = await bcrypt.compare(oldPassword, userRow.password_hash);
    }

    // Also check auth.users if not matched
    if (!isOldPasswordValid) {
      const authRow = await dbQuerySingle<{ encrypted_password: string | null }>(
        `SELECT encrypted_password FROM auth.users WHERE id = $1 LIMIT 1`,
        [current.id]
      );
      if (authRow?.encrypted_password) {
        isOldPasswordValid = await bcrypt.compare(oldPassword, authRow.encrypted_password);
      }
    }

    if (!isOldPasswordValid) {
      return { success: false, error: 'Password lama yang Anda masukkan tidak sesuai.' };
    }

    // 2. Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update in user_profiles
    await dbExecute(
      `UPDATE public.user_profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newPasswordHash, current.id]
    );

    // 4. Update in auth.users
    await dbExecute(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
      [newPasswordHash, current.id]
    );

    const { ip, userAgent } = await getRequestMetadata();
    try {
      await dbExecute(
        `INSERT INTO public.audit_logs (
          actor_id, actor_username, actor_role, ip_address, user_agent,
          modul, aksi, entitas_tipe, entitas_id, judul, deskripsi, perubahan, tingkat_urgensi
        ) VALUES (
          $1, $2, $3, $4, $5,
          'account_settings', 'change_password', 'user_profile', $6, $7, $8, $9, 'info'
        )`,
        [
          current.id,
          current.username,
          (current.roles || []).join(', '),
          ip,
          userAgent,
          current.id,
          `Ubah Kata Sandi: ${current.username}`,
          `Pengguna berhasil memperbarui kata sandi dengan verifikasi sandi lama.`,
          JSON.stringify({ updated_at: new Date().toISOString() }),
        ]
      );
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error changing password:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui kata sandi.' };
  }
}

