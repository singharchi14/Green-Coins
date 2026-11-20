import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guard';
import { json } from '@/lib/http';
export async function GET() {
  const { res } = await requireAdmin(); if (res) return res;
  const [users, byStatus, issued, redeemed, pendingShops, queue] = await Promise.all([
    prisma.user.count(), prisma.submission.groupBy({ by: ['status'], _count: true }),
    prisma.coinTxn.aggregate({ where: { kind: 'EARN' }, _sum: { delta: true } }),
    prisma.redemption.count({ where: { status: 'REDEEMED' } }), prisma.shop.count({ where: { status: 'PENDING' } }),
    prisma.submission.count({ where: { status: 'REVIEW' } }),
  ]);
  const s = Object.fromEntries(byStatus.map(x => [x.status, x._count]));
  const decided = (s.APPROVED || 0) + (s.REJECTED || 0);
  return json({ users, photos: s, coinsIssued: issued._sum.delta || 0, redemptions: redeemed, pendingShops, queue, autoApprovalNote: decided ? Math.round(((s.APPROVED || 0) / decided) * 100) : null });
}
