import { prisma } from '@/lib/prisma';
import { hashOtp, safeEqual, normalizePhone, MAX_ATTEMPTS } from '@/lib/otp';
import { createSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate';
import { json, bad, tooMany, clientIp } from '@/lib/http';
import { roleForPhone } from '@/lib/roles';


export async function POST(req) {
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const phone = normalizePhone(b.phone), otp = String(b.otp || ''), purpose = b.purpose;
  if (!phone || !/^\d{6}$/.test(otp) || !['register', 'login'].includes(purpose)) return bad('Enter the 6-digit code');

  const ip = rateLimit(`verify:ip:${clientIp(req)}`, 30, 10 * 60e3);
  if (!ip.ok) return tooMany(ip.retryAfter);

  const rec = await prisma.otp.findUnique({ where: { phone } });
  if (!rec || rec.purpose !== purpose) return bad('No active code. Please request a new one.');
  if (Date.now() > rec.expiresAt.getTime()) { await prisma.otp.delete({ where: { phone } }); return bad('This code has expired. Please request a new one.'); }
  if (!safeEqual(rec.hash, hashOtp(phone, otp))) {
    const left = MAX_ATTEMPTS - (rec.attempts + 1);
    if (left <= 0) { await prisma.otp.delete({ where: { phone } }); return bad('Too many wrong attempts. Please request a new code.', 429); }
    await prisma.otp.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    return bad(`Incorrect code. ${left} attempt${left > 1 ? 's' : ''} left.`);
  }
  await prisma.otp.delete({ where: { phone } });

  let user;
  if (purpose === 'register') {
    try { user = await prisma.user.create({ data: { phone, ...rec.profile, role: roleForPhone(phone) || 'CITIZEN' } }); }
    catch (e) { if (e.code === 'P2002') return bad('This number is already registered.', 409); throw e; }
  } else {
    user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return bad('Account not found.', 404);
    const want = roleForPhone(phone); // env lists promote on sign-in; never demote automatically
    if (want && user.role !== want) user = await prisma.user.update({ where: { id: user.id }, data: { role: want } });
  }
  await createSession(user);
  return json({ ok: true, user: { name: user.name } });
}
