import assert from 'node:assert/strict';
import test from 'node:test';
import { dotsOnSegment } from '../src/domain/patternInput.ts';

test('sweeps a fast horizontal swipe through every crossed dot in pointer order', () => {
  assert.deepEqual(dotsOnSegment({ x: 50, y: 50 }, { x: 250, y: 50 }), [0, 1, 2]);
});

test('sweeps a diagonal swipe through the center dot and respects reverse direction', () => {
  assert.deepEqual(dotsOnSegment({ x: 50, y: 50 }, { x: 250, y: 250 }), [0, 4, 8]);
  assert.deepEqual(dotsOnSegment({ x: 250, y: 250 }, { x: 50, y: 50 }), [8, 4, 0]);
});

test('a small segment touching no node does not invent pattern dots', () => {
  assert.deepEqual(dotsOnSegment({ x: 100, y: 100 }, { x: 115, y: 110 }), []);
});

test('segments accumulate crossings when pointer movement is split into tiny events', () => {
  const segments = [
    dotsOnSegment({ x: 50, y: 50 }, { x: 85, y: 50 }),
    dotsOnSegment({ x: 85, y: 50 }, { x: 115, y: 50 }),
    dotsOnSegment({ x: 115, y: 50 }, { x: 150, y: 50 }),
  ].flat();
  assert.deepEqual([...new Set(segments)], [0, 1]);
});
