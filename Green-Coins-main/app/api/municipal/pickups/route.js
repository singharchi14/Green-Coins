import { prisma } from '@/lib/prisma';
import { requireOfficer } from '@/lib/guard';
import { json } from '@/lib/http';
import { isOverdue } from '@/lib/pickup';

// ?view=open (default) | overdue | collected | done
const VIEWS = { open: ['REQUESTED', 'ASSIGNED'], overdue: ['REQUESTED', 'ASSIGNED'], collected: ['COLLECTED'], done: ['VERIFIED', 'CANCELLED'] };
export async function GET(req) {
  const { res } = await requireOfficer(); if (res) return res;
  const view = new URL(req.url).searchParams.get('view'), v = VIEWS[view] ? view : 'open';
  const rows = await prisma.pickup.findMany({
    where: { status: { in: VIEWS[v] } }, orderBy: [{ preferredDay: 'asc' }], take: 300,
    select: { id: true, category: true, estKg: true, preferredDay: true, note: true, status: true, city: true, locality: true, createdAt: true, assignedAt: true, collectedAt: true, collectedKg: true, coins: true, workerId: true,
      user: { select: { name: true } }, worker: { select: { name: true } } },
  });
  const items = rows.map(p => ({ ...p, overdue: isOverdue(p) })).filter(p => v !== 'overdue' || p.overdue);
  return json({ items: items.slice(0, 100) });
}
