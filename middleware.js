import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Protect /dashboard, /shop, /admin, /municipal and /worker. /login and /register are never redirected here,
// so a stale/invalid cookie can no longer cause a redirect loop.
export async function middleware(req) {
  const t = req.cookies.get('gc_session')?.value;
  let ok = false;
  if (t) {
    try { await jwtVerify(t, new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-jwt-secret')); ok = true; } catch {}
  }
  if (!ok) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/shop/:path*', '/admin/:path*', '/municipal/:path*', '/worker/:path*'] };
