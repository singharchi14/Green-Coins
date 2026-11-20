import { prisma } from '@/lib/prisma';
import { requireOfficer } from '@/lib/guard';
import { json, bad } from '@/lib/http';
import { verifyPickup } from '@/lib/collection';

export async function POST(req, { params }) {
  const { user, res } = await requireOfficer(); if (res) return res;
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  if (b.action === 'assign') {
    const worker = await prisma.user.findFirst({ where: { id: String(b.workerId || ''), role: 'WORKER' }, select: { id: true } });
    if (!worker) return bad('Choose a collection worker');
    const u = await prisma.pickup.updateMany({ where: { id: params.id, status: { in: ['REQUESTED', 'ASSIGNED'] } }, data: { status: 'ASSIGNED', workerId: worker.id, assignedAt: new Date() } });
    return u.count ? json({ ok: true }) : bad('Only waiting requests can be assigned', 409);
  }
  if (b.action === 'verify') {
    const r = await verifyPickup(params.id, user.id);
    return r.error ? bad(r.error, r.status) : json({ ok: true, coins: r.coins });
  }
  if (b.action === 'cancel') {
    const u = await prisma.pickup.updateMany({ where: { id: params.id, status: { in: ['REQUESTED', 'ASSIGNED'] } }, data: { status: 'CANCELLED' } });
    return u.count ? json({ ok: true }) : bad('This pickup can no longer be cancelled', 409);
  }
  return bad('Unknown action');
}
