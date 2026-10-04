import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendDot,
  generatePredictions,
  isValidPattern,
  normalizeSequence,
  patternKey,
  type PatternHistory,
} from '../src/domain/patterns.ts';

test('appendDot inserts the unvisited Android midpoint between distant dots', () => {
  assert.deepEqual(appendDot([0], 8), [0, 4, 8]);
  assert.deepEqual(appendDot([0], 2), [0, 1, 2]);
});

test('appendDot ignores repeated dots and leaves invalid dots out', () => {
  assert.deepEqual(appendDot([0, 4], 4), [0, 4]);
  assert.deepEqual(appendDot([0], 9), [0]);
});

test('normalizeSequence inserts skipped dots while preserving input order', () => {
  assert.deepEqual(normalizeSequence([0, 8, 2]), [0, 4, 8, 5, 2]);
});

test('isValidPattern enforces Android length, uniqueness, and skip rules', () => {
  assert.equal(isValidPattern([0, 1, 2]), false);
  assert.equal(isValidPattern([0, 1, 2, 3]), true);
  assert.equal(isValidPattern([0, 1, 1, 2]), false);
  assert.equal(isValidPattern([0, 8, 1, 2]), false);
  assert.equal(isValidPattern([0, 4, 8, 1]), true);
  assert.equal(isValidPattern([0, 1, 2, 3, 4, 5, 6, 7, 8, 0]), false);
});

test('patternKey normalizes legal paths and keeps direction significant', () => {
  assert.equal(patternKey([0, 8, 2, 3]), '0-4-8-5-2-3');
  assert.notEqual(patternKey([0, 1, 2, 3]), patternKey([3, 2, 1, 0]));
});

test('generated gallery is deterministic, diverse, and Android legal', () => {
  const first = generatePredictions([], { count: 48, seed: 21 });
  const repeat = generatePredictions([], { count: 48, seed: 21 });
  const otherSeed = generatePredictions([], { count: 48, seed: 22 });

  assert.deepEqual(first, repeat);
  assert.ok(first.length >= 24);
  assert.ok(first.every((candidate) => isValidPattern(candidate.dotSequence)));
  assert.ok(new Set(first.map((candidate) => candidate.key)).size === first.length);
  assert.ok(new Set(first.map((candidate) => candidate.family)).size === 3);
  assert.ok(first.some((candidate) => candidate.family === 'letters'));
  assert.ok(first.some((candidate) => candidate.family === 'numbers'));
  assert.ok(first.some((candidate) => candidate.family === 'shapes'));
  assert.notDeepEqual(first.map((candidate) => candidate.key), otherSeed.map((candidate) => candidate.key));
});

test('family filter returns only candidates from the requested family', () => {
  const numbers = generatePredictions([], { count: 12, seed: 9, family: 'numbers' });
  assert.ok(numbers.length > 0);
  assert.ok(numbers.every((candidate) => candidate.family === 'numbers'));
});

test('history excludes every tried pattern by default', () => {
  const history: PatternHistory[] = [
    { dotSequence: [0, 1, 2, 5], status: 'attempted' },
    { dotSequence: [6, 3, 0, 4], status: 'failed' },
    { dotSequence: [8, 7, 6, 3], status: 'successful' },
  ];
  const allKeys = new Set(history.map((item) => patternKey(item.dotSequence)));
  const candidates = generatePredictions(history, { count: 60, seed: 9 });

  assert.ok(candidates.every((candidate) => !allKeys.has(candidate.key)));
  assert.ok(candidates.every((candidate) => !candidate.previouslyTried));
});

test('includeFailed permits failed patterns only as marked retries', () => {
  const history: PatternHistory[] = [
    { dotSequence: [0, 1, 2, 5], status: 'attempted' },
    { dotSequence: [6, 3, 0, 4], status: 'failed', attemptCount: 3 },
    { dotSequence: [8, 7, 6, 3], status: 'successful' },
  ];
  const candidates = generatePredictions(history, {
    count: 80,
    seed: 9,
    includeFailed: true,
  });
  const attemptedKey = patternKey(history[0].dotSequence);
  const failedKey = patternKey(history[1].dotSequence);
  const successfulKey = patternKey(history[2].dotSequence);

  assert.equal(candidates.some((candidate) => candidate.key === attemptedKey), false);
  assert.equal(candidates.some((candidate) => candidate.key === successfulKey), false);
  assert.equal(candidates.find((candidate) => candidate.key === failedKey)?.previouslyTried, true);
});

test('history learning changes personalized ordering without claiming probabilities', () => {
  const history: PatternHistory[] = Array.from({ length: 4 }, () => ({
    dotSequence: [4, 1, 0, 3, 6],
    status: 'failed',
  }));
  const learned = generatePredictions(history, { count: 48, seed: 40, learnFromHistory: true });
  const neutral = generatePredictions(history, { count: 48, seed: 40, learnFromHistory: false });

  assert.notDeepEqual(learned.map((candidate) => candidate.key), neutral.map((candidate) => candidate.key));
  assert.ok(learned.every((candidate) => !('probability' in candidate)));
  assert.ok(learned.every((candidate) => candidate.reason.length > 8));
});

test('number motifs remain distinct and retain honest digit labels after deduplication', () => {
  const digits = generatePredictions([], { count: 120, seed: 2, learnFromHistory: false, family: 'numbers' });
  for (const digit of ['2', '3', '4', '5', '6', '7', '8', '9']) {
    assert.ok(digits.some((candidate) => candidate.label.startsWith(digit)), `missing digit motif ${digit}`);
  }
  assert.ok(digits.every((candidate) => candidate.family === 'numbers'));
});

test('letter motifs include the named familiar alphabet routes', () => {
  const letters = generatePredictions([], { count: 120, seed: 2, learnFromHistory: false, family: 'letters' });
  for (const letter of ['L', 'Z', 'M', 'S']) {
    assert.ok(letters.some((candidate) => candidate.label.startsWith(letter)), `missing letter motif ${letter}`);
  }
});

test('unmatched failed patterns use an honest retry label and shapes family', () => {
  const saved = [0, 1, 5, 8];
  const retry = generatePredictions([{ dotSequence: saved, status: 'failed' }], {
    count: 120,
    includeFailed: true,
    learnFromHistory: false,
  }).find((candidate) => candidate.key === patternKey(saved));
  assert.ok(retry);
  assert.equal(retry.label, 'Saved pattern · retry');
  assert.equal(retry.family, 'shapes');
  assert.equal(generatePredictions([{ dotSequence: saved, status: 'failed' }], {
    count: 120,
    includeFailed: true,
    learnFromHistory: false,
    family: 'letters',
  }).some((candidate) => candidate.key === patternKey(saved)), false);
});

test('recognized failed motifs keep their original family through family filters', () => {
  const saved = [0, 1, 2, 4, 6];
  const history = [{ dotSequence: saved, status: 'failed' as const }];
  const numberRetries = generatePredictions(history, {
    count: 120,
    includeFailed: true,
    learnFromHistory: false,
    family: 'numbers',
  });
  assert.equal(numberRetries.find((candidate) => candidate.key === patternKey(saved))?.label.startsWith('7'), true);
  assert.equal(generatePredictions(history, {
    count: 120,
    includeFailed: true,
    learnFromHistory: false,
    family: 'letters',
  }).some((candidate) => candidate.key === patternKey(saved)), false);
});

test('familiarity biases simple upper-left patterns before seed variation', () => {
  const gallery = generatePredictions([], { count: 1, seed: 1, learnFromHistory: false });
  assert.ok(gallery[0].dotSequence[0] <= 2, `expected a top-row start, got ${gallery[0].dotSequence[0]}`);
});

test('higher attemptCount strengthens learned starting-dot familiarity', () => {
  const sequence = [4, 1, 0, 3, 6];
  const lowCount = [{ dotSequence: sequence, status: 'attempted' as const, attemptCount: 1 }];
  const highCount = [{ dotSequence: sequence, status: 'attempted' as const, attemptCount: 20 }];
  const low = generatePredictions(lowCount, { count: 120, seed: 11, family: 'numbers' });
  const high = generatePredictions(highCount, { count: 120, seed: 11, family: 'numbers' });
  const topCenterStarts = (items: typeof low) => items.slice(0, 10).filter((candidate) => candidate.dotSequence[0] === 4).length;
  assert.ok(topCenterStarts(high) > topCenterStarts(low));
});

test('seed changes gallery composition while keeping personalized candidates near the top', () => {
  const history = [{ dotSequence: [4, 1, 0, 3, 6], status: 'failed' as const }];
  const first = generatePredictions(history, { count: 24, seed: 1 });
  const second = generatePredictions(history, { count: 24, seed: 2 });
  const overlap = first.filter((candidate) => second.some((other) => candidate.key === other.key)).length;
  assert.ok(overlap < 18, `expected a refreshed gallery, got ${overlap}/24 shared candidates`);
  assert.ok(first.some((candidate) => candidate.reason.includes('used before')));
  assert.ok(second.some((candidate) => candidate.reason.includes('used before')));
});
