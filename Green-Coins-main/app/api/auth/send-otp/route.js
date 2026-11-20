import { prisma } from '@/lib/prisma';
import { genOtp, hashOtp, normalizePhone, OTP_TTL, COOLDOWN, MAX_SENDS_PER_HOUR } from '@/lib/otp';
import { sendOtpSms, isDevSms } from '@/lib/sms';
import { rateLimit } from '@/lib/rate';
import { json, bad, tooMany, clientIp } from '@/lib/http';

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return bad('Invalid request'); }
  const phone = normalizePhone(b.phone);
  if (!phone) return bad('Enter a valid 10-digit Indian mobile number');
  const purpose = b.purpose;
  if (!['register', 'login'].includes(purpose)) return bad('Invalid request');

  const ip = rateLimit(`send:ip:${clientIp(req)}`, 15, 10 * 60e3);
  if (!ip.ok) return tooMany(ip.retryAfter);

  const ph = rateLimit(`send:phone:${phone}`, MAX_SENDS_PER_HOUR, 3600e3); // survives OTP record deletion
  if (!ph.ok) return tooMany(ph.retryAfter);

  const exists = !!(await prisma.user.findUnique({ where: { phone } }));
  let profile = null;
  if (purpose === 'register') {
    const name = String(b.name || '').trim(), city = String(b.city || '').trim(), locality = String(b.locality || '').trim();
    if (name.length < 2 || name.length > 60) return bad('Enter your full name');
    if (!city || !locality || city.length > 60 || locality.length > 80) return bad('Enter your city and mohalla');
    if (b.consent !== true) return bad('Please accept the program rules to continue');
    if (exists) return bad('This number is already registered. Please log in.', 409);
    profile = { name, city, locality };
  } else if (!exists) return bad('No account found for this number. Please register.', 404);

  const now = Date.now(), otp = genOtp();
  const rec = await prisma.otp.findUnique({ where: { phone } });
  if (rec && now - rec.lastSentAt.getTime() < COOLDOWN * 1000)
    return tooMany(Math.ceil((COOLDOWN * 1000 - (now - rec.lastSentAt.getTime())) / 1000));
  const sends = (rec?.sends || []).map(d => d.getTime()).filter(t => now - t < 3600e3);
  if (sends.length >= MAX_SENDS_PER_HOUR) return tooMany(Math.ceil((3600e3 - (now - sends[0])) / 1000));
  sends.push(now);
  const data = { purpose, hash: hashOtp(phone, otp), expiresAt: new Date(now + OTP_TTL), attempts: 0, lastSentAt: new Date(now), sends: sends.map(t => new Date(t)), profile: profile ?? undefined };
  await prisma.otp.upsert({ where: { phone }, create: { phone, ...data }, update: data });

  try { await sendOtpSms(phone, otp); }
  catch (e) { console.error(e); return bad('Could not send the SMS. Please try again.', 502); }

  return json({ ok: true, cooldown: COOLDOWN, expiresIn: OTP_TTL / 1000, ...(isDevSms() ? { devOtp: otp } : {}) });
}
