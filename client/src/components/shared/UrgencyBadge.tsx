import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { PRIORITY_COLORS, MONDAY_COLORS } from "../../lib/monday-palette";
import { cn } from "../../lib/utils";

export type UrgencyLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface UrgencyConfig {
  label: string;
  hebrewLabel: string;
  color: string;
  icon: React.ReactNode;
}

/**
 * Urgency config — Monday-style full-color palette.
 * Critical=#E2445C (red), High=#FF642E (orange), Medium=#579BFC (dark blue), Low=#C5C7D0 (gray).
 */
export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  CRITICAL: {
    label: "Critical",
    hebrewLabel: "דחוף מאוד",
    color: PRIORITY_COLORS.URGENT, // #E2445C
    icon: <AlertTriangle size={12} />,
  },
  HIGH: {
    label: "High",
    hebrewLabel: "דחוף",
    color: PRIORITY_COLORS.HIGH, // #FF642E
    icon: <ArrowUp size={12} />,
  },
  MEDIUM: {
    label: "Medium",
    hebrewLabel: "בינוני",
    color: PRIORITY_COLORS.MEDIUM, // #579BFC
    icon: <Minus size={12} />,
  },
  LOW: {
    label: "Low",
    hebrewLabel: "נמוך",
    color: PRIORITY_COLORS.LOW, // #C5C7D0
    icon: <ArrowDown size={12} />,
  },
};

export type UrgencyBadgeVariant = "pill" | "cell" | "tag";

interface UrgencyBadgeProps {
  urgency: UrgencyLevel | null | undefined;
  size?: "sm" | "md";
  variant?: UrgencyBadgeVariant;
  showLabel?: boolean;
  onClick?: () => void;
}

/**
 * Monday-style urgency/priority badge — full color bg, white text, flat.
 * Variants: `pill` (default rounded), `cell` (full-bleed table cell), `tag` (rounded square).
 */
export default function UrgencyBadge({
  urgency,
  size = "sm",
  variant = "pill",
  showLabel = true,
  onClick,
}: UrgencyBadgeProps) {
  if (!urgency) return null;
  const config = URGENCY_CONFIG[urgency];
  if (!config) return null;

  // LOW uses a light gray background, so we need dark text for contrast
  const textColorClass =
    urgency === "LOW" ? "text-[#323338]" : "text-white";

  const base = cn(
    "inline-flex items-center justify-center gap-1 font-medium select-none transition-[filter] whitespace-nowrap",
    textColorClass,
  );

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

/** Inline urgency selector — Monday-style vibrant buttons. */
interface UrgencyPickerProps {
  value: UrgencyLevel | null;
  onChange: (level: UrgencyLevel) => void;
}

export function UrgencyPicker({ value, onChange }: UrgencyPickerProps) {
  return (
    <div
      className="flex gap-1.5 flex-wrap"
      role="group"
      aria-label="רמת דחיפות"
    >
      {(Object.entries(URGENCY_CONFIG) as [UrgencyLevel, UrgencyConfig][]).map(
        ([level, cfg]) => {
          const isActive = value === level;
          const isLow = level === "LOW";
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              aria-pressed={isActive}
              aria-label={cfg.hebrewLabel}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium transition-[filter,opacity]",
                isLow ? "text-[#323338]" : "text-white",
                isActive
                  ? "hover:brightness-95"
                  : "opacity-35 hover:opacity-60",
              )}
              style={{
                backgroundColor: cfg.color,
                outline: isActive
                  ? `2px solid ${MONDAY_COLORS.deepBlue}`
                  : undefined,
                outlineOffset: isActive ? "1px" : undefined,
              }}
            >
              {cfg.icon}
              <span>{cfg.hebrewLabel}</span>
            </button>
          );
        },
      )}
    </div>
  );
}
