import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { expireStale } from '@/lib/wallet';
import { rateLimit } from '@/lib/rate';
import { json, bad, tooMany } from '@/lib/http';
export async function POST(req) {
  const { user, res } = await requireUser(); if (res) return res;
  const rl = rateLimit(`verify:${user.id}`, 20, 60e3); if (!rl.ok) return tooMany(rl.retryAfter);
  const shop = await prisma.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop || shop.status !== 'APPROVED') return bad('Your shop is not approved yet', 403);
  if (shop.paused) return bad('Your shop is paused. Resume it to accept coins.', 409);
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const code = String(b.code || '').trim().toUpperCase();
  await expireStale();
  const r = await prisma.redemption.findFirst({ where: { code, shopId: shop.id }, include: { user: { select: { name: true } } } });
  if (!r) return bad('Code not found for your shop', 404);
  if (r.status === 'REDEEMED') return bad('This code was already used', 409);
  if (r.status === 'EXPIRED' || r.expiresAt < new Date()) return bad('This code has expired', 410);
  const done = await prisma.redemption.updateMany({ where: { id: r.id, status: 'PENDING' }, data: { status: 'REDEEMED', redeemedAt: new Date() } });
  if (!done.count) return bad('This code was already used', 409);
  return json({ ok: true, offer: shop.offerText, coins: r.coins, citizen: r.user.name.split(' ')[0] });
}
