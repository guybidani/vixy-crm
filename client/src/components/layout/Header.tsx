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
        "fixed top-0 left-0 h-14 bg-white z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 transition-all duration-200 border-b border-[#E6E9EF]",
        // Mobile: full width. Desktop: offset by sidebar
        "right-0 md:right-[220px]",
        sidebarCollapsed && "md:right-12",
      )}
    >
      {/* Mobile hamburger — leftmost on mobile, hidden on desktop */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#9699A6] md:hidden flex-shrink-0"
          aria-label="תפריט"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Logo / brand — visible on mobile only (desktop sidebar has it) */}
      <div className="flex items-center gap-1.5 md:hidden flex-shrink-0">
        <div className="w-7 h-7 bg-gradient-to-br from-[#0073EA] to-[#0060C2] rounded-[4px] flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm">V</span>
        </div>
      </div>

      {/* Spacer on mobile so icons cluster to the right */}
      <div className="flex-1 md:hidden" />

      {/* Search — desktop: always visible, mobile: hidden */}
      <div className="hidden sm:flex flex-1 max-w-[400px]">
        <div className="relative w-full">
          <Search
            size={15}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#676879]"
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
            placeholder="חיפוש..."
            aria-label="חיפוש גלובלי"
            className="w-full pr-8 pl-3 py-[6px] text-[13px] bg-[#F5F6F8] border border-[#E6E9EF] rounded-[4px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]/20 focus:bg-white transition-all"
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
        className="hidden sm:flex items-center gap-1 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
        title="הוספה מהירה (Ctrl+Shift+K)"
        aria-label="הוספה מהירה (Ctrl+Shift+K)"
      >
        <Plus size={15} strokeWidth={2.5} />
        <span>חדש</span>
      </button>

      {/* Today's Tasks Clock — always visible */}
      <button
        onClick={() => setTodayTasksOpen(true)}
        className="relative p-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#9699A6] hover:text-[#0073EA] flex-shrink-0"
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
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={logout}
          className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#676879] hover:text-[#D83A52]"
          title="יציאה"
          aria-label="יציאה מהמערכת"
        >
          <LogOut size={15} />
        </button>
        <div
          className="w-7 h-7 bg-[#0073EA] rounded-full flex items-center justify-center cursor-pointer"
          role="img"
          aria-label={user?.name || "משתמש"}
        >
          <span className="text-white text-[11px] font-bold">
            {user?.name?.charAt(0) || "?"}
          </span>
        </div>
      </div>
    </header>

    {/* Today's Tasks Panel */}
    {todayTasksOpen && (
      <TodayTasksPanel onClose={() => setTodayTasksOpen(false)} />
    )}
  </>
  );
}
