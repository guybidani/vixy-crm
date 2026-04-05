import { cn } from "../../lib/utils";
import { Star, MoreHorizontal, ChevronDown } from "lucide-react";
import { useState } from "react";

interface PageShellProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Optional emoji/icon for Monday-style board header */
  emoji?: string;
  /** View tabs (like Monday's Table/Kanban/Map) */
  views?: Array<{ key: string; label: string; icon?: React.ReactNode }>;
  activeView?: string;
  onViewChange?: (key: string) => void;
  /** Show Monday-style board header instead of simple header */
  boardStyle?: boolean;
}

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  emoji,
  views,
  activeView,
  onViewChange,
  boardStyle,
}: PageShellProps) {
  const [starred, setStarred] = useState(false);

  if (boardStyle) {
    return (
      <div className="flex flex-col -mx-3 sm:-mx-6 -mt-3 sm:-mt-6">
        {/* Monday-style board header */}
        <div className="bg-white border-b border-[#E6E9EF] px-6 pt-5 pb-0">
          {/* Board title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {emoji && (
                <span className="text-2xl leading-none select-none">{emoji}</span>
              )}
              <h1 className="text-[22px] font-bold text-[#323338] leading-tight truncate">
                {title}
              </h1>
              <button
                onClick={() => setStarred((v) => !v)}
                aria-label={starred ? "הסר מועדפים" : "הוסף למועדפים"}
                className={cn(
                  "p-1 rounded transition-colors flex-shrink-0",
                  starred ? "text-[#FDAB3D]" : "text-[#C3C6D4] hover:text-[#9699A6]"
                )}
              >
                <Star size={16} fill={starred ? "currentColor" : "none"} strokeWidth={1.5} />
              </button>
              <button
                aria-label="אפשרויות לוח"
                className="p-1 rounded text-[#C3C6D4] hover:text-[#9699A6] transition-colors flex-shrink-0"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
            )}
          </div>
          {subtitle && (
            <p className="text-[13px] text-[#676879] mb-3">{subtitle}</p>
          )}

          {/* View tabs */}
          {views && views.length > 0 && (
            <div className="flex items-center gap-0 -mb-px">
              {views.map((view) => (
                <button
                  key={view.key}
                  onClick={() => onViewChange?.(view.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-[2px] -mb-px whitespace-nowrap",
                    activeView === view.key
                      ? "text-[#0073EA] border-[#0073EA]"
                      : "text-[#676879] border-transparent hover:text-[#323338] hover:bg-[#F5F6F8]"
                  )}
                >
                  {view.icon}
                  {view.label}
                </button>
              ))}
              <span
                aria-hidden="true"
                className="flex items-center gap-1 px-3 py-2.5 text-[13px] text-[#C3C6D4] select-none"
                title="בקרוב"
              >
                <span>+</span>
              </span>
            </div>
          )}
        </div>

        {/* Page content */}
        <div className="px-6 py-5">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#323338]">{title}</h1>
          {subtitle && (
            <p className="text-[13px] text-[#676879] mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}

export function PageCard({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)]", className)}>
      {title && (
        <div className="px-5 py-3.5 border-b border-[#E6E9EF]">
          <h3 className="text-[14px] font-semibold text-[#323338]">{title}</h3>
        </div>
      )}
      <div className={cn("p-5", !title && "")}>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-[#F5F6F8] rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-[#323338] mb-1">{title}</h3>
      <p className="text-[13px] text-[#676879] max-w-md mb-4">{description}</p>
      {action}
    </div>
  );
}

/* Monday-style section divider with label */
export function BoardSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-[#323338] mb-2 hover:opacity-70 transition-opacity"
      >
        <ChevronDown
          size={16}
          className={cn("transition-transform", collapsed && "-rotate-90")}
        />
        {label}
      </button>
      {!collapsed && children}
    </div>
  );
}
