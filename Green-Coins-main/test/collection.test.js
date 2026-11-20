import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest, checkRequestRules, pickupCoins, validateWeighing, canMove, isOverdue, wasLate, parseDay } from '../lib/pickup.js';
import { buildLocalityStats } from '../lib/analytics.js';

const NOW = new Date('2026-11-13T06:00:00Z'); // 11:30 IST on 13 Nov 2026
const D = s => new Date(s);
const body = (o = {}) => ({ category: 'dry', estKg: 3, day: '2026-11-14', ...o });

test('request: accepts a normal request and rounds the estimate', () => { const r = validateRequest(body({ estKg: 3.26 }), NOW); assert.equal(r.data.estKg, 3.3); assert.equal(r.data.preferredDay.toISOString(), '2026-11-13T18:30:00.000Z'); });
test('request: today is allowed, yesterday is not', () => { assert.ok(validateRequest(body({ day: '2026-11-13' }), NOW).data); assert.match(validateRequest(body({ day: '2026-11-12' }), NOW).error, /past/); });
test('request: not more than 7 days ahead', () => { assert.ok(validateRequest(body({ day: '2026-11-20' }), NOW).data); assert.match(validateRequest(body({ day: '2026-11-21' }), NOW).error, /within/); });
test('request: rejects bad category, weight and dates', () => {
  assert.ok(validateRequest(body({ category: 'gold' }), NOW).error);
  assert.ok(validateRequest(body({ estKg: 0 }), NOW).error);
  assert.ok(validateRequest(body({ estKg: 26 }), NOW).error);
  assert.ok(validateRequest(body({ estKg: 'abc' }), NOW).error);
  assert.ok(validateRequest(body({ day: '2026-02-31' }), NOW).error);
  assert.ok(validateRequest(body({ day: 'tomorrow' }), NOW).error);
});
test('parseDay rejects impossible calendar days', () => { assert.equal(parseDay('2026-02-31'), null); assert.ok(parseDay('2026-02-28')); });

const ex = (category, status, ago) => ({ category, status, createdAt: new Date(NOW.getTime() - ago * 864e5) });
test('rules: at most 2 open requests', () => assert.match(checkRequestRules([ex('wet', 'REQUESTED', 0), ex('dry', 'ASSIGNED', 0)], 'ewaste', NOW), /at most 2/));
test('rules: one request per category per 7 days', () => { assert.match(checkRequestRules([ex('dry', 'VERIFIED', 3)], 'dry', NOW), /last 7 days/); assert.equal(checkRequestRules([ex('dry', 'VERIFIED', 8)], 'dry', NOW), null); });
test('rules: a different category is fine', () => assert.equal(checkRequestRules([ex('dry', 'VERIFIED', 1)], 'wet', NOW), null));

test('coins come from weighed kg and are capped', () => {
  assert.equal(pickupCoins('wet', 3.4), 3);
  assert.equal(pickupCoins('ewaste', 2), 12);
  assert.equal(pickupCoins('ewaste', 25), 30);
  assert.equal(pickupCoins('dry', 0.2), 0);
  assert.equal(pickupCoins('hazardous', 1000), 30);
});
test('weighing: range and rounding', () => { assert.equal(validateWeighing('2.46').kg, 2.5); assert.ok(validateWeighing(0).error); assert.ok(validateWeighing(30).error); assert.ok(validateWeighing('x').error); });

test('status flow cannot skip steps', () => {
  assert.ok(canMove('REQUESTED', 'ASSIGNED')); assert.ok(canMove('ASSIGNED', 'COLLECTED')); assert.ok(canMove('COLLECTED', 'VERIFIED'));
  assert.ok(!canMove('REQUESTED', 'COLLECTED')); assert.ok(!canMove('REQUESTED', 'VERIFIED')); assert.ok(!canMove('ASSIGNED', 'VERIFIED'));
  assert.ok(!canMove('VERIFIED', 'CANCELLED')); assert.ok(!canMove('COLLECTED', 'CANCELLED')); assert.ok(!canMove('CANCELLED', 'ASSIGNED'));
});

const pk = (o = {}) => ({ userId: 'u1', city: 'Nawanshahr', locality: 'Civil Lines', category: 'dry', status: 'REQUESTED', preferredDay: D('2026-11-11T18:30:00Z') /* 12 Nov IST */, createdAt: D('2026-11-10T04:00:00Z'), collectedAt: null, collectedKg: null, ...o });
test('overdue only after the chosen day has ended', () => {
  assert.equal(isOverdue(pk({ preferredDay: D('2026-11-12T18:30:00Z') }), NOW), false); // chosen day is today (13 Nov IST)
  assert.equal(isOverdue(pk(), NOW), true);                                              // chosen day was yesterday
  assert.equal(isOverdue(pk({ status: 'COLLECTED' }), NOW), false);
  assert.equal(isOverdue(pk({ status: 'CANCELLED' }), NOW), false);
});
test('late = collected after the chosen day ended', () => {
  assert.equal(wasLate(pk({ collectedAt: D('2026-11-13T05:00:00Z') })), true);
  assert.equal(wasLate(pk({ collectedAt: D('2026-11-12T10:00:00Z') })), false);
});

const U = (id, locality, city = 'Nawanshahr') => ({ id, city, locality });
test('analytics: participation, flags and grouping ignore case and spacing', () => {
  const users = [U('a', 'Civil Lines'), U('b', ' civil  lines '), U('c', 'Model Town'), U('d', 'Model Town'), U('e', 'Model Town'), U('f', 'Model Town')];
  const photos = [{ userId: 'a', category: 'wet', createdAt: D('2026-11-10T00:00:00Z') }, { userId: 'a', category: 'dry', createdAt: D('2026-11-11T00:00:00Z') }, { userId: 'b', category: 'wet', createdAt: D('2026-08-01T00:00:00Z') /* outside window */ }];
  const r = buildLocalityStats({ users, photos, pickups: [] }, NOW);
  const civil = r.localities.find(x => x.locality === 'Civil Lines'), model = r.localities.find(x => x.locality === 'Model Town');
  assert.equal(r.localities.length, 2);
  assert.equal(civil.households, 2); assert.equal(civil.activeHouseholds, 1); assert.equal(civil.participation, 0.5); assert.equal(civil.photos, 2);
  assert.equal(model.participation, 0); assert.equal(model.lowParticipation, true);
  assert.equal(civil.lowParticipation, false);
  assert.equal(r.localities[0].locality, 'Model Town'); // lowest participation first
});
test('analytics: tiny localities are not flagged low', () => { const r = buildLocalityStats({ users: [U('a', 'Tiny'), U('b', 'Tiny')], photos: [], pickups: [] }, NOW); assert.equal(r.localities[0].lowParticipation, false); });
test('analytics: diverted kg counts only verified, weighed pickups in the window', () => {
  const users = [U('u1', 'Civil Lines')];
  const done = pk({ status: 'VERIFIED', collectedKg: 4.5, createdAt: D('2026-11-08T04:00:00Z'), collectedAt: D('2026-11-12T10:00:00Z') });
  const waiting = pk({ status: 'COLLECTED', collectedKg: 9, collectedAt: D('2026-11-12T10:00:00Z') });
  const old = pk({ status: 'VERIFIED', collectedKg: 7, createdAt: D('2026-08-01T00:00:00Z'), collectedAt: D('2026-08-02T00:00:00Z') });
  const r = buildLocalityStats({ users, photos: [], pickups: [done, waiting, old] }, NOW);
  assert.equal(r.totals.kgDiverted, 4.5); assert.equal(r.totals.pickupsVerified, 1); assert.equal(r.totals.kgByCategory.dry, 4.5);
  assert.equal(r.localities[0].activeHouseholds, 1); // collected pickup counts as participation
});
test('analytics: overdue counted per locality, even for old open requests', () => {
  const r = buildLocalityStats({ users: [U('u1', 'Civil Lines')], photos: [], pickups: [pk({ createdAt: D('2026-08-01T00:00:00Z'), preferredDay: D('2026-08-02T00:00:00Z') }), pk({ preferredDay: D('2026-11-12T18:30:00Z') })] }, NOW);
  assert.equal(r.totals.overdue, 1);
});
test('analytics: average days to collect and late count', () => {
  const a = pk({ status: 'VERIFIED', collectedKg: 1, createdAt: D('2026-11-08T00:00:00Z'), collectedAt: D('2026-11-09T00:00:00Z'), preferredDay: D('2026-11-08T18:30:00Z') });
  const b = pk({ status: 'VERIFIED', collectedKg: 1, createdAt: D('2026-11-07T00:00:00Z'), collectedAt: D('2026-11-10T00:00:00Z'), preferredDay: D('2026-11-07T18:30:00Z') });
  const r = buildLocalityStats({ users: [U('u1', 'Civil Lines')], photos: [], pickups: [a, b] }, NOW);
  assert.equal(r.totals.avgCollectDays, 2); assert.equal(r.totals.late, 1);
});
