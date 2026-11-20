import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { rateLimit } from '@/lib/rate';
import { json, bad, tooMany } from '@/lib/http';
import { validateRequest, checkRequestRules, OPEN } from '@/lib/pickup';
import { citizenView } from '@/lib/collection';
import { newCode } from '@/lib/wallet';
import { PICKUP } from '@/lib/config';

class Rule extends Error {}

export async function GET() {
  const { user, res } = await requireUser(); if (res) return res;
  const items = await prisma.pickup.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30, include: { worker: { select: { name: true } } } });
  return json({ items: items.map(citizenView), rules: PICKUP });
}

export async function POST(req) {
  const { user, res } = await requireUser(); if (res) return res;
  const rl = rateLimit(`pickup:${user.id}`, 5, 60e3); if (!rl.ok) return tooMany(rl.retryAfter);
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const v = validateRequest(b); if (v.error) return bad(v.error);
  try {
    // Serializable: two simultaneous requests cannot both slip under the "open requests" limit.
    const p = await prisma.$transaction(async tx => {
      const since = new Date(Date.now() - PICKUP.repeatDays * 864e5);
      const existing = await tx.pickup.findMany({ where: { userId: user.id, status: { not: 'CANCELLED' }, OR: [{ createdAt: { gt: since } }, { status: { in: OPEN } }] }, select: { category: true, status: true, createdAt: true } });
      const msg = checkRequestRules(existing, v.data.category); if (msg) throw new Rule(msg);
      return tx.pickup.create({ data: { ...v.data, userId: user.id, city: user.city, locality: user.locality, handoverCode: newCode() }, include: { worker: { select: { name: true } } } });
    }, { isolationLevel: 'Serializable' });
    return json({ item: citizenView(p) }, 201);
  } catch (e) {
    if (e instanceof Rule) return bad(e.message, 409);
    if (e.code === 'P2034') return bad('Please try again', 409);
    throw e;
  }
}
