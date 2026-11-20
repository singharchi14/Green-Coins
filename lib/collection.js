import crypto from 'crypto';
import { prisma } from './prisma';
import { CATEGORIES } from './config.js';
import { pickupCoins } from './pickup.js';
import { credit } from './wallet';

export const sameCode = (a, b) => { const x = Buffer.from(String(a).toUpperCase()), y = Buffer.from(String(b).toUpperCase()); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// COLLECTED -> VERIFIED and credit coins, exactly once. The conditional update is the lock:
// two simultaneous confirmations cannot both match status = COLLECTED, so coins are never doubled.
// ownerId limits the action to the citizen's own pickup; officers omit it.
export async function verifyPickup(id, verifierId, ownerId) {
  const p = await prisma.pickup.findUnique({ where: { id } });
  if (!p || (ownerId && p.userId !== ownerId)) return { error: 'Pickup not found', status: 404 };
  if (p.status === 'VERIFIED') return { error: 'This pickup is already verified', status: 409 };
  if (p.status !== 'COLLECTED') return { error: 'The pickup has not been collected yet', status: 409 };
  const coins = pickupCoins(p.category, p.collectedKg);
  const done = await prisma.$transaction(async tx => {
    const u = await tx.pickup.updateMany({ where: { id, status: 'COLLECTED' }, data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedBy: verifierId, coins } });
    if (!u.count) return false;
    if (coins) await credit(tx, p.userId, coins, 'EARN', id, `${CATEGORIES[p.category].label} pickup verified (${p.collectedKg} kg)`);
    return true;
  });
  return done ? { ok: true, coins } : { error: 'This pickup was just verified', status: 409 };
}

// What a citizen sees. The handover code is shown to the owner only.
export const citizenView = p => ({ id: p.id, category: p.category, estKg: p.estKg, preferredDay: p.preferredDay, note: p.note, status: p.status, handoverCode: ['REQUESTED', 'ASSIGNED'].includes(p.status) ? p.handoverCode : null,
  collectedKg: p.collectedKg, coins: p.coins, createdAt: p.createdAt, assignedAt: p.assignedAt, collectedAt: p.collectedAt, verifiedAt: p.verifiedAt, worker: p.worker?.name?.split(' ')[0] || null });
