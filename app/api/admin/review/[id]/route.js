import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guard';
import { credit } from '@/lib/wallet';
import { CATEGORIES } from '@/lib/config';
import { json, bad } from '@/lib/http';
export async function POST(req, { params }) {
  const { user, res } = await requireAdmin(); if (res) return res;
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const approve = b.action === 'approve', reason = String(b.reason || '').trim().slice(0, 200);
  if (!approve && b.action !== 'reject') return bad('Invalid action');
  if (!approve && reason.length < 3) return bad('Give the citizen a reason for rejecting');
  const out = await prisma.$transaction(async tx => {
    const s = await tx.submission.findUnique({ where: { id: params.id } });
    if (!s || s.status !== 'REVIEW') return null;
    const coins = approve ? CATEGORIES[s.category].coins : 0;
    // wipe the photo the moment a decision is made
    await tx.submission.update({ where: { id: s.id }, data: { status: approve ? 'APPROVED' : 'REJECTED', coins, reason: approve ? 'Approved by a reviewer.' : reason, imageData: null, mime: null, decidedAt: new Date(), decidedBy: user.id } });
    if (approve) await credit(tx, s.userId, coins, 'EARN', s.id, `${CATEGORIES[s.category].label} photo approved`);
    return { ok: true };
  });
  return out ? json(out) : bad('Already decided or not found', 409);
}
