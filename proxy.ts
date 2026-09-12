import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/api/auth',
  '/api/health',
  '/api/invite',
  '/api/webhooks',
  '/api/location-photo',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/team-invite',
  '/public',
  '/api/public',
];

// Native app origins allowed to call the API cross-origin (Expo dev client / Expo web preview).
// Production mobile requests typically carry no browser-style Origin header at all, so this
// only matters for local development and Expo's web target.
const MOBILE_ORIGINS = [/^exp:\/\//, /^shldr:\/\//, /^https?:\/\/localhost(:\d+)?$/];

function applyCors(response: NextResponse, origin: string | null): NextResponse {
  if (origin && MOBILE_ORIGINS.some((pattern) => pattern.test(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    return applyCors(new NextResponse(null, { status: 204 }), origin);
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic) return applyCors(NextResponse.next(), origin);

  const publicFileExtensions = [
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js', '.woff', '.woff2',
    '.ttf', '.eot', '.json', '.txt', '.pdf', '.mp4', '.webm', '.ogg',
  ];
  if (publicFileExtensions.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return applyCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return applyCors(NextResponse.next(), origin);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|txt|pdf|mp4|webm|ogg)$).*)',
  ],
};
