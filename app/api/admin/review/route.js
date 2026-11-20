import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guard';
import { json } from '@/lib/http';
export async function GET() {
  const { res } = await requireAdmin(); if (res) return res;
  const items = await prisma.submission.findMany({ where: { status: 'REVIEW' }, orderBy: { createdAt: 'asc' }, take: 50, select: { id: true, category: true, reason: true, confidence: true, createdAt: true, user: { select: { locality: true, city: true } } } });
  return json({ items });
}
