import assert from 'node:assert/strict';
import test from 'node:test';
import { mergePatterns, parsePattern } from '../src/domain/history.ts';
import type { Pattern } from '../src/types.ts';

function record(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'first', dotSequence: [0, 1, 2, 5], timestamp: 1000,
    status: 'failed', attemptCount: 1, lastAttemptAt: 1100, outcomes: ['failed'],
    ...overrides,
  };
}

test('legacy history preserves short sequences, notes, coordinates and recorded results', () => {
  const legacy = parsePattern({ id: 'old', dotSequence: [0, 8], gridTile: { x: -3, y: 7 }, status: 'successful', note: 'old clue', timestamp: 10 });
  assert.ok(legacy);
  assert.deepEqual(legacy.dotSequence, [0, 8]);
  assert.deepEqual(legacy.gridTile, { x: -3, y: 7 });
  assert.equal(legacy.note, 'old clue');
  assert.equal(legacy.attemptCount, 1);
  assert.deepEqual(legacy.outcomes, ['successful']);
});

test('invalid imported sequences and metadata are rejected at the boundary', () => {
  const invalid = [
    { dotSequence: [] }, { dotSequence: [0, 0, 1, 2] }, { dotSequence: [0, 1, 2, 9] },
    { dotSequence: [0, 1, 2, 3], status: 'surprise' },
    { dotSequence: [0, 1, 2, 3], timestamp: Infinity },
    { dotSequence: [0, 1, 2, 3], timestamp: 1e20 },
    { dotSequence: [0, 1, 2, 3], attemptCount: -2 },
    { dotSequence: [0, 1, 2, 3], note: { malicious: true } },
    { dotSequence: [0, 1, 2, 3], outcomes: ['unknown'] },
  ];
  for (const item of invalid) assert.equal(parsePattern(item), null, JSON.stringify(item));
});

test('untested legacy records do not invent a tried outcome', () => {
  const item = parsePattern({ id: 'draft', dotSequence: [0, 1, 2, 5], status: 'attempted', timestamp: 100 });
  assert.ok(item);
  assert.equal(item.attemptCount, 0);
  assert.deepEqual(item.outcomes, []);
});

test('imports must retain stable record IDs to make repeated imports idempotent', () => {
  assert.equal(parsePattern({ dotSequence: [0, 1, 2, 5], status: 'failed' }), null);
});

test('an ID cannot address two different pattern sequences', () => {
  assert.throws(() => mergePatterns([record({ dotSequence: [3, 2, 1, 0] })], [record()]), /different patterns/);
});

test('a repeat import is idempotent for attempt counts and outcome history', () => {
  const original = record();
  const first = mergePatterns([original], []);
  const second = mergePatterns(first, first);
  assert.deepEqual(second, first);
});

test('newer outcomes on the same record survive import with unchanged creation time', () => {
  const old = record();
  const updated = record({ status: 'successful', attemptCount: 2, lastAttemptAt: 1200, outcomes: ['failed', 'successful'] });
  const [merged] = mergePatterns([updated], [old]);
  assert.equal(merged.status, 'successful');
  assert.equal(merged.attemptCount, 2);
  assert.deepEqual(merged.outcomes, ['failed', 'successful']);
});

test('independent legacy duplicate records combine tries without losing direction', () => {
  const first = record();
  const second = record({ id: 'second', timestamp: 2000, note: 'remember this' });
  const reverse = record({ id: 'reverse', dotSequence: [5, 2, 1, 0] });
  const merged = mergePatterns([second, reverse], [first]);
  assert.equal(merged.length, 2);
  const forward = merged.find((item) => item.id === 'first');
  assert.ok(forward);
  assert.equal(forward.attemptCount, 2);
  assert.equal(forward.note, 'remember this');
});

test('reimporting an aggregate backup does not double count overlapping records', () => {
  const first = record();
  const second = record({ id: 'second', timestamp: 2000 });
  const combined = mergePatterns([second], [first]);
  const [merged] = mergePatterns(combined, [first]);
  assert.equal(merged.attemptCount, 2);
  assert.equal(merged.outcomes.length, 2);
  assert.deepEqual(mergePatterns(combined, [merged]), [merged]);
});
