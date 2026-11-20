import { prisma } from '@/lib/prisma';
import { requireOfficer } from '@/lib/guard';
import { json } from '@/lib/http';
export async function GET() {
  const { res } = await requireOfficer(); if (res) return res;
  const [workers, load] = await Promise.all([
    prisma.user.findMany({ where: { role: 'WORKER' }, select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' }, take: 200 }),
    prisma.pickup.groupBy({ by: ['workerId'], where: { status: 'ASSIGNED', workerId: { not: null } }, _count: true }),
  ]);
  const open = Object.fromEntries(load.map(l => [l.workerId, l._count]));
  return json({ workers: workers.map(w => ({ ...w, open: open[w.id] || 0 })) });
}
