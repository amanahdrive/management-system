import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Matches instruktur.management-amanahdrive.vercel.app or any instruktur.* subdomain
  if (
    hostname.startsWith('instruktur.') ||
    hostname.includes('instruktur.management-amanahdrive.vercel.app')
  ) {
    const url = request.nextUrl.clone();
    if (url.pathname === '/') {
      url.pathname = '/instruktur';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)'],
};
