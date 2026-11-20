import crypto from 'crypto';
import { secret } from './secrets';

export const OTP_TTL = 5 * 60 * 1000; // 5 minutes
export const MAX_ATTEMPTS = 5;
export const COOLDOWN = 30;           // seconds between sends
export const MAX_SENDS_PER_HOUR = 5;

export const genOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
export const hashOtp = (phone, otp) =>
  crypto.createHmac('sha256', secret('OTP_SECRET', 'dev-only-otp-secret')).update(`${phone}:${otp}`).digest('hex');
export function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// Accepts 9876543210, +91 98765 43210, 09876543210 -> "+919876543210"
export function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(d) ? '+91' + d : null;
}
