import type { UrgencyComputed } from "../../api/tickets";

interface UrgencyScoreBadgeProps {
  urgency: UrgencyComputed | null | undefined;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

export default function UrgencyScoreBadge({
  urgency,
  size = "sm",
  showScore = true,
}: UrgencyScoreBadgeProps) {
  if (!urgency) return null;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-2",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const dotSize = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]}`}
      style={{
        color: urgency.color,
        backgroundColor: `${urgency.color}15`,
      }}
    >
      <span
        className={`${dotSize[size]} rounded-full flex-shrink-0`}
        style={{ backgroundColor: urgency.color }}
      />
      <span>{urgency.label}</span>
      {showScore && (
        <span
          className="font-bold opacity-70"
          style={{ fontSize: size === "sm" ? "9px" : undefined }}
        >
          {urgency.score}
        </span>
      )}
    </span>
  );
}

/** Returns the border color for a ticket row based on urgency */
export function getUrgencyBorderColor(
  urgency: UrgencyComputed | null | undefined,
): string {
  return urgency?.color ?? "transparent";
}
