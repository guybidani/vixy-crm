import { cn } from "../../lib/utils";

interface TagBadgeProps {
  name: string;
  color: string;
  /**
   * - `solid` (default): Monday full-color tag (white text, flat, rounded-[3px]).
   * - `subtle`: light tinted background with colored text — legacy behavior for
   *   places where a solid pill would be too visually loud (e.g. chip clouds).
   */
  variant?: "solid" | "subtle";
  size?: "sm" | "md";
  onClick?: () => void;
}

/**
 * Monday-style tag. Defaults to solid (white-on-color) to match status pills.
 */
export default function TagBadge({
  name,
  color,
  variant = "solid",
  size = "sm",
  onClick,
}: TagBadgeProps) {
  const sizeClass =
    size === "sm"
      ? "text-[11px] px-2 py-[2px]"
      : "text-[12px] px-2.5 py-[3px]";

  if (variant === "subtle") {
    return (
      <span
        className={cn(
          "inline-flex items-center font-medium rounded-full transition-[filter]",
          sizeClass,
          onClick && "cursor-pointer hover:brightness-95",
        )}
        style={{
          backgroundColor: `${color}20`,
          color,
        }}
        onClick={onClick}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-[3px] text-white transition-[filter] whitespace-nowrap select-none",
        sizeClass,
        onClick && "cursor-pointer hover:brightness-95",
      )}
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      {name}
    </span>
  );
}
