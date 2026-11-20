import { PICKUP, isCategory } from './config.js';
import { istDayStart } from './limits.js';

const DAY = 864e5;
const IST = 5.5 * 3600e3;
export const OPEN = ['REQUESTED', 'ASSIGNED', 'COLLECTED'];

// 'YYYY-MM-DD' (a calendar day in India) -> Date at 00:00 IST, or null if malformed.
export function parseDay(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const d = new Date(`${s}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) || istDayKey(d) !== s ? null : d; // rejects e.g. 2026-02-31
}
export const istDayKey = d => new Date(d.getTime() + IST).toISOString().slice(0, 10);

// Validates a new request body. Returns { error } or { data }.
export function validateRequest(b, now = new Date()) {
  if (!isCategory(b.category)) return { error: 'Choose a waste category' };
  const kg = Number(b.estKg);
  if (!Number.isFinite(kg) || kg < PICKUP.minKg || kg > PICKUP.maxKg) return { error: `Quantity must be between ${PICKUP.minKg} and ${PICKUP.maxKg} kg` };
  const day = parseDay(b.day), today = istDayStart(now);
  if (!day) return { error: 'Choose a pickup day' };
  if (day < today) return { error: 'Pickup day cannot be in the past' };
  if (day > new Date(today.getTime() + PICKUP.maxAheadDays * DAY)) return { error: `Choose a day within the next ${PICKUP.maxAheadDays} days` };
  const note = String(b.note || '').trim().slice(0, 200);
  return { data: { category: b.category, estKg: Math.round(kg * 10) / 10, preferredDay: day, note: note || null } };
}

// Why a household cannot make another request right now (null = allowed).
// existing: that citizen's non-cancelled pickups, each { category, status, createdAt }.
export function checkRequestRules(existing, category, now = new Date()) {
  if (existing.filter(p => OPEN.includes(p.status)).length >= PICKUP.maxActive) return `You can have at most ${PICKUP.maxActive} open pickup requests. Wait for one to finish.`;
  const cutoff = now.getTime() - PICKUP.repeatDays * DAY;
  if (existing.some(p => p.category === category && p.createdAt.getTime() > cutoff)) return `You already requested a ${category} pickup in the last ${PICKUP.repeatDays} days.`;
  return null;
}

// Coins from the weighed quantity, never from the citizen's estimate.
export function pickupCoins(category, kg) {
  const k = Math.min(Math.max(Number(kg) || 0, 0), PICKUP.maxKg);
  return Math.min(PICKUP.maxCoins, Math.floor(k * PICKUP.coinsPerKg[category]));
}

export function validateWeighing(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n < PICKUP.minKg || n > PICKUP.maxKg) return { error: `Weight must be between ${PICKUP.minKg} and ${PICKUP.maxKg} kg` };
  return { kg: Math.round(n * 10) / 10 };
}

// Allowed status moves. Everything else is refused, so a request can never skip a step.
const NEXT = { REQUESTED: ['ASSIGNED', 'CANCELLED'], ASSIGNED: ['ASSIGNED', 'COLLECTED', 'CANCELLED'], COLLECTED: ['VERIFIED'], VERIFIED: [], CANCELLED: [] };
export const canMove = (from, to) => (NEXT[from] || []).includes(to);

// A request is overdue when still waiting for collection after the chosen day has ended.
export const isOverdue = (p, now = new Date()) => (p.status === 'REQUESTED' || p.status === 'ASSIGNED') && now.getTime() >= p.preferredDay.getTime() + DAY;
export const wasLate = p => p.collectedAt != null && p.collectedAt.getTime() >= p.preferredDay.getTime() + DAY;
