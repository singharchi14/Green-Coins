import crypto from 'crypto';
import { prisma } from './prisma';
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
export const newCode = () => Array.from(crypto.randomBytes(6), b => ALPHA[b % ALPHA.length]).join('');
// Credit/debit and the cached balance always change together, inside one DB transaction.
export const credit = (tx, userId, delta, kind, refId, note) => Promise.all([
  tx.coinTxn.create({ data: { userId, delta, kind, refId, note } }),
  tx.user.update({ where: { id: userId }, data: { coins: { increment: delta } } }),
]);
// Lazy expiry: unused redemption codes past their time give the coins back.
export async function expireStale() {
  const stale = await prisma.redemption.findMany({ where: { status: 'PENDING', expiresAt: { lt: new Date() } } });
  for (const r of stale) {
    await prisma.$transaction(async tx => {
      const u = await tx.redemption.updateMany({ where: { id: r.id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
      if (u.count) await credit(tx, r.userId, r.coins, 'REFUND', r.id, 'Code expired unused');
    });
  }
}
