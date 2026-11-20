// Demo data for presentations: three approved partner shops. Safe to run more than once.  ->  npm run db:seed
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SHOPS = [
  { phone: '+919999900001', owner: 'Ramesh Gupta', name: 'Gupta Kirana Store', address: 'Main Market, Nawanshahr', licence: 'PB-KIR-2041', offer: '₹20 off on groceries above ₹200', cost: 20 },
  { phone: '+919999900002', owner: 'Sukhdev Singh', name: 'Sukhdev Tea Stall', address: 'Bus Stand Road, Nawanshahr', licence: 'PB-TEA-1187', offer: 'One free tea', cost: 20 },
  { phone: '+919999900003', owner: 'Anita Verma', name: 'Verma Medicos', address: 'Civil Lines, Nawanshahr', licence: 'PB-PHM-7720', offer: '5% off on non-prescription items', cost: 40 },
];
(async () => {
  for (const s of SHOPS) {
    const u = await prisma.user.upsert({ where: { phone: s.phone }, update: {}, create: { phone: s.phone, name: s.owner, city: 'Nawanshahr', locality: 'Demo' } });
    await prisma.shop.upsert({ where: { ownerId: u.id }, update: {}, create: { ownerId: u.id, name: s.name, ownerName: s.owner, phone: s.phone, address: s.address, licence: s.licence, status: 'APPROVED', offerText: s.offer, coinCost: s.cost } });
  }
  console.log('Seeded', SHOPS.length, 'demo partner shops.');
})().finally(() => prisma.$disconnect());
