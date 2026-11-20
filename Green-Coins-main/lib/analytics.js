import { ANALYTICS } from './config.js';
import { isOverdue, wasLate } from './pickup.js';

const DAY = 864e5;
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const blank = (city, locality) => ({ city, locality, households: 0, activeHouseholds: 0, participation: 0, photos: 0, photosByCategory: {},
  pickupsRequested: 0, pickupsVerified: 0, kgDiverted: 0, kgByCategory: {}, overdue: 0, late: 0, avgCollectDays: null, lowParticipation: false });

// Pure aggregation (no database) so the rules are unit-tested.
//   users    [{ id, city, locality }]                     citizens only
//   photos   [{ userId, category, createdAt }]            APPROVED submissions
//   pickups  [{ userId, city, locality, category, status, preferredDay, createdAt, collectedAt, collectedKg }]
// "Active" = household with an approved photo OR a collected pickup inside the window.
// "Diverted" = weighed kg of VERIFIED pickups collected inside the window. Nothing is estimated.
export function buildLocalityStats({ users, photos, pickups }, now = new Date(), days = ANALYTICS.windowDays) {
  const since = new Date(now.getTime() - days * DAY);
  const rows = new Map(), byUser = new Map();
  const row = (city, locality) => { const k = norm(city) + '|' + norm(locality); if (!rows.has(k)) rows.set(k, { ...blank(String(city).trim(), String(locality).trim()), _active: new Set(), _turn: [] }); return rows.get(k); };

  for (const u of users) { const r = row(u.city, u.locality); r.households++; byUser.set(u.id, r); }
  for (const p of photos) {
    if (p.createdAt < since) continue;
    const r = byUser.get(p.userId); if (!r) continue;
    r.photos++; r.photosByCategory[p.category] = (r.photosByCategory[p.category] || 0) + 1; r._active.add(p.userId);
  }
  for (const p of pickups) {
    const r = row(p.city, p.locality);
    if (p.createdAt >= since) r.pickupsRequested++;
    if (isOverdue(p, now)) r.overdue++;
    if (p.collectedAt && p.collectedAt >= since) {
      r._turn.push((p.collectedAt - p.createdAt) / DAY);
      if (wasLate(p)) r.late++;
      if (p.status === 'VERIFIED') {
        r.pickupsVerified++; r.kgDiverted += p.collectedKg || 0;
        r.kgByCategory[p.category] = round((r.kgByCategory[p.category] || 0) + (p.collectedKg || 0));
      }
      r._active.add(p.userId);
    }
  }

  const list = [...rows.values()].map(r => {
    r.activeHouseholds = [...r._active].filter(id => byUser.get(id) === r).length;
    r.participation = r.households ? round(r.activeHouseholds / r.households, 2) : 0;
    r.avgCollectDays = r._turn.length ? round(r._turn.reduce((a, b) => a + b, 0) / r._turn.length) : null;
    r.kgDiverted = round(r.kgDiverted);
    // Only flag a locality once enough households are registered for the rate to mean something.
    r.lowParticipation = r.households >= ANALYTICS.minHouseholds && r.participation < ANALYTICS.lowParticipation;
    delete r._active; delete r._turn;
    return r;
  }).sort((a, b) => a.participation - b.participation || b.households - a.households);

  const sum = k => list.reduce((n, r) => n + r[k], 0);
  const turn = pickups.filter(p => p.collectedAt && p.collectedAt >= since).map(p => (p.collectedAt - p.createdAt) / DAY);
  const kgByCategory = {};
  for (const r of list) for (const [c, v] of Object.entries(r.kgByCategory)) kgByCategory[c] = round((kgByCategory[c] || 0) + v);
  return {
    windowDays: days, since: since.toISOString(), localities: list,
    totals: { households: sum('households'), activeHouseholds: sum('activeHouseholds'), kgDiverted: round(sum('kgDiverted')), kgByCategory,
      pickupsRequested: sum('pickupsRequested'), pickupsVerified: sum('pickupsVerified'), overdue: sum('overdue'), late: sum('late'),
      avgCollectDays: turn.length ? round(turn.reduce((a, b) => a + b, 0) / turn.length) : null,
      lowParticipationLocalities: list.filter(r => r.lowParticipation).length },
  };
}
