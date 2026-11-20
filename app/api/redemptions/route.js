import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { expireStale, newCode } from '@/lib/wallet';
import { istDayStart } from '@/lib/limits';
import { LIMITS } from '@/lib/config';
import { json, bad } from '@/lib/http';

export async function GET() {
  const { user, res } = await requireUser(); if (res) return res;
  await expireStale();
  const items = await prisma.redemption.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20, include: { shop: { select: { name: true, offerText: true } } } });
  return json({ items: items.map(r => ({ id: r.id, code: r.code, status: r.status, coins: r.coins, expiresAt: r.expiresAt, createdAt: r.createdAt, shop: r.shop.name, offer: r.shop.offerText })) });
}

export async function POST(req) {
  const { user, res } = await requireUser(); if (res) return res;
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  await expireStale();
  const shop = await prisma.shop.findUnique({ where: { id: String(b.shopId || '') } });
  if (!shop || shop.status !== 'APPROVED' || shop.paused) return bad('This shop is not accepting coins right now', 404);
  if (shop.ownerId === user.id) return bad('You cannot redeem at your own shop');
  const cost = Math.max(shop.coinCost, LIMITS.minRedeem);
  if (user.coins < cost) return bad(`You need at least ${cost} coins for this offer`);
  if (await prisma.redemption.findFirst({ where: { userId: user.id, status: 'PENDING' } })) return bad('You already have an active code. Use it or wait for it to expire.', 409);
  const usedToday = await prisma.redemption.count({ where: { shopId: shop.id, status: { in: ['PENDING', 'REDEEMED'] }, createdAt: { gte: istDayStart() } } });
  if (usedToday >= shop.dailyLimit) return bad('This shop has reached its daily limit. Try tomorrow.', 409);
  try {
    const r = await prisma.$transaction(async tx => {
      const dec = await tx.user.updateMany({ where: { id: user.id, coins: { gte: cost } }, data: { coins: { decrement: cost } } }); // atomic: can never go negative
      if (!dec.count) throw new Error('INSUFFICIENT');
      const red = await tx.redemption.create({ data: { code: newCode(), userId: user.id, shopId: shop.id, coins: cost, expiresAt: new Date(Date.now() + LIMITS.codeTtlMin * 60e3) } });
      await tx.coinTxn.create({ data: { userId: user.id, delta: -cost, kind: 'REDEEM', refId: red.id, note: `Code for ${shop.name}` } });
      return red;
    });
    return json({ code: r.code, expiresAt: r.expiresAt, coins: cost, shop: shop.name, offer: shop.offerText });
  } catch (e) { if (e.message === 'INSUFFICIENT') return bad('Not enough coins'); throw e; }
}
