import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guard';
import { bad } from '@/lib/http';
export async function GET(_req, { params }) {
  const { res } = await requireAdmin(); if (res) return res;
  const s = await prisma.submission.findUnique({ where: { id: params.id }, select: { status: true, imageData: true, mime: true } });
  if (!s || s.status !== 'REVIEW' || !s.imageData) return bad('Not found', 404);
  return new Response(s.imageData, { headers: { 'Content-Type': s.mime || 'image/jpeg', 'Cache-Control': 'no-store' } });
}
