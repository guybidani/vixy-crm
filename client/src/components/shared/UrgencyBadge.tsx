import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";

export type UrgencyLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface UrgencyConfig {
  label: string;
  hebrewLabel: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  CRITICAL: {
    label: "Critical",
    hebrewLabel: "דחוף מאוד",
    color: "#E44258",
    bgColor: "#FFE5EA",
    icon: <AlertTriangle size={12} />,
  },
  HIGH: {
    label: "High",
    hebrewLabel: "דחוף",
    color: "#FF7A00",
    bgColor: "#FFF0E5",
    icon: <ArrowUp size={12} />,
  },
  MEDIUM: {
    label: "Medium",
    hebrewLabel: "בינוני",
    color: "#FDAB3D",
    bgColor: "#FFF6E5",
    icon: <Minus size={12} />,
  },
  LOW: {
    label: "Low",
    hebrewLabel: "נמוך",
    color: "#A8B9CC",
    bgColor: "#EDF2F7",
    icon: <ArrowDown size={12} />,
  },
};

interface UrgencyBadgeProps {
  urgency: UrgencyLevel | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function UrgencyBadge({
  urgency,
  size = "sm",
  showLabel = true,
}: UrgencyBadgeProps) {
  if (!urgency) return null;
  const config = URGENCY_CONFIG[urgency];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
      style={{ color: config.color, backgroundColor: config.bgColor }}
      title={config.label}
    >
      {config.icon}
      {showLabel && <span>{config.hebrewLabel}</span>}
    </span>
  );
}

/** Inline urgency selector */
interface UrgencyPickerProps {
  value: UrgencyLevel | null;
  onChange: (level: UrgencyLevel) => void;
}

export function UrgencyPicker({ value, onChange }: UrgencyPickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="רמת דחיפות">
      {(Object.entries(URGENCY_CONFIG) as [UrgencyLevel, UrgencyConfig][]).map(
        ([level, cfg]) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            aria-pressed={value === level}
            aria-label={cfg.hebrewLabel}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all"
            style={
              value === level
                ? { backgroundColor: cfg.color, color: "#fff", borderColor: cfg.color }
                : { backgroundColor: cfg.bgColor, color: cfg.color, borderColor: cfg.color }
            }
          >
            {cfg.icon}
            <span>{cfg.hebrewLabel}</span>
          </button>
        )
      )}
    </div>
  );
}
