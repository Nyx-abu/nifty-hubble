export type PatternFamily = 'letters' | 'numbers' | 'shapes';

export interface PatternHistory {
  dotSequence: number[];
  status: 'attempted' | 'failed' | 'successful';
  attemptCount?: number;
}

export type PredictionFamily = PatternFamily;

export interface PredictionOptions {
  count: number;
  seed: number;
  learnFromHistory: boolean;
  includeFailed: boolean;
  family: 'all' | PredictionFamily;
}

export interface PredictionCandidate {
  key: string;
  dotSequence: number[];
  label: string;
  family: PredictionFamily;
  reason: string;
  previouslyTried: boolean;
}

interface PatternTemplate {
  label: string;
  family: PredictionFamily;
  sequence: readonly number[];
}

interface ScoredCandidate extends PredictionCandidate {
  score: number;
}

const templates: readonly PatternTemplate[] = [
  { label: 'L', family: 'letters', sequence: [0, 3, 6, 7, 8] },
  { label: 'Z', family: 'letters', sequence: [0, 1, 2, 4, 6, 7, 8] },
  { label: 'N', family: 'letters', sequence: [0, 3, 6, 4, 2, 5, 8] },
  { label: 'M', family: 'letters', sequence: [6, 3, 0, 4, 2, 5, 8] },
  { label: 'W', family: 'letters', sequence: [0, 3, 6, 4, 8, 5, 2] },
  { label: 'S', family: 'letters', sequence: [2, 1, 0, 3, 4, 5, 8, 7, 6] },
  { label: 'C', family: 'letters', sequence: [2, 1, 0, 3, 6, 7, 8] },
  { label: 'U', family: 'letters', sequence: [0, 3, 6, 7, 8, 5, 2] },
  { label: 'T', family: 'letters', sequence: [0, 1, 2, 4, 7] },
  { label: '2', family: 'numbers', sequence: [0, 1, 2, 5, 4, 3, 6, 7, 8] },
  { label: '3', family: 'numbers', sequence: [0, 1, 2, 5, 4, 7, 8] },
  { label: '4', family: 'numbers', sequence: [0, 3, 6, 4, 1, 2, 5, 8] },
  { label: '5', family: 'numbers', sequence: [2, 1, 0, 3, 6, 7, 8] },
  { label: '6', family: 'numbers', sequence: [2, 1, 0, 3, 6, 7, 8, 5, 4] },
  { label: '7', family: 'numbers', sequence: [0, 1, 2, 4, 6] },
  { label: '8', family: 'numbers', sequence: [0, 1, 4, 7, 6, 3, 2, 5, 8] },
  { label: '9', family: 'numbers', sequence: [6, 3, 0, 1, 2, 5, 4, 7, 8] },
  { label: 'Staircase', family: 'shapes', sequence: [0, 1, 4, 5, 8] },
  { label: 'Frame', family: 'shapes', sequence: [0, 1, 2, 5, 8, 7, 6, 3] },
  { label: 'Zigzag', family: 'shapes', sequence: [0, 4, 2, 5, 7, 6] },
  { label: 'Peak', family: 'shapes', sequence: [6, 3, 0, 4, 2, 5, 8] },
  { label: 'Wave', family: 'shapes', sequence: [0, 3, 1, 4, 2, 5, 7, 6] },
  { label: 'Arrow', family: 'shapes', sequence: [3, 0, 1, 2, 5, 8, 7, 6] },
];

const defaultOptions: PredictionOptions = {
  count: 48,
  seed: 1,
  learnFromHistory: true,
  includeFailed: false,
  family: 'all',
};

function midpointBetween(from: number, to: number): number | null {
  const fromX = from % 3;
  const fromY = Math.floor(from / 3);
  const toX = to % 3;
  const toY = Math.floor(to / 3);
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx % 2 !== 0 || dy % 2 !== 0) return null;
  const midX = fromX + dx / 2;
  const midY = fromY + dy / 2;
  if (midX === fromX && midY === fromY) return null;
  return midY * 3 + midX;
}

/** Append one dot, applying Android's automatic insertion of an unvisited midpoint. */
export function appendDot(sequence: readonly number[], dot: number): number[] {
  const result = sequence.filter((value) => Number.isInteger(value) && value >= 0 && value <= 8);
  if (!Number.isInteger(dot) || dot < 0 || dot > 8 || result.includes(dot)) return result;
  const last = result.at(-1);
  if (last !== undefined) {
    const midpoint = midpointBetween(last, dot);
    if (midpoint !== null && !result.includes(midpoint)) result.push(midpoint);
  }
  result.push(dot);
  return result;
}

/** Return the Android-canonical sequence produced by visiting each supplied dot in order. */
export function normalizeSequence(sequence: readonly number[]): number[] {
  let normalized: number[] = [];
  for (const dot of sequence) normalized = appendDot(normalized, dot);
  return normalized;
}

/** Android lock patterns contain 4–9 unique dots and may not skip an unvisited midpoint. */
export function isValidPattern(sequence: readonly number[]): boolean {
  if (sequence.length < 4 || sequence.length > 9) return false;
  const visited = new Set<number>();
  for (const dot of sequence) {
    if (!Number.isInteger(dot) || dot < 0 || dot > 8 || visited.has(dot)) return false;
    const previous = sequence[sequence.indexOf(dot) - 1];
    if (previous !== undefined) {
      const midpoint = midpointBetween(previous, dot);
      if (midpoint !== null && !visited.has(midpoint)) return false;
    }
    visited.add(dot);
  }
  return true;
}

/** A direction-sensitive identity for an Android-canonical pattern. */
export function patternKey(sequence: readonly number[]): string {
  return normalizeSequence(sequence).join('-');
}

function transformDot(dot: number, rotations: number, reflect: boolean): number {
  let x = dot % 3;
  let y = Math.floor(dot / 3);
  if (reflect) x = 2 - x;
  for (let i = 0; i < rotations; i += 1) [x, y] = [2 - y, x];
  return y * 3 + x;
}

function turnCount(sequence: readonly number[]): number {
  let turns = 0;
  for (let index = 2; index < sequence.length; index += 1) {
    const a = sequence[index - 2];
    const b = sequence[index - 1];
    const c = sequence[index];
    const dx1 = (b % 3) - (a % 3);
    const dy1 = Math.floor(b / 3) - Math.floor(a / 3);
    const dx2 = (c % 3) - (b % 3);
    const dy2 = Math.floor(c / 3) - Math.floor(b / 3);
    if (dx1 * dy2 !== dy1 * dx2 || dx1 * dx2 + dy1 * dy2 <= 0) turns += 1;
  }
  return turns;
}

function seededValue(seed: number, key: string): number {
  let hash = (seed | 0) ^ 0x9e3779b9;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 0x45d9f3b);
    hash ^= hash >>> 16;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffffffff;
}

function orderedEdgeSimilarity(left: readonly number[], right: readonly number[]): number {
  const leftSet = new Set(left.slice(1).map((dot, index) => `${left[index]}>${dot}`));
  const rightSet = new Set(right.slice(1).map((dot, index) => `${right[index]}>${dot}`));
  let intersection = 0;
  for (const dot of leftSet) if (rightSet.has(dot)) intersection += 1;
  return intersection / (leftSet.size + rightSet.size - intersection);
}

function familyForKnownPattern(sequence: readonly number[]): PredictionFamily | null {
  const key = patternKey(sequence);
  for (const template of templates) {
    for (let reflected = 0; reflected < 2; reflected += 1) {
      for (let rotations = 0; rotations < 4; rotations += 1) {
        const transformed = template.sequence.map((dot) => transformDot(dot, rotations, reflected === 1));
        if (patternKey(transformed) === key || patternKey([...transformed].reverse()) === key) return template.family;
      }
    }
  }
  return null;
}

interface WeightedHistory {
  sequence: number[];
  weight: number;
}

function createHistoryProfile(history: readonly PatternHistory[]): {
  items: WeightedHistory[];
  totalWeight: number;
  startWeights: number[];
  meanLength: number;
  meanTurns: number;
  meanFamilyWeights: Record<PredictionFamily, number>;
} {
  const items = history
    .map((item) => ({
      sequence: normalizeSequence(item.dotSequence),
      weight: 1 + Math.min(3, Math.log2(Math.max(1, item.attemptCount ?? 1)) * 0.7),
    }))
    .filter((item) => item.sequence.length > 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const startWeights = Array.from({ length: 9 }, () => 0);
  const meanFamilyWeights: Record<PredictionFamily, number> = { letters: 0, numbers: 0, shapes: 0 };
  let weightedLength = 0;
  let weightedTurns = 0;
  for (const item of items) {
    startWeights[item.sequence[0]] += item.weight;
    weightedLength += item.sequence.length * item.weight;
    weightedTurns += turnCount(item.sequence) * item.weight;
    const family = familyForKnownPattern(item.sequence);
    if (family) meanFamilyWeights[family] += item.weight;
  }
  return {
    items,
    totalWeight,
    startWeights,
    meanLength: totalWeight ? weightedLength / totalWeight : 0,
    meanTurns: totalWeight ? weightedTurns / totalWeight : 0,
    meanFamilyWeights,
  };
}

function familiarityScore(sequence: readonly number[], family: PredictionFamily, profile: ReturnType<typeof createHistoryProfile>): number {
  if (profile.totalWeight === 0) return 0;
  const strength = Math.min(1.25, 0.32 + Math.log2(profile.totalWeight + 1) * 0.25);
  const startAffinity = profile.startWeights[sequence[0]] / profile.totalWeight;
  const lengthAffinity = Math.max(0, 1 - Math.abs(sequence.length - profile.meanLength) / 9);
  const turnAffinity = Math.max(0, 1 - Math.abs(turnCount(sequence) - profile.meanTurns) / 8);
  const edgeAffinity = profile.items.reduce((sum, item) => sum + orderedEdgeSimilarity(sequence, item.sequence) * item.weight, 0) / profile.totalWeight;
  const familyAffinity = profile.meanFamilyWeights[family] / profile.totalWeight;
  return strength * (
    startAffinity * 0.52 +
    lengthAffinity * 0.18 +
    turnAffinity * 0.08 +
    edgeAffinity * 0.18 +
    familyAffinity * 0.04
  );
}

function variantLabel(template: PatternTemplate, rotations: number, reflected: boolean, reversed: boolean): string {
  const changes = [
    ...(reflected ? ['mirrored'] : []),
    ...(rotations ? [`rotated ${rotations * 90}°`] : []),
    ...(reversed ? ['reversed'] : []),
  ];
  return changes.length ? `${template.label} · ${changes.join(' · ')}` : template.label;
}

function candidateReason(
  candidate: PredictionCandidate,
  histories: readonly PatternHistory[],
  learned: boolean,
  retried: boolean,
): string {
  if (retried) return 'A previously failed pattern, included so you can deliberately retry it.';
  if (!learned || histories.length === 0) {
    return `${candidate.family === 'letters' ? 'Letter-like' : candidate.family === 'numbers' ? 'Number-like' : 'Geometric'} route from a familiar 3×3 grid motif.`;
  }
  const sequences = histories.map((item) => normalizeSequence(item.dotSequence));
  const starts = sequences.filter((sequence) => sequence[0] === candidate.dotSequence[0]).length;
  const closest = Math.max(0, ...sequences.map((sequence) => orderedEdgeSimilarity(sequence, candidate.dotSequence)));
  if (starts > 0) return 'Starts at a dot you have used before, with a familiar grid shape.';
  if (closest >= 0.55) return 'Uses several of the same dots as patterns you have tried.';
  const meanLength = sequences.reduce((sum, sequence) => sum + sequence.length, 0) / sequences.length;
  if (Math.abs(candidate.dotSequence.length - meanLength) <= 1) return 'Has a length close to your past patterns.';
  return `${candidate.family === 'letters' ? 'Letter-like' : candidate.family === 'numbers' ? 'Number-like' : 'Geometric'} route, varied from your saved patterns.`;
}

/**
 * Create a deterministic gallery of familiar letter, number, and geometric routes.
 * The ranking is a heuristic for exploration, never a probability estimate.
 */
export function generatePredictions(
  history: readonly PatternHistory[],
  options?: Partial<PredictionOptions>,
): PredictionCandidate[] {
  const resolved = { ...defaultOptions, ...options };
  const limit = Number.isFinite(resolved.count) ? Math.max(1, Math.min(120, Math.floor(resolved.count))) : defaultOptions.count;
  const normalizedHistory = history.map((item) => ({ ...item, dotSequence: normalizeSequence(item.dotSequence) }));
  const historyProfile = createHistoryProfile(normalizedHistory);
  const suppressed = new Set(normalizedHistory.filter((item) => item.status !== 'failed').map((item) => patternKey(item.dotSequence)));
  const failed = new Set(normalizedHistory.filter((item) => item.status === 'failed' && !suppressed.has(patternKey(item.dotSequence))).map((item) => patternKey(item.dotSequence)));
  const seen = new Set<string>();
  const candidates: ScoredCandidate[] = [];

  for (const template of templates) {
    for (let reflectedIndex = 0; reflectedIndex < 2; reflectedIndex += 1) {
      for (let rotations = 0; rotations < 4; rotations += 1) {
        const transformed = template.sequence.map((dot) => transformDot(dot, rotations, reflectedIndex === 1));
        for (let reversedIndex = 0; reversedIndex < 2; reversedIndex += 1) {
          const source = reversedIndex ? [...transformed].reverse() : transformed;
          const sequence = normalizeSequence(source);
          if (!isValidPattern(sequence)) continue;
          const key = patternKey(sequence);
          if (seen.has(key) || suppressed.has(key)) continue;
          const previouslyTried = failed.has(key);
          if (previouslyTried && !resolved.includeFailed) continue;
          if (resolved.family !== 'all' && template.family !== resolved.family) continue;
          seen.add(key);
          const candidate: PredictionCandidate = {
            key,
            dotSequence: sequence,
            label: variantLabel(template, rotations, reflectedIndex === 1, reversedIndex === 1),
            family: template.family,
            reason: '',
            previouslyTried,
          };
          candidate.reason = candidateReason(candidate, normalizedHistory, resolved.learnFromHistory, previouslyTried);
          const startPrior = [0.25, 0.19, 0.14, 0.11, 0.07, 0.055, 0.045, 0.035, 0.025][sequence[0]];
          const lengthPrior = [0, 0, 0, 0.16, 0.18, 0.16, 0.12, 0.08, 0.045, 0.02][sequence.length];
          const simplicityPrior = Math.max(0, 1 - turnCount(sequence) / 9) * 0.09;
          const baseline = startPrior + lengthPrior + simplicityPrior + seededValue(resolved.seed, key) * 0.075;
          const familiarity = resolved.learnFromHistory
            ? familiarityScore(sequence, template.family, historyProfile)
            : 0;
          const failedAttempts = normalizedHistory.filter((item) => item.status === 'failed' && patternKey(item.dotSequence) === key)
            .reduce((sum, item) => sum + Math.max(1, item.attemptCount ?? 1), 0);
          candidates.push({ ...candidate, score: baseline + familiarity + (previouslyTried ? Math.min(0.08, failedAttempts * 0.015) : 0) });
        }
      }
    }
  }

  if (resolved.includeFailed) {
    for (const item of normalizedHistory) {
      const key = patternKey(item.dotSequence);
      if (item.status !== 'failed' || suppressed.has(key) || seen.has(key) || !isValidPattern(item.dotSequence)) continue;
      const matchedFamily = familyForKnownPattern(item.dotSequence);
      const retryFamily = matchedFamily ?? 'shapes';
      if (resolved.family !== 'all' && retryFamily !== resolved.family) continue;
      seen.add(key);
      const candidate: PredictionCandidate = {
        key,
        dotSequence: item.dotSequence,
        label: 'Saved pattern · retry',
        family: retryFamily,
        reason: candidateReason({
          key,
          dotSequence: item.dotSequence,
          label: 'Saved pattern · retry',
          family: retryFamily,
          reason: '',
          previouslyTried: true,
        }, normalizedHistory, resolved.learnFromHistory, true),
        previouslyTried: true,
      };
      const baseline = [0.25, 0.19, 0.14, 0.11, 0.07, 0.055, 0.045, 0.035, 0.025][item.dotSequence[0]];
      const familiarity = resolved.learnFromHistory ? familiarityScore(item.dotSequence, retryFamily, historyProfile) : 0;
      candidates.push({ ...candidate, score: baseline + familiarity + 0.08 + seededValue(resolved.seed, key) * 0.075 });
    }
  }

  candidates.sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
  const explorationWindow = limit >= 12 ? Math.min(Math.ceil(limit * 0.25), Math.max(0, candidates.length - limit)) : 0;
  const offset = explorationWindow > 0
    ? Math.floor(seededValue(resolved.seed, 'gallery-window') * (explorationWindow + 1))
    : 0;
  return candidates.slice(offset, offset + limit).map(({ score: _score, ...candidate }) => candidate);
}
