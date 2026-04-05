import { Flame, ThermometerSun, Minus, Snowflake } from "lucide-react";

export type LeadHeat = "HOT" | "WARM" | "LUKEWARM" | "COLD" | "FROZEN";

interface LeadHeatConfig {
  label: string;
  hebrewLabel: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  emoji: string;
}

const HEAT_CONFIG: Record<LeadHeat, LeadHeatConfig> = {
  HOT: {
    label: "Hot",
    hebrewLabel: "בוער 🔥",
    color: "#E44258",
    bgColor: "#FFE5EA",
    icon: <Flame size={12} />,
    emoji: "🔥",
  },
  WARM: {
    label: "Warm",
    hebrewLabel: "חם",
    color: "#FF7A00",
    bgColor: "#FFF0E5",
    icon: <ThermometerSun size={12} />,
    emoji: "☀️",
  },
  LUKEWARM: {
    label: "Lukewarm",
    hebrewLabel: "פושר",
    color: "#FDAB3D",
    bgColor: "#FFF6E5",
    icon: <Minus size={12} />,
    emoji: "🌤️",
  },
  COLD: {
    label: "Cold",
    hebrewLabel: "קר",
    color: "#579BFC",
    bgColor: "#E5F0FF",
    icon: <Snowflake size={12} />,
    emoji: "❄️",
  },
  FROZEN: {
    label: "Frozen",
    hebrewLabel: "קפוא",
    color: "#A8B9CC",
    bgColor: "#EDF2F7",
    icon: <Snowflake size={12} />,
    emoji: "🧊",
  },
};

interface LeadHeatBadgeProps {
  heat: LeadHeat | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function LeadHeatBadge({ heat, size = "sm", showLabel = true }: LeadHeatBadgeProps) {
  if (!heat) return null;
  const config = HEAT_CONFIG[heat];
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

/** Derive lead heat from a 0-100 score */
export function heatFromScore(score: number): LeadHeat {
  if (score >= 80) return "HOT";
  if (score >= 60) return "WARM";
  if (score >= 40) return "LUKEWARM";
  if (score >= 20) return "COLD";
  return "FROZEN";
}

/** Inline heat picker for editing */
interface LeadHeatPickerProps {
  value: LeadHeat | null;
  onChange: (heat: LeadHeat | null) => void;
}

export function LeadHeatPicker({ value, onChange }: LeadHeatPickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="חום ליד">
      {(Object.entries(HEAT_CONFIG) as [LeadHeat, LeadHeatConfig][]).map(([heat, cfg]) => (
        <button
          key={heat}
          onClick={() => onChange(value === heat ? null : heat)}
          aria-pressed={value === heat}
          aria-label={cfg.hebrewLabel}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all"
          style={
            value === heat
              ? { backgroundColor: cfg.color, color: "#fff", borderColor: cfg.color }
              : { backgroundColor: cfg.bgColor, color: cfg.color, borderColor: cfg.color }
          }
          title={cfg.label}
        >
          <span>{cfg.emoji}</span>
          <span>{cfg.hebrewLabel}</span>
        </button>
      ))}
    </div>
  );
}
