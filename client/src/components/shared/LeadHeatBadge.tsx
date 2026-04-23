import { Flame, ThermometerSun, Minus, Snowflake } from "lucide-react";
import { LEAD_HEAT_COLORS } from "../../lib/monday-palette";
import { cn } from "../../lib/utils";

export type LeadHeat = "HOT" | "WARM" | "LUKEWARM" | "COLD" | "FROZEN";

interface LeadHeatConfig {
  label: string;
  hebrewLabel: string;
  color: string;
  icon: React.ReactNode;
  emoji: string;
}

/**
 * Lead heat config — Monday-style full-color badges.
 * Palette mirrors monday-palette.ts (red / orange / yellow / blue / gray).
 */
const HEAT_CONFIG: Record<LeadHeat, LeadHeatConfig> = {
  HOT: {
    label: "Hot",
    hebrewLabel: "בוער",
    color: LEAD_HEAT_COLORS.HOT, // #E2445C
    icon: <Flame size={12} />,
    emoji: "🔥",
  },
  WARM: {
    label: "Warm",
    hebrewLabel: "חם",
    color: LEAD_HEAT_COLORS.WARM, // #FF642E
    icon: <ThermometerSun size={12} />,
    emoji: "☀️",
  },
  LUKEWARM: {
    label: "Lukewarm",
    hebrewLabel: "פושר",
    color: LEAD_HEAT_COLORS.LUKEWARM, // #FDAB3D
    icon: <Minus size={12} />,
    emoji: "🌤️",
  },
  COLD: {
    label: "Cold",
    hebrewLabel: "קר",
    color: LEAD_HEAT_COLORS.COLD, // #579BFC
    icon: <Snowflake size={12} />,
    emoji: "❄️",
  },
  FROZEN: {
    label: "Frozen",
    hebrewLabel: "קפוא",
    color: LEAD_HEAT_COLORS.FROZEN, // #808080
    icon: <Snowflake size={12} />,
    emoji: "🧊",
  },
};

export type LeadHeatBadgeVariant = "pill" | "cell" | "tag";

interface LeadHeatBadgeProps {
  heat: LeadHeat | null | undefined;
  size?: "sm" | "md";
  variant?: LeadHeatBadgeVariant;
  showLabel?: boolean;
  onClick?: () => void;
}

/**
 * Monday-style lead heat badge (full color bg, white text).
 * Variants match StatusBadge: `pill` (default), `cell` (full-bleed), `tag`.
 */
export default function LeadHeatBadge({
  heat,
  size = "sm",
  variant = "pill",
  showLabel = true,
  onClick,
}: LeadHeatBadgeProps) {
  if (!heat) return null;
  const config = HEAT_CONFIG[heat];
  if (!config) return null;

  const base =
    "inline-flex items-center justify-center gap-1 font-medium text-white select-none transition-[filter] whitespace-nowrap";

  const variantClasses =
    variant === "cell"
      ? "w-full h-full min-h-[36px] px-2 text-[13px]"
      : variant === "tag"
        ? size === "sm"
          ? "text-[11px] px-2 py-[2px] rounded-[3px]"
          : "text-[12px] px-2.5 py-[3px] rounded-[3px]"
        : size === "sm"
          ? "text-[11px] px-2.5 py-[3px] rounded-full"
          : "text-[12px] px-3 py-1 rounded-full";

  const interactive = onClick && "cursor-pointer hover:brightness-95";

  return (
    <span
      className={cn(base, variantClasses, interactive)}
      style={{ backgroundColor: config.color }}
      title={config.label}
      onClick={onClick}
      {...(onClick
        ? {
            role: "button" as const,
            tabIndex: 0,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
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

/** Inline heat picker for editing — Monday-style buttons (flat, vibrant). */
interface LeadHeatPickerProps {
  value: LeadHeat | null;
  onChange: (heat: LeadHeat | null) => void;
}

export function LeadHeatPicker({ value, onChange }: LeadHeatPickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="חום ליד">
      {(Object.entries(HEAT_CONFIG) as [LeadHeat, LeadHeatConfig][]).map(
        ([heat, cfg]) => {
          const isActive = value === heat;
          return (
            <button
              key={heat}
              onClick={() => onChange(isActive ? null : heat)}
              aria-pressed={isActive}
              aria-label={cfg.hebrewLabel}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium transition-[filter,opacity]",
                isActive
                  ? "text-white hover:brightness-95"
                  : "text-white opacity-35 hover:opacity-60",
              )}
              style={{ backgroundColor: cfg.color }}
              title={cfg.label}
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.hebrewLabel}</span>
            </button>
          );
        },
      )}
    </div>
  );
}
