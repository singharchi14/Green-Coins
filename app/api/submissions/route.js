import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/guard';
import { rateLimit } from '@/lib/rate';
import { json, bad, tooMany } from '@/lib/http';
import { CATEGORIES, LIMITS, isCategory } from '@/lib/config';
import { istDayStart, istMonthStart, checkLimits, usageOf } from '@/lib/limits';
import { classify } from '@/lib/classify';
import { decide } from '@/lib/decide';
import { credit } from '@/lib/wallet';

export const maxDuration = 60;
const sniff = b => (b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'image/png' : b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' ? 'image/webp' : null);
const counted = { in: ['APPROVED', 'REVIEW'] };
const sel = { category: true };

async function usage(userId) {
  const [today, month] = await Promise.all([
    prisma.submission.findMany({ where: { userId, status: counted, createdAt: { gte: istDayStart() } }, select: sel }),
    prisma.submission.findMany({ where: { userId, status: counted, createdAt: { gte: istMonthStart() } }, select: sel }),
  ]);
  return { today, month };
}

export async function GET() {
  const { user, res } = await requireUser(); if (res) return res;
  const [items, u] = await Promise.all([
    prisma.submission.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, category: true, status: true, coins: true, reason: true, createdAt: true } }),
    usage(user.id),
  ]);
  return json({ items, usage: usageOf(u.today, u.month) });
}

export async function POST(req) {
  const { user, res } = await requireUser(); if (res) return res;
  const rl = rateLimit(`sub:${user.id}`, 8, 60e3); if (!rl.ok) return tooMany(rl.retryAfter);

  let form; try { form = await req.formData(); } catch { return bad('Invalid upload'); }
  const category = String(form.get('category') || ''), file = form.get('image');
  if (!isCategory(category)) return bad('Choose a waste category');
  if (!file || typeof file === 'string') return bad('Attach a photo');
  if (file.size > LIMITS.maxImageBytes) return bad('Photo is too large (max 4 MB)', 413);
  const buf = Buffer.from(await file.arrayBuffer()), mime = sniff(buf);
  if (!mime) return bad('Only JPEG, PNG or WebP photos are accepted');

  const imageHash = crypto.createHash('sha256').update(buf).digest('hex');
  if (await prisma.submission.findUnique({ where: { imageHash }, select: { id: true } })) return bad('This exact photo was already submitted. Take a fresh one.', 409);

  const u = await usage(user.id);
  const limitMsg = checkLimits(u.today, u.month, category);
  if (limitMsg) return bad(limitMsg, 429);

  const ai = await classify(buf, mime, category);
  const d = decide(ai, category);
  const coins = d.status === 'APPROVED' ? CATEGORIES[category].coins : 0;

  try {
    const sub = await prisma.$transaction(async tx => {
      const s = await tx.submission.create({ data: { userId: user.id, category, status: d.status, coins, confidence: d.confidence ?? null, reason: d.reason, imageHash, ...(d.status === 'REVIEW' ? { imageData: buf, mime } : {}) } });
      if (coins) await credit(tx, user.id, coins, 'EARN', s.id, `${CATEGORIES[category].label} photo approved`);
      return s;
    });
    const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } });
    return json({ status: sub.status, coins, reason: sub.reason, confidence: sub.confidence, balance: fresh.coins });
  } catch (e) {
    if (e.code === 'P2002') return bad('This exact photo was already submitted.', 409);
    throw e;
  }
}
