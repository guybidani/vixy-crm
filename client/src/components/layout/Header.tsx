import { useState, useEffect } from "react";
import { Search, Plus, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import NotificationCenter from "./NotificationCenter";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onQuickAdd: () => void;
}

export default function Header({ sidebarCollapsed, onQuickAdd }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onQuickAdd();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onQuickAdd]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 h-14 bg-white z-30 flex items-center gap-4 px-4 transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
        sidebarCollapsed ? "right-16" : "right-60",
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchQuery("");
            }}
            placeholder="חיפוש אנשי קשר, עסקאות, פניות..."
            aria-label="חיפוש גלובלי"
            className="w-full pr-9 pl-4 py-2 bg-surface-secondary rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Quick Add */}
      <button
        onClick={onQuickAdd}
        className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        title="הוספה מהירה (Ctrl+K)"
        aria-label="הוספה מהירה (Ctrl+K)"
      >
        <Plus size={16} />
        <span className="hidden sm:inline">חדש</span>
      </button>

      {/* Notifications */}
      <NotificationCenter />

      {/* User */}
      <div className="flex items-center gap-2 border-r border-border-light pr-3">
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
  );
}
