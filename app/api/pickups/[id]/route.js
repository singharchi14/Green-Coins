import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { json, bad } from '@/lib/http';
import { verifyPickup } from '@/lib/collection';

// Citizen actions on their own pickup: cancel it before collection, or confirm a collection.
export async function POST(req, { params }) {
  const { user, res } = await requireUser(); if (res) return res;
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  if (b.action === 'confirm') {
    const r = await verifyPickup(params.id, user.id, user.id);
    return r.error ? bad(r.error, r.status) : json({ ok: true, coins: r.coins });
  }
  if (b.action === 'cancel') {
    const u = await prisma.pickup.updateMany({ where: { id: params.id, userId: user.id, status: { in: ['REQUESTED', 'ASSIGNED'] } }, data: { status: 'CANCELLED' } });
    return u.count ? json({ ok: true }) : bad('This pickup can no longer be cancelled', 409);
  }
  return bad('Unknown action');
}
