import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { expireStale } from '@/lib/wallet';
import { istDayStart } from '@/lib/limits';
import { json, bad } from '@/lib/http';

export async function GET() {
  const { user, res } = await requireUser(); if (res) return res;
  const shop = await prisma.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return json({ shop: null });
  await expireStale();
  const [today, total, recent] = await Promise.all([
    prisma.redemption.count({ where: { shopId: shop.id, status: 'REDEEMED', redeemedAt: { gte: istDayStart() } } }),
    prisma.redemption.count({ where: { shopId: shop.id, status: 'REDEEMED' } }),
    prisma.redemption.findMany({ where: { shopId: shop.id, status: 'REDEEMED' }, orderBy: { redeemedAt: 'desc' }, take: 10, select: { id: true, code: true, coins: true, redeemedAt: true } }),
  ]);
  return json({ shop: { id: shop.id, name: shop.name, status: shop.status, offerText: shop.offerText, coinCost: shop.coinCost, dailyLimit: shop.dailyLimit, paused: shop.paused }, stats: { today, total }, recent });
}

export async function PATCH(req) {
  const { user, res } = await requireUser(); if (res) return res;
  const shop = await prisma.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop || shop.status !== 'APPROVED') return bad('Your shop is not approved yet', 403);
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const data = {};
  if (b.offerText !== undefined) { const v = String(b.offerText).trim(); if (v.length < 3 || v.length > 80) return bad('Offer must be 3 to 80 characters'); data.offerText = v; }
  if (b.coinCost !== undefined) { const v = Number(b.coinCost); if (!Number.isInteger(v) || v < 20 || v > 200) return bad('Coin cost must be 20 to 200'); data.coinCost = v; }
  if (b.dailyLimit !== undefined) { const v = Number(b.dailyLimit); if (!Number.isInteger(v) || v < 1 || v > 200) return bad('Daily limit must be 1 to 200'); data.dailyLimit = v; }
  if (b.paused !== undefined) data.paused = !!b.paused;
  await prisma.shop.update({ where: { id: shop.id }, data });
  return json({ ok: true });
}
