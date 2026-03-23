/**
 * Deal Health Score Calculator
 *
 * Pure utility — no DB writes, no side effects.
 * Score 0-100 based on activity recency, task scheduling,
 * BANT completion, stage velocity, and engagement.
 */

export interface DealHealthInput {
  /** Date of the most recent activity on the deal */
  lastActivityAt: Date | string | null;
  /** Number of open (non-DONE) tasks linked to this deal */
  openTaskCount: number;
  /** BANT proxy fields — truthy = filled */
  bantFields: {
    budget: boolean;   // deal.value > 0
    authority: boolean; // deal.contactId exists
    need: boolean;      // deal.notes is non-empty
    timeline: boolean;  // deal.expectedClose is set
  };
  /** When the deal last changed stage */
  stageChangedAt: Date | string;
  /** Total activity count in the last 30 days */
  recentActivityCount: number;
}

export interface DealHealthResult {
  score: number;
  level: "healthy" | "warning" | "critical";
  label: string;
  color: string;
  breakdown: DealHealthBreakdown;
}

export interface DealHealthBreakdown {
  activityRecency: { score: number; daysSince: number | null; label: string };
  nextTask: { score: number; hasTask: boolean; label: string };
  bantCompletion: { score: number; filled: number; total: number; label: string };
  stageVelocity: { score: number; daysSinceMove: number; label: string };
  contactEngagement: { score: number; count: number; label: string };
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateDealHealth(input: DealHealthInput, now: Date = new Date()): DealHealthResult {
  const breakdown: DealHealthBreakdown = {
    activityRecency: scoreActivityRecency(input.lastActivityAt, now),
    nextTask: scoreNextTask(input.openTaskCount),
    bantCompletion: scoreBant(input.bantFields),
    stageVelocity: scoreStageVelocity(input.stageChangedAt, now),
    contactEngagement: scoreEngagement(input.recentActivityCount),
  };

  const score = Math.min(
    100,
    Math.max(
      0,
      breakdown.activityRecency.score +
        breakdown.nextTask.score +
        breakdown.bantCompletion.score +
        breakdown.stageVelocity.score +
        breakdown.contactEngagement.score,
    ),
  );

  const { level, label, color } = classifyScore(score);

  return { score, level, label, color, breakdown };
}

// ── Scoring components ──────────────────────────────

function scoreActivityRecency(
  lastActivityAt: Date | string | null,
  now: Date,
): DealHealthBreakdown["activityRecency"] {
  if (!lastActivityAt) {
    return { score: 0, daysSince: null, label: "אין פעילות" };
  }
  const days = daysBetween(new Date(lastActivityAt), now);
  if (days <= 3) return { score: 30, daysSince: days, label: `לפני ${days} ימים` };
  if (days <= 7) return { score: 20, daysSince: days, label: `לפני ${days} ימים` };
  if (days <= 14) return { score: 10, daysSince: days, label: `לפני ${days} ימים` };
  return { score: 0, daysSince: days, label: `לפני ${days} ימים` };
}

function scoreNextTask(
  openTaskCount: number,
): DealHealthBreakdown["nextTask"] {
  const hasTask = openTaskCount > 0;
  return {
    score: hasTask ? 20 : 0,
    hasTask,
    label: hasTask ? `${openTaskCount} משימות פתוחות` : "אין משימה הבאה",
  };
}

function scoreBant(
  fields: DealHealthInput["bantFields"],
): DealHealthBreakdown["bantCompletion"] {
  const filled = [fields.budget, fields.authority, fields.need, fields.timeline].filter(Boolean).length;
  return {
    score: filled * 5,
    filled,
    total: 4,
    label: `${filled}/4 שדות BANT`,
  };
}

function scoreStageVelocity(
  stageChangedAt: Date | string,
  now: Date,
): DealHealthBreakdown["stageVelocity"] {
  const days = daysBetween(new Date(stageChangedAt), now);
  if (days <= 14) return { score: 15, daysSinceMove: days, label: `זז לפני ${days} ימים` };
  if (days <= 30) return { score: 10, daysSinceMove: days, label: `זז לפני ${days} ימים` };
  return { score: 0, daysSinceMove: days, label: `זז לפני ${days} ימים` };
}

function scoreEngagement(
  recentActivityCount: number,
): DealHealthBreakdown["contactEngagement"] {
  let score: number;
  if (recentActivityCount >= 5) score = 15;
  else if (recentActivityCount >= 3) score = 10;
  else if (recentActivityCount >= 1) score = 5;
  else score = 0;

  return {
    score,
    count: recentActivityCount,
    label: `${recentActivityCount} פעילויות (30 יום)`,
  };
}

// ── Classification ──────────────────────────────────

function classifyScore(score: number): { level: "healthy" | "warning" | "critical"; label: string; color: string } {
  if (score >= 70) return { level: "healthy", label: "בריא", color: "#10B981" };
  if (score >= 40) return { level: "warning", label: "דורש תשומת לב", color: "#F59E0B" };
  return { level: "critical", label: "בסיכון", color: "#DC2626" };
}
