import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/guard';
import { json, bad } from '@/lib/http';
export async function POST(req, { params }) {
  const { res } = await requireAdmin(); if (res) return res;
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  if (!['approve', 'reject'].includes(b.action)) return bad('Invalid action');
  const r = await prisma.shop.updateMany({ where: { id: params.id, status: 'PENDING' }, data: { status: b.action === 'approve' ? 'APPROVED' : 'REJECTED', ...(b.action === 'approve' ? { offerText: 'Ask the shop for the offer' } : {}) } });
  return r.count ? json({ ok: true }) : bad('Already decided or not found', 409);
}
