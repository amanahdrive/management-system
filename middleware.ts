import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // If request comes via instruktur. subdomain, rewrite root to /instruktur
  if (hostname.startsWith('instruktur.')) {
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
