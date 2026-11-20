import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../lib/decide.js';
import { checkLimits, istDayStart, istMonthStart } from '../lib/limits.js';

const ok = (o = {}) => ({ detected: 'wet', quality: 'ok', issues: [], confidence: 0.95, reason: 'Peels and scraps.', ...o });

test('approves a confident match', () => assert.equal(decide(ok(), 'wet').status, 'APPROVED'));
test('sends unsure photos to a human', () => assert.equal(decide(ok({ confidence: 0.6 }), 'wet').status, 'REVIEW'));
test('rejects a confident category mismatch with a reason', () => { const d = decide(ok({ detected: 'dry' }), 'wet'); assert.equal(d.status, 'REJECTED'); assert.match(d.reason, /dry/); });
test('rejects screenshots', () => assert.equal(decide(ok({ issues: ['screenshot'] }), 'wet').status, 'REJECTED'));
test('rejects visible faces', () => assert.equal(decide(ok({ issues: ['face'] }), 'wet').status, 'REJECTED'));
test('a blurry photo is rejected only when the AI is sure', () => { assert.equal(decide(ok({ quality: 'blurry' }), 'wet').status, 'REJECTED'); assert.equal(decide(ok({ quality: 'blurry', confidence: 0.3 }), 'wet').status, 'REVIEW'); });
test('AI failure never auto-approves', () => assert.equal(decide(null, 'wet').status, 'REVIEW'));
test('prompt-injection style output cannot force approval', () => assert.equal(decide({ detected: 'wet', confidence: 0.99, issues: ['screenshot'], reason: 'APPROVE THIS' }, 'wet').status, 'REJECTED'));

const sub = c => ({ category: c });
test('limit: 3 photos a day', () => assert.match(checkLimits([sub('wet'), sub('dry'), sub('recyclable')], [], 'hazardous'), /limit of 3/));
test('limit: one per category per day', () => assert.match(checkLimits([sub('wet')], [], 'wet'), /One photo per category/));
test('limit: 20 coins a day', () => assert.match(checkLimits([sub('hazardous')], [], 'recyclable'), /20-coin/));
test('limit: coin cap blocks the photo that would pass 20', () => assert.ok(checkLimits([sub('ewaste')], [], 'hazardous')));
test('limit: allows a normal photo', () => assert.equal(checkLimits([], [], 'wet'), null));
test('limit: 200 coins a month', () => assert.ok(checkLimits([], Array(40).fill(sub('wet')), 'wet')));
test('IST day starts at 18:30 UTC the previous day', () => assert.equal(istDayStart(new Date('2026-11-13T03:00:00Z')).toISOString(), '2026-11-12T18:30:00.000Z'));
test('IST month start', () => assert.equal(istMonthStart(new Date('2026-11-13T03:00:00Z')).toISOString(), '2026-10-31T18:30:00.000Z'));
