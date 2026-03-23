export interface UrgencyResult {
  score: number; // 0-100
  level: "low" | "medium" | "high" | "critical";
  label: string; // Hebrew
  color: string; // hex
}

const PRIORITY_BASE: Record<string, number> = {
  LOW: 20,
  MEDIUM: 40,
  HIGH: 65,
  URGENT: 85,
};

const LEVEL_CONFIG: {
  maxScore: number;
  level: UrgencyResult["level"];
  label: string;
  color: string;
}[] = [
  { maxScore: 25, level: "low", label: "נמוך", color: "#10B981" },
  { maxScore: 50, level: "medium", label: "בינוני", color: "#F59E0B" },
  { maxScore: 75, level: "high", label: "גבוה", color: "#F97316" },
  { maxScore: 100, level: "critical", label: "קריטי", color: "#DC2626" },
];

export function calculateUrgency(
  ticket: {
    priority: string;
    createdAt: Date;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    status: string;
  },
  slaPolicy?: {
    firstResponseMinutes: number;
    resolutionMinutes: number;
  } | null,
): UrgencyResult {
  // Base score from priority
  let score = PRIORITY_BASE[ticket.priority] ?? 40;

  // SLA multiplier
  if (slaPolicy) {
    const now = Date.now();
    const createdMs = ticket.createdAt.getTime();
    const elapsedMinutes = (now - createdMs) / 60_000;

    // Pick the relevant SLA target: response if not yet responded, resolution if not yet resolved
    let slaMinutes: number | null = null;
    if (!ticket.firstResponseAt) {
      slaMinutes = slaPolicy.firstResponseMinutes;
    } else if (!ticket.resolvedAt && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
      slaMinutes = slaPolicy.resolutionMinutes;
    }

    if (slaMinutes !== null) {
      const slaRatio = elapsedMinutes / slaMinutes;
      if (slaRatio > 1) {
        // SLA breached
        score *= 1.6;
      } else if (slaRatio > 0.75) {
        // >75% of SLA time used
        score *= 1.3;
      }
    }
  }

  // Age penalty: +2 per hour without first response, max +20
  if (!ticket.firstResponseAt && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    const hoursWithoutResponse =
      (Date.now() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
    score += Math.min(20, Math.floor(hoursWithoutResponse) * 2);
  }

  // Clamp 0-100
  score = Math.round(Math.max(0, Math.min(100, score)));

  // Determine level
  const config =
    LEVEL_CONFIG.find((c) => score <= c.maxScore) ??
    LEVEL_CONFIG[LEVEL_CONFIG.length - 1];

  return {
    score,
    level: config.level,
    label: config.label,
    color: config.color,
  };
}
