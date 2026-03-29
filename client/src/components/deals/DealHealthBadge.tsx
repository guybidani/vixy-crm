import type { DealHealth } from "../../api/deals";
import type { DealHealthResult } from "../../lib/dealHealth";

type HealthData = DealHealth | DealHealthResult;

interface DealHealthBadgeProps {
  health: HealthData;
  /** Show score number alongside label. Default: true */
  showScore?: boolean;
}

/**
 * Pill badge displaying deal health score + label.
 *
 * Score 80-100: green  "בריא"
 * Score 50-79:  yellow "בינוני"
 * Score 0-49:   red    "בסיכון"
 */
export default function DealHealthBadge({ health, showScore = true }: DealHealthBadgeProps) {
  const bgMap: Record<string, string> = {
    "#10B981": "#ECFDF5",
    "#F59E0B": "#FFFBEB",
    "#DC2626": "#FEF2F2",
  };

  const bg = bgMap[health.color] ?? "#F5F6F8";

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: health.color }}
    >
      {showScore && <span className="font-bold">{health.score}</span>}
      <span>{health.label}</span>
    </span>
  );
}
