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

  // Ctrl+K = QuickAdd, Ctrl+Shift+K = CommandPalette
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (e.shiftKey) {
          onCommandPalette();
        } else {
          onQuickAdd();
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
        "right-0 md:right-60",
        sidebarCollapsed && "md:right-16",
      )}
    >
      {/* Search — desktop: always visible, mobile: icon toggles input */}
      <div className="flex-1 max-w-lg">
        {/* Desktop search (hidden on < 640px) */}
        <div className="relative hidden sm:block">
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

        {/* Mobile search: icon-only, expands on tap */}
        <div className="sm:hidden">
          {mobileSearchOpen ? (
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(e.target.value.length >= 2);
                }}
                onBlur={() => {
                  if (!searchQuery) setMobileSearchOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    setShowSearch(false);
                    setMobileSearchOpen(false);
                  }
                }}
                placeholder="חיפוש..."
                aria-label="חיפוש גלובלי"
                className="w-full pr-9 pl-4 py-2 bg-surface-secondary rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
              />
              {showSearch && searchQuery.length >= 2 && (
                <SearchDropdown
                  query={searchQuery}
                  onClose={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                    setMobileSearchOpen(false);
                  }}
                />
              )}
            </div>
          ) : (
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary"
              aria-label="חיפוש"
            >
              <Search size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <button
        onClick={onQuickAdd}
        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        title="הוספה מהירה (Ctrl+K)"
        aria-label="הוספה מהירה (Ctrl+K)"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">חדש</span>
      </button>

      {/* Today's Tasks Clock */}
      <button
        onClick={() => setTodayTasksOpen(true)}
        className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary hover:text-[#0073EA]"
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

      {/* Notifications */}
      <NotificationCenter />

      {/* User */}
      <div className="flex items-center gap-2 border-r border-border-light pr-2 sm:pr-3">
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

      {/* Mobile hamburger */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary md:hidden"
          aria-label="תפריט"
        >
          <Menu size={20} />
        </button>
      )}
    </header>

    {/* Today's Tasks Panel */}
    {todayTasksOpen && (
      <TodayTasksPanel onClose={() => setTodayTasksOpen(false)} />
    )}
  </>
  );
}
