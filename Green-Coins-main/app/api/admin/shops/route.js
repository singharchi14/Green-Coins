import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guard';
import { json } from '@/lib/http';
export async function GET() {
  const { res } = await requireAdmin(); if (res) return res;
  const shops = await prisma.shop.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 100, select: { id: true, name: true, ownerName: true, phone: true, address: true, licence: true, status: true, createdAt: true } });
  return json({ shops });
}
