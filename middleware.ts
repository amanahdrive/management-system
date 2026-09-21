import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'amanah_session';

// Public assets and routes that do not require authentication
const PUBLIC_FILE_EXTENSIONS = [
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.css',
  '.js',
  '.json',
  '.txt',
  '.xml',
];

/**
 * Validasi dan ekstraksi payload token sesi: struktur 2 bagian (data.signature) & batas kedaluwarsa
 */
function parseSessionToken(token: string | undefined): { isValid: boolean; payload?: any } {
  if (!token) return { isValid: false };
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { isValid: false };
    const jsonStr = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp || Date.now() > payload.exp) {
      return { isValid: false };
    }
    return { isValid: true, payload };
  } catch {
    return { isValid: false };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Skip static assets and next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext)) ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  // 1. Nonaktifkan akses domain Vercel (*.vercel.app): Tampilkan halaman info pemindahan resmi
  if (hostname.includes('vercel.app')) {
    if (pathname === '/moved') {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/moved';
    return NextResponse.rewrite(url);
  }

  // Izinkan rute /moved diakses bebas
  if (pathname === '/moved') {
    return NextResponse.next();
  }

  // Izinkan webhook & cron publik (memiliki proteksi signature/secret mandiri)
  if (
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/verify-pin')
  ) {
    return NextResponse.next();
  }

  // 2. Pemeriksaan cookie sesi aktif
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { isValid: isAuthenticated, payload: sessionPayload } = parseSessionToken(sessionToken);

  const roles: string[] = Array.isArray(sessionPayload?.roles) ? sessionPayload.roles : [];
  const isInstrukturOnly = roles.length === 1 && roles[0] === 'instruktur';

  // Jika membuka root / (login) dan sesi masih aktif:
  // - Instruktur-only langsung ke /instruktur
  // - Role lainnya atau multi-role ke /dashboard
  if (pathname === '/' && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = isInstrukturOnly ? '/instruktur' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Jika membuka root / dan belum login, izinkan tampil halaman login
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Jika user dengan role instruktur-only membuka area /dashboard, arahkan ke /instruktur
  if (isAuthenticated && isInstrukturOnly && (pathname === '/dashboard' || pathname.startsWith('/dashboard/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/instruktur';
    return NextResponse.redirect(url);
  }

  // Subdomain compatibility rewrites jika ada yang mengakses via subdomain
  if (
    hostname.startsWith('instruktur.') ||
    hostname.startsWith('instruktur-')
  ) {
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/instruktur';
      return NextResponse.rewrite(url);
    }
  }

  // 3. Proteksi seluruh rute console & API internal
  // Pengunjung yang belum terotentikasi akan dialihkan ke /
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi tidak valid atau telah berakhir' },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const response = NextResponse.redirect(url);
    if (sessionToken && !isAuthenticated) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
