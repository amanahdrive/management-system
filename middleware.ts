import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Matches instruktur. subdomain OR instruktur- project URL on Vercel
  if (
    hostname.startsWith('instruktur.') ||
    hostname.startsWith('instruktur-') ||
    hostname.includes('instruktur.management-amanahdrive.vercel.app') ||
    hostname.includes('instruktur-management-amanahdrive.vercel.app')
  ) {
    const url = request.nextUrl.clone();
    if (url.pathname === '/') {
      url.pathname = '/instruktur';
      return NextResponse.rewrite(url);
    }
    // Block access to admin dashboard routes from instruktur subdomain
    if (url.pathname !== '/instruktur' && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/_next') && !url.pathname.startsWith('/assets')) {
      url.pathname = '/instruktur';
      return NextResponse.redirect(url);
    }
  }

  // Matches finance. subdomain OR finance- project URL on Vercel
  if (
    hostname.startsWith('finance.') ||
    hostname.startsWith('finance-') ||
    hostname.includes('finance.management-amanahdrive.vercel.app') ||
    hostname.includes('finance-management-amanahdrive.vercel.app')
  ) {
    const url = request.nextUrl.clone();
    if (url.pathname === '/') {
      url.pathname = '/finance';
      return NextResponse.rewrite(url);
    }
    // Block access to non-finance/non-kas routes from finance subdomain
    const isAllowedFinanceRoute =
      url.pathname === '/finance' ||
      url.pathname.startsWith('/finance/') ||
      url.pathname === '/kas' ||
      url.pathname.startsWith('/kas/') ||
      url.pathname === '/nota' ||
      url.pathname.startsWith('/nota/') ||
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/assets');

    if (!isAllowedFinanceRoute) {
      url.pathname = '/finance';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)'],
};
