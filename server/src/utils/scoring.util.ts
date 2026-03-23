/**
 * Lead scoring rules — maps activity types to point deltas.
 * Pure functions, no side effects, easy to test.
 */

const SCORE_RULES: Record<string, number> = {
  CALL: 10,
  EMAIL: 5,
  MEETING: 20,
  WHATSAPP: 8,
  NOTE: 1,
  STATUS_CHANGE: 0,
  SYSTEM: 0,
};

/** Returns the score delta for a given activity type. Unknown types return 0. */
export function calculateScoreDelta(activityType: string): number {
  return SCORE_RULES[activityType] ?? 0;
}

/** Clamps a score between 0 and 100. */
export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}
