import { prisma } from '@/lib/prisma';
import { requireWorker } from '@/lib/guard';
import { rateLimit } from '@/lib/rate';
import { json, bad, tooMany } from '@/lib/http';
import { validateWeighing } from '@/lib/pickup';
import { sameCode } from '@/lib/collection';

// Worker marks a pickup collected: needs the citizen's handover code (proof of presence) and the weighed kg.
export async function POST(req, { params }) {
  const { user, res } = await requireWorker(); if (res) return res;
  const rl = rateLimit(`collect:${user.id}`, 20, 60e3); if (!rl.ok) return tooMany(rl.retryAfter);
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const w = validateWeighing(b.kg); if (w.error) return bad(w.error);
  const p = await prisma.pickup.findFirst({ where: { id: params.id, workerId: user.id } });
  if (!p) return bad('Pickup not found', 404);
  if (p.status !== 'ASSIGNED') return bad(p.status === 'CANCELLED' ? 'The citizen cancelled this pickup' : 'This pickup is already collected', 409);
  if (!sameCode(p.handoverCode, String(b.code || '').trim())) return bad('Wrong handover code. Ask the citizen to show the code in their app.', 403);
  const u = await prisma.pickup.updateMany({ where: { id: p.id, workerId: user.id, status: 'ASSIGNED' }, data: { status: 'COLLECTED', collectedAt: new Date(), collectedKg: w.kg } });
  return u.count ? json({ ok: true, kg: w.kg }) : bad('This pickup changed. Refresh and try again.', 409);
}
