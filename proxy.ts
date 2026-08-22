import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/invite',
  '/api/webhooks',
  '/login',
  '/signup',
  '/forgot-password',
  '/invite',
  '/public',
  '/api/public',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic) return NextResponse.next();

  const publicFileExtensions = [
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js', '.woff', '.woff2',
    '.ttf', '.eot', '.json', '.txt', '.pdf', '.mp4', '.webm', '.ogg',
  ];
  if (publicFileExtensions.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|txt|pdf|mp4|webm|ogg)$).*)',
  ],
};
