import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, COOKIE } from '@/lib/auth';

export async function GET(req) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  const savedState = req.cookies.get('oauth_state')?.value;
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/callback/google`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();
    if (!profile.sub) {
      return NextResponse.redirect(`${origin}/login?error=profile_fetch_failed`);
    }

    const { sub: googleId, email, name } = profile;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (user) {
      if (!user.googleId || (email && !user.email)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            ...(email && !user.email ? { email } : {}),
          },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          googleId,
          email: email || null,
          name: name || (email ? email.split('@')[0] : 'Citizen'),
          city: 'Nawanshahr',
          locality: 'General',
          role: 'CITIZEN',
        },
      });
    }

    const token = await signToken(user);

    const response = NextResponse.redirect(`${origin}/dashboard`);
    response.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });
    response.cookies.delete('oauth_state');
    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'server_error')}`);
  }
}
