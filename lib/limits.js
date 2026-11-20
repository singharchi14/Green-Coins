import { CATEGORIES, LIMITS } from './config.js';
const IST = 5.5 * 3600e3;
export const istDayStart = (now = new Date()) => new Date(Math.floor((now.getTime() + IST) / 864e5) * 864e5 - IST);
export const istMonthStart = (now = new Date()) => { const s = new Date(now.getTime() + IST); return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1) - IST); };
const worth = list => list.reduce((n, s) => n + CATEGORIES[s.category].coins, 0);
// today / month = submissions that count (APPROVED or awaiting REVIEW). Pending ones reserve their coins.
export function checkLimits(today, month, category) {
  const v = CATEGORIES[category].coins;
  if (today.length >= LIMITS.perDay) return `You have reached today's limit of ${LIMITS.perDay} photos. Come back tomorrow.`;
  if (today.some(s => s.category === category)) return `You already submitted ${CATEGORIES[category].label.toLowerCase()} today. One photo per category per day.`;
  if (worth(today) + v > LIMITS.coinsPerDay) return `This would pass today's ${LIMITS.coinsPerDay}-coin limit.`;
  if (worth(month) + v > LIMITS.coinsPerMonth) return `This would pass this month's ${LIMITS.coinsPerMonth}-coin limit.`;
  return null;
}
export const usageOf = (today, month) => ({ photosToday: today.length, coinsToday: worth(today), coinsMonth: worth(month), perDay: LIMITS.perDay, coinsPerDay: LIMITS.coinsPerDay, coinsPerMonth: LIMITS.coinsPerMonth });
