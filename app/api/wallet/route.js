import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { expireStale } from '@/lib/wallet';
import { json } from '@/lib/http';
export async function GET() {
  const { user, res } = await requireUser(); if (res) return res;
  await expireStale();
  const [me, txns] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    prisma.coinTxn.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 40, select: { id: true, delta: true, kind: true, note: true, createdAt: true } }),
  ]);
  return json({ balance: me.coins, txns });
}
