import { useState, useEffect, useRef } from "react";
import { Search, Plus, LogOut, Menu, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import NotificationCenter from "./NotificationCenter";
import SearchDropdown from "./SearchDropdown";
import TodayTasksPanel from "./TodayTasksPanel";
import { getTaskStats } from "../../api/tasks";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onQuickAdd: () => void;
  onCommandPalette: () => void;
  onMobileMenuToggle?: () => void;
}

export default function Header({ sidebarCollapsed, onQuickAdd, onCommandPalette, onMobileMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [todayTasksOpen, setTodayTasksOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Badge: overdue + due today count
  const { data: taskStats } = useQuery({
    queryKey: ["task-stats-header"],
    queryFn: () => getTaskStats(true),
    refetchInterval: 60_000,
  });
  const badgeCount = (taskStats?.overdueCount ?? 0) + (taskStats?.dueTodayCount ?? 0);

  // Ctrl+K = GlobalSearch, Ctrl+Shift+K = QuickAdd
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (e.shiftKey) {
          onQuickAdd();
        } else {
          onCommandPalette();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onQuickAdd, onCommandPalette]);

  // Focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);

  return (
    <>
    <header
      className={cn(
        "fixed top-0 left-0 h-14 bg-white z-30 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
        // Mobile: full width. Desktop: offset by sidebar
        "right-0 md:right-[220px]",
        sidebarCollapsed && "md:right-14",
      )}
    >
      {/* Mobile hamburger — leftmost on mobile, hidden on desktop */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary md:hidden flex-shrink-0"
          aria-label="תפריט"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Logo / brand — visible on mobile only (desktop sidebar has it) */}
      <div className="flex items-center gap-1.5 md:hidden flex-shrink-0">
        <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm">V</span>
        </div>
      </div>

      {/* Spacer on mobile so icons cluster to the right */}
      <div className="flex-1 md:hidden" />

      {/* Search — desktop: always visible, mobile: hidden */}
      <div className="hidden sm:flex flex-1 max-w-lg">
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(e.target.value.length >= 2);
            }}
            onFocus={() => {
              if (searchQuery.length >= 2) setShowSearch(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                setShowSearch(false);
              }
            }}
            placeholder="חיפוש אנשי קשר, עסקאות, פניות..."
            aria-label="חיפוש גלובלי"
            className="w-full pr-9 pl-4 py-2 bg-surface-secondary rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          />
          {showSearch && searchQuery.length >= 2 && (
            <SearchDropdown
              query={searchQuery}
              onClose={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
            />
          )}
        </div>
      </div>

      {/* Quick Add — hidden on mobile */}
      <button
        onClick={onQuickAdd}
        className="hidden sm:flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        title="הוספה מהירה (Ctrl+Shift+K)"
        aria-label="הוספה מהירה (Ctrl+Shift+K)"
      >
        <Plus size={16} />
        <span>חדש</span>
      </button>

      {/* Today's Tasks Clock — always visible */}
      <button
        onClick={() => setTodayTasksOpen(true)}
        className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary hover:text-[#0073EA] flex-shrink-0"
        title="משימות להיום"
        aria-label="משימות להיום"
      >
        <Clock size={18} />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#D83A52] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {/* Notifications — always visible */}
      <NotificationCenter />

      {/* User — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 border-r border-border-light pr-2 sm:pr-3">
        <div
          className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
          role="img"
          aria-label={user?.name || "משתמש"}
        >
          <span className="text-white text-xs font-bold">
            {user?.name?.charAt(0) || "?"}
          </span>
        </div>
        <span className="text-sm text-text-primary font-medium hidden md:block">
          {user?.name}
        </span>
        <button
          onClick={logout}
          className="p-1.5 rounded hover:bg-surface-secondary transition-colors text-text-tertiary hover:text-danger"
          title="יציאה"
          aria-label="יציאה מהמערכת"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>

    {/* Today's Tasks Panel */}
    {todayTasksOpen && (
      <TodayTasksPanel onClose={() => setTodayTasksOpen(false)} />
    )}
  </>
  );
}
