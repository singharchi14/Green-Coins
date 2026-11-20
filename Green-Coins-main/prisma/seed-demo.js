// Demo data for the municipal dashboard: citizens in 4 localities, 1 worker, pickups in every state. Safe to re-run.
//   npm run db:seed-demo
// To sign in as them, list the phones in .env.local:  MUNICIPAL_PHONES=+919999900200  WORKER_PHONES=+919999900201
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();
const DAY = 864e5, IST = 5.5 * 3600e3;
const dayStart = off => new Date(Math.floor((Date.now() + IST) / DAY) * DAY - IST + off * DAY);
const AREAS = [['Civil Lines', 6, 5], ['Model Town', 6, 1], ['Bus Stand Road', 5, 3], ['Gandhi Nagar', 4, 0]]; // [name, households, active]
const CATS = ['wet', 'dry', 'recyclable', 'hazardous', 'ewaste'];

(async () => {
  const worker = await prisma.user.upsert({ where: { phone: '+919999900201' }, update: { role: 'WORKER' }, create: { phone: '+919999900201', name: 'Demo Worker', city: 'Nawanshahr', locality: 'Depot', role: 'WORKER' } });
  await prisma.user.upsert({ where: { phone: '+919999900200' }, update: { role: 'MUNICIPAL' }, create: { phone: '+919999900200', name: 'Demo Officer', city: 'Nawanshahr', locality: 'Municipal Office', role: 'MUNICIPAL' } });
  let n = 0;
  for (const [loc, total, active] of AREAS) {
    for (let i = 0; i < total; i++) {
      const phone = `+9199999${String(300 + n++).padStart(5, '0')}`;
      const u = await prisma.user.upsert({ where: { phone }, update: {}, create: { phone, name: `${loc} Home ${i + 1}`, city: 'Nawanshahr', locality: loc } });
      if (i >= active) continue;
      const hash = crypto.createHash('sha256').update('demo-' + phone).digest('hex');
      await prisma.submission.upsert({ where: { imageHash: hash }, update: {}, create: { userId: u.id, category: CATS[i % 5], status: 'APPROVED', coins: 5, confidence: 0.95, reason: 'Demo', imageHash: hash, createdAt: new Date(Date.now() - (i + 1) * DAY) } });
      if (await prisma.pickup.count({ where: { userId: u.id } })) continue;
      const k = i % 4, cat = CATS[(i + 1) % 5], created = new Date(Date.now() - (6 - k) * DAY);
      const base = { userId: u.id, category: cat, estKg: 3, city: 'Nawanshahr', locality: loc, handoverCode: 'DEMO' + (10 + i), createdAt: created, preferredDay: dayStart(-5 + k) };
      if (k === 0) await prisma.pickup.create({ data: { ...base, status: 'VERIFIED', workerId: worker.id, assignedAt: created, collectedAt: new Date(created.getTime() + 1.2 * DAY), collectedKg: 3.4, coins: 3, verifiedAt: new Date(), verifiedBy: u.id } });
      if (k === 1) await prisma.pickup.create({ data: { ...base, status: 'ASSIGNED', workerId: worker.id, assignedAt: created } });          // overdue (day already passed)
      if (k === 2) await prisma.pickup.create({ data: { ...base, status: 'REQUESTED', preferredDay: dayStart(-1) } });                    // overdue, unassigned
      if (k === 3) await prisma.pickup.create({ data: { ...base, status: 'COLLECTED', workerId: worker.id, collectedAt: new Date(), collectedKg: 2.1 } });
    }
  }
  console.log('Demo data ready. Sign in with MUNICIPAL_PHONES=+919999900200 / WORKER_PHONES=+919999900201 to see the desks.');
})().finally(() => prisma.$disconnect());
