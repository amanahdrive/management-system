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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Skip static assets, next internals, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext)) ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  // Check for active session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionToken);

  // If user visits root / (login page) and is already authenticated, redirect to /dashboard
  if (pathname === '/' && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // If user visits root / and is NOT authenticated, allow them to view login page
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Subdomain compatibility rewrites if someone still visits via subdomain
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

  // Protect all dashboard and application routes
  // Unauthenticated users attempting to access /dashboard, /siswa, /kas, /settings, etc. get redirected to /
  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
