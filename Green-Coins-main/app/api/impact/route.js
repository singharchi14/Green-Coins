export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { prisma } from '@/lib/prisma';
import { json } from '@/lib/http';
export async function GET() {
  const [households, approved, coins, redeemed, shops, byCat, diverted] = await Promise.all([
    prisma.user.count(), prisma.submission.count({ where: { status: 'APPROVED' } }),
    prisma.submission.aggregate({ where: { status: 'APPROVED' }, _sum: { coins: true } }),
    prisma.redemption.count({ where: { status: 'REDEEMED' } }), prisma.shop.count({ where: { status: 'APPROVED' } }),
    prisma.submission.groupBy({ by: ['category'], where: { status: 'APPROVED' }, _count: true }),
    prisma.pickup.groupBy({ by: ['category'], where: { status: 'VERIFIED' }, _sum: { collectedKg: true }, _count: true }),
  ]);
  return json({ households, approvedPhotos: approved, coinsIssued: coins._sum.coins || 0, redemptions: redeemed, partnerShops: shops, byCategory: Object.fromEntries(byCat.map(c => [c.category, c._count])),
    // weighed by collection workers and verified; never estimated
    pickupsVerified: diverted.reduce((n, d) => n + d._count, 0), kgDiverted: Math.round(diverted.reduce((n, d) => n + (d._sum.collectedKg || 0), 0) * 10) / 10,
    kgByCategory: Object.fromEntries(diverted.map(d => [d.category, Math.round((d._sum.collectedKg || 0) * 10) / 10])) });
}
