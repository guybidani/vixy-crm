import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

export type EmptyStateVariant = "default" | "search" | "error" | "success" | "filtered";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface EmptyStateProps {
  /** Inline illustration (preferred) — typically one of `illustrations/*`. */
  illustration?: ReactNode;
  /** Small Lucide icon. Used when no illustration is provided. */
  icon?: ReactNode;
  /** Hebrew heading. */
  title: string;
  /** Optional 1–2 line description. */
  description?: ReactNode;
  /** Primary CTA (Monday blue). */
  action?: EmptyStateAction;
  /** Secondary CTA (ghost). */
  secondaryAction?: EmptyStateAction;
  /** Semantic variant — controls icon tint when no illustration is supplied. */
  variant?: EmptyStateVariant;
  /** Compact padding — useful inside cards / narrow columns. */
  compact?: boolean;
  className?: string;
}

const VARIANT_COLORS: Record<EmptyStateVariant, { fg: string; bgSoft: string }> = {
  default:  { fg: "#0073EA", bgSoft: "rgba(0, 115, 234, 0.10)" },
  search:   { fg: "#0073EA", bgSoft: "rgba(0, 115, 234, 0.10)" },
  filtered: { fg: "#A25DDC", bgSoft: "rgba(162, 93, 220, 0.10)" },
  error:    { fg: "#E44258", bgSoft: "rgba(228, 66, 88, 0.10)" },
  success:  { fg: "#00C875", bgSoft: "rgba(0, 200, 117, 0.10)" },
};

/**
 * Monday.com-style empty state.
 *
 * Pass either `illustration` (a full SVG from `illustrations/`) OR `icon`
 * (a small Lucide icon which we wrap in a colored circle for you).
 */
export default function EmptyState({
  illustration,
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  compact = false,
  className,
}: EmptyStateProps) {
  const palette = VARIANT_COLORS[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-empty-in",
        compact ? "py-10 px-4" : "py-20 px-6",
        className,
      )}
    >
      {illustration ? (
        <div
          className="mb-5 animate-empty-float"
          style={{ willChange: "transform" }}
        >
          {illustration}
        </div>
      ) : icon ? (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: palette.bgSoft, color: palette.fg }}
        >
          {icon}
        </div>
      ) : null}

      <h3 className="text-[20px] font-semibold text-[#323338] mb-1.5 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-[14px] leading-relaxed text-[#676879] max-w-[400px] mb-6">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#0073EA] hover:bg-[#0060C2] active:bg-[#005BB5] text-white text-[13px] font-semibold rounded-[6px] transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 py-2 bg-white hover:bg-[#F5F6F8] text-[#323338] text-[13px] font-semibold rounded-[6px] border border-[#D0D4E4] transition-colors"
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
