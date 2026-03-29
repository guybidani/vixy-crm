/**
 * Deal Health Score — client-side utility
 *
 * Mirrors the server-side dealHealth.util.ts logic.
 * Used for optimistic display when server health data is unavailable.
 */

import type { Deal } from "../api/deals";

export interface DealHealthResult {
  score: number;
  level: "healthy" | "warning" | "critical";
  label: string;
  color: string;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeDealHealth(deal: Deal, now: Date = new Date()): DealHealthResult {
  let score = 0;

  // Has close date set and it's in the future: +20
  if (deal.expectedClose) {
    const closeDate = new Date(deal.expectedClose);
    if (closeDate > now) {
      score += 20;
      // Bonus: close date within 30 days: +10
      if (daysBetween(now, closeDate) <= 30) {
        score += 10;
      }
    }
  }

  // Has contacts linked: +20
  if (deal.contact) {
    score += 20;
  }

  // Has value > 0: +20
  if (deal.value > 0) {
    score += 20;
  }

  // Has recent activity (within 7 days) or any activity: +20
  if (deal.lastActivityAt) {
    const daysSince = daysBetween(new Date(deal.lastActivityAt), now);
    if (daysSince <= 7) {
      score += 20;
    } else {
      score += 5; // some activity, just not recent
    }
  }

  // Deal stage is advanced (not LEAD): +10
  if (deal.stage !== "LEAD") {
    score += 10;
  }

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    ...classifyScore(score),
  };
}

function classifyScore(score: number): { level: "healthy" | "warning" | "critical"; label: string; color: string } {
  if (score >= 80) return { level: "healthy", label: "בריא", color: "#10B981" };
  if (score >= 50) return { level: "warning", label: "בינוני", color: "#F59E0B" };
  return { level: "critical", label: "בסיכון", color: "#DC2626" };
}
