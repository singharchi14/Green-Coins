import { prisma } from '@/lib/prisma';
import { requireOfficer } from '@/lib/guard';
import { json } from '@/lib/http';
import { buildLocalityStats } from '@/lib/analytics';
import { ANALYTICS } from '@/lib/config';

export async function GET(req) {
  const { res } = await requireOfficer(); if (res) return res;
  const q = Number(new URL(req.url).searchParams.get('days'));
  const days = Number.isFinite(q) && q >= 7 && q <= 180 ? Math.round(q) : ANALYTICS.windowDays;
  const since = new Date(Date.now() - days * 864e5);
  const [users, photos, pickups] = await Promise.all([
    prisma.user.findMany({ where: { role: 'CITIZEN' }, select: { id: true, city: true, locality: true } }),
    prisma.submission.findMany({ where: { status: 'APPROVED', createdAt: { gte: since } }, select: { userId: true, category: true, createdAt: true } }),
    // window pickups, plus anything still waiting (an overdue request from before the window still matters)
    prisma.pickup.findMany({ where: { OR: [{ createdAt: { gte: since } }, { collectedAt: { gte: since } }, { status: { in: ['REQUESTED', 'ASSIGNED'] } }] },
      select: { userId: true, city: true, locality: true, category: true, status: true, preferredDay: true, createdAt: true, collectedAt: true, collectedKg: true } }),
  ]);
  return json(buildLocalityStats({ users, photos, pickups }, new Date(), days));
}
