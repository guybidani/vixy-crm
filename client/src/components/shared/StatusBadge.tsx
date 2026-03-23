import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  label: string;
  color: string;
  size?: "sm" | "md";
  onClick?: () => void;
}

export default function StatusBadge({
  label,
  color,
  size = "sm",
  onClick,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full select-none transition-all",
        size === "sm"
          ? "text-[11px] px-3 py-[3px] min-w-[56px]"
          : "text-xs px-4 py-1 min-w-[72px]",
        onClick &&
          "cursor-pointer hover:opacity-85 hover:shadow-sm active:scale-95",
      )}
      style={{
        backgroundColor: color,
        color: "#fff",
      }}
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
      {label}
    </span>
  );
}
