import { prisma } from '@/lib/prisma';
import { requireWorker } from '@/lib/guard';
import { json } from '@/lib/http';
import { isOverdue } from '@/lib/pickup';

// A worker sees only pickups assigned to them. The handover code is never sent to the worker.
export async function GET() {
  const { user, res } = await requireWorker(); if (res) return res;
  const items = await prisma.pickup.findMany({
    where: { workerId: user.id, OR: [{ status: 'ASSIGNED' }, { status: 'COLLECTED', collectedAt: { gt: new Date(Date.now() - 14 * 864e5) } }] },
    orderBy: [{ preferredDay: 'asc' }], take: 100,
    select: { id: true, category: true, estKg: true, preferredDay: true, note: true, status: true, locality: true, city: true, collectedKg: true, collectedAt: true, user: { select: { name: true, phone: true } } },
  });
  return json({ items: items.map(p => ({ ...p, overdue: isOverdue(p) })) });
}
