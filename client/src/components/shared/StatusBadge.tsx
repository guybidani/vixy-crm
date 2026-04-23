import { cn } from "../../lib/utils";

export type StatusBadgeVariant = "pill" | "cell" | "tag";

interface StatusBadgeProps {
  label: string;
  color: string;
  /**
   * Visual variant.
   * - `pill` (default): rounded-full Monday-style status pill for use inline (cards, panels, chips).
   * - `cell`: full-bleed variant that fills a table cell edge-to-edge with no padding.
   * - `tag`: small rounded-square tag (like Monday labels in filters).
   */
  variant?: StatusBadgeVariant;
  size?: "sm" | "md";
  onClick?: () => void;
  "aria-haspopup"?: React.AriaAttributes["aria-haspopup"];
  "aria-expanded"?: boolean;
}

/**
 * Monday.com-style status badge.
 *
 * Design tokens:
 * - Full color background (vibrant, not pastel)
 * - White text always, medium weight (500)
 * - No border, no shadow (flat)
 * - Hover: brightness(0.95) for clickable; no effect otherwise
 * - Font size 12-13px
 */
export default function StatusBadge({
  label,
  color,
  variant = "pill",
  size = "sm",
  onClick,
  "aria-haspopup": ariaHasPopup,
  "aria-expanded": ariaExpanded,
}: StatusBadgeProps) {
  const base =
    "inline-flex items-center justify-center font-medium text-white select-none transition-[filter] whitespace-nowrap";

  const variantClasses =
    variant === "cell"
      ? // Full-bleed table cell: fills entire cell, no rounding, no padding
        "w-full h-full min-h-[36px] px-2 text-[13px] text-center"
      : variant === "tag"
        ? // Small rounded-square Monday tag
          size === "sm"
          ? "text-[11px] px-2 py-[2px] rounded-[3px] min-w-[48px]"
          : "text-[12px] px-2.5 py-[3px] rounded-[3px] min-w-[60px]"
        : // Default pill
          size === "sm"
          ? "text-[12px] leading-[18px] px-3 py-[3px] rounded-full min-w-[56px]"
          : "text-[13px] leading-[20px] px-4 py-1 rounded-full min-w-[72px]";

  const interactive =
    onClick && "cursor-pointer hover:brightness-95 active:brightness-90";

  return (
    <span
      className={cn(base, variantClasses, interactive)}
      style={{ backgroundColor: color }}
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
            ...(ariaHasPopup != null ? { "aria-haspopup": ariaHasPopup } : {}),
            ...(ariaExpanded != null ? { "aria-expanded": ariaExpanded } : {}),
          }
        : {})}
    >
      {label}
    </span>
  );
}
