import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { normalizePhone } from '@/lib/otp';
import { json, bad } from '@/lib/http';
export async function POST(req) {
  const { user, res } = await requireUser(); if (res) return res;
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const t = (v, max) => String(v || '').trim().slice(0, max);
  const name = t(b.name, 80), ownerName = t(b.ownerName, 60), address = t(b.address, 160), licence = t(b.licence, 60), phone = normalizePhone(b.phone);
  if (name.length < 2 || ownerName.length < 2 || address.length < 6 || licence.length < 4) return bad('Please fill in every field');
  if (!phone) return bad('Enter a valid 10-digit mobile number');
  if (await prisma.shop.findUnique({ where: { ownerId: user.id } })) return bad('You have already applied', 409);
  await prisma.shop.create({ data: { ownerId: user.id, name, ownerName, address, licence, phone } });
  return json({ ok: true });
}
