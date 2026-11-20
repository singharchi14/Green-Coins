import { NextResponse } from 'next/server';
export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const bad = (error, status = 400) => json({ error }, status);
export const tooMany = retryAfter => json({ error: `Too many requests. Try again in ${retryAfter}s.`, retryAfter }, 429);
export const clientIp = req => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
