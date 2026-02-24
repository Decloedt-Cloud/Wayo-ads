import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'fr', 'ar'];

const rootLevelPaths = [
  '/',
  '/auth',
  '/campaigns',
  '/dashboard',
  '/notifications',
  '/settings',
  '/onboarding',
  '/t',
  '/admin',
  '/terms',
  '/privacy',
  '/pricing',
  '/how-it-works',
];

function isRootLevelPath(pathname: string): boolean {
  return rootLevelPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function getLocaleFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/(en|fr|ar)(\/|$)/);
  return match ? match[1] : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const pathnameLocale = getLocaleFromPath(pathname);

  if (pathnameLocale) {
    const pathWithoutLocale = pathname.slice(pathnameLocale.length + 1) || '/';
    
    if (isRootLevelPath(pathWithoutLocale)) {
      const response = NextResponse.rewrite(new URL(pathWithoutLocale, request.url));
      response.cookies.set('locale', pathnameLocale);
      return response;
    }
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  if (isRootLevelPath(pathname)) return;

  const cookieLocale = request.cookies.get('locale')?.value || 'en';
  request.nextUrl.pathname = `/${cookieLocale}${pathname}`;
  
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
