import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { json } from '@/lib/http';
export async function GET() {
  const { res } = await requireUser(); if (res) return res;
  const shops = await prisma.shop.findMany({ where: { status: 'APPROVED', paused: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, address: true, offerText: true, coinCost: true } });
  return json({ shops });
}
