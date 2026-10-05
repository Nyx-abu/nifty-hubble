import { patternKey } from './patterns.ts';
import type { Pattern, PatternOutcome, PatternStatus } from '../types.ts';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

export function parsePattern(value: unknown): Pattern | null {
  const item = asRecord(value);
  if (!item || !Array.isArray(item.dotSequence) || item.dotSequence.length > 9 || !item.dotSequence.every((dot) => Number.isInteger(dot) && dot >= 0 && dot <= 8)) return null;
  const dotSequence = item.dotSequence as number[];
  if (dotSequence.length === 0 || new Set(dotSequence).size !== dotSequence.length) return null;
  if (typeof item.id !== 'string' || !item.id.trim()) return null;
  const status = item.status;
  const legacySuccess = status === 'successful' || status === 'success';
  if (!(status === 'attempted' || status === 'failed' || legacySuccess || status === undefined)) return null;
  if (item.attemptCount !== undefined && (typeof item.attemptCount !== 'number' || !Number.isInteger(item.attemptCount) || item.attemptCount < 0)) return null;
  if (item.timestamp !== undefined && (typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp) || item.timestamp < 0 || item.timestamp > 8.64e15)) return null;
  if (item.lastAttemptAt !== undefined && (typeof item.lastAttemptAt !== 'number' || !Number.isFinite(item.lastAttemptAt) || item.lastAttemptAt < 0 || item.lastAttemptAt > 8.64e15)) return null;
  if (item.note !== undefined && typeof item.note !== 'string') return null;
  if (item.outcomes !== undefined && (!Array.isArray(item.outcomes) || !item.outcomes.every((outcome) => outcome === 'failed' || outcome === 'successful'))) return null;
  const normalizedStatus: PatternStatus = legacySuccess ? 'successful' : status === 'failed' ? 'failed' : 'attempted';
  const outcomes = Array.isArray(item.outcomes)
    ? item.outcomes as PatternOutcome[]
    : normalizedStatus === 'attempted' ? [] : [normalizedStatus];
  const gridTile = asRecord(item.gridTile);
  return {
    id: item.id,
    dotSequence: [...dotSequence],
    status: normalizedStatus,
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
    ...(typeof item.note === 'string' ? { note: item.note } : {}),
    ...(gridTile && typeof gridTile.x === 'number' && Number.isFinite(gridTile.x) && typeof gridTile.y === 'number' && Number.isFinite(gridTile.y) ? { gridTile: { x: gridTile.x, y: gridTile.y } } : {}),
    ...(typeof item.startingDot === 'number' ? { startingDot: item.startingDot } : {}),
    ...(typeof item.startingDirection === 'string' ? { startingDirection: item.startingDirection } : {}),
    attemptCount: typeof item.attemptCount === 'number' ? item.attemptCount : outcomes.length,
    ...(typeof item.lastAttemptAt === 'number' ? { lastAttemptAt: item.lastAttemptAt } : {}),
    outcomes,
    ...(Array.isArray(item.mergedIds) && item.mergedIds.every((id) => typeof id === 'string') ? { mergedIds: [...new Set(item.mergedIds as string[])] } : {}),
  };
}

export interface ParsedImportRecords {
  patterns: Pattern[];
  skipped: number;
}

/** Keep valid records from a mixed backup while counting records rejected at the validation boundary. */
export function parseImportRecords(value: unknown): ParsedImportRecords {
  if (!Array.isArray(value)) return { patterns: [], skipped: 0 };
  const parsed = value.map(parsePattern);
  return {
    patterns: parsed.filter((pattern): pattern is Pattern => pattern !== null),
    skipped: parsed.filter((pattern) => pattern === null).length,
  };
}

function contributors(pattern: Pattern): string[] {
  return pattern.mergedIds?.length ? pattern.mergedIds : [pattern.id];
}

/** Merge duplicates by sequence while making repeated imports of the same records idempotent. */
export function mergePatterns(incoming: Pattern[], existing: Pattern[]): Pattern[] {
  const byKey = new Map<string, Pattern>();
  const identities = new Map<string, string>();
  for (const pattern of [...existing, ...incoming]) {
    const key = patternKey(pattern.dotSequence);
    for (const id of [pattern.id, ...contributors(pattern)]) {
      const previousKey = identities.get(id);
      if (previousKey !== undefined && previousKey !== key) {
        throw new Error('Import stopped: the same record ID is used for different patterns.');
      }
      identities.set(id, key);
    }
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...pattern, ...(pattern.mergedIds ? { mergedIds: contributors(pattern) } : {}) });
      continue;
    }
    const currentIds = contributors(current);
    const nextIds = contributors(pattern);
    const novelIds = nextIds.filter((id) => !currentIds.includes(id));
    const overlapIds = nextIds.some((id) => currentIds.includes(id));
    const sameIdentity = novelIds.length === 0;
    const incomingIsNewer = (pattern.lastAttemptAt ?? pattern.timestamp) > (current.lastAttemptAt ?? current.timestamp)
      || pattern.attemptCount > current.attemptCount;
    const preferred = sameIdentity && incomingIsNewer ? pattern : current;
    const additionalCount = sameIdentity ? 0 : pattern.attemptCount;
    const additionalOutcomes = sameIdentity ? [] : pattern.outcomes;
    const mergedIds = [...new Set([...currentIds, ...nextIds])];
    const totalCount = sameIdentity || overlapIds
      ? Math.max(current.attemptCount, pattern.attemptCount)
      : current.attemptCount + additionalCount;
    const outcomes = sameIdentity || overlapIds
      ? pattern.outcomes.length > current.outcomes.length ? pattern.outcomes : current.outcomes
      : [...current.outcomes, ...additionalOutcomes];
    const freshest = incomingIsNewer ? pattern : current;
    byKey.set(key, {
      ...preferred,
      ...freshest,
      id: current.id,
      ...((freshest.note || current.note || pattern.note) ? { note: freshest.note || current.note || pattern.note } : {}),
      attemptCount: totalCount,
      outcomes,
      ...(Math.max(current.lastAttemptAt ?? 0, pattern.lastAttemptAt ?? 0) ? { lastAttemptAt: Math.max(current.lastAttemptAt ?? 0, pattern.lastAttemptAt ?? 0) } : {}),
      ...(mergedIds.length > 1 || current.mergedIds || pattern.mergedIds ? { mergedIds } : {}),
    });
  }
  return [...byKey.values()].sort((a, b) => b.timestamp - a.timestamp);
}
