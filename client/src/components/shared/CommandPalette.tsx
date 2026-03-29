import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Handshake,
  CheckSquare,
  Building2,
  Ticket,
  Loader2,
  SearchX,
  LayoutDashboard,
  FileText,
  Settings,
  BookOpen,
  Plus,
  History,
  Zap,
} from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { globalSearch, type SearchResults } from "../../api/search";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onQuickAdd: (type: "contact" | "deal" | "task") => void;
}

interface ResultItem {
  id: string;
  type: "contact" | "deal" | "company" | "ticket" | "action";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  action: () => void;
}

interface ResultGroup {
  label: string;
  items: ResultItem[];
}

const STAGE_LABELS: Record<string, string> = {
  LEAD: "ליד",
  QUALIFIED: "מאומת",
  PROPOSAL: "הצעה",
  NEGOTIATION: "משא ומתן",
  CLOSED_WON: "נסגר בהצלחה",
  CLOSED_LOST: "נסגר באי-הצלחה",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: "חדש",
  OPEN: "פתוח",
  PENDING: "ממתין",
  RESOLVED: "טופל",
  CLOSED: "סגור",
};

function getQuickActions(
  navigate: ReturnType<typeof useNavigate>,
  onClose: () => void,
  onQuickAdd: (type: "contact" | "deal" | "task") => void,
): ResultGroup {
  function go(path: string) {
    navigate(path);
    onClose();
  }

  function quickAdd(type: "contact" | "deal" | "task") {
    onClose();
    // Small delay so the palette closes before QuickAdd opens
    setTimeout(() => onQuickAdd(type), 50);
  }

  return {
    label: "פעולות מהירות",
    items: [
      {
        id: "action-new-contact",
        type: "action",
        title: "צור איש קשר חדש",
        subtitle: "Ctrl+K → איש קשר",
        icon: <Plus size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => quickAdd("contact"),
      },
      {
        id: "action-new-deal",
        type: "action",
        title: "צור עסקה חדשה",
        subtitle: "Ctrl+K → עסקה",
        icon: <Plus size={16} />,
        iconColor: "#00CA72",
        iconBg: "#D6F5E8",
        action: () => quickAdd("deal"),
      },
      {
        id: "action-new-task",
        type: "action",
        title: "צור משימה חדשה",
        subtitle: "Ctrl+K → משימה",
        icon: <Plus size={16} />,
        iconColor: "#A25DDC",
        iconBg: "#EDE1F5",
        action: () => quickAdd("task"),
      },
      {
        id: "action-dashboard",
        type: "action",
        title: "עבור לדשבורד",
        subtitle: "G → D",
        icon: <LayoutDashboard size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => go("/dashboard"),
      },
      {
        id: "action-contacts",
        type: "action",
        title: "עבור לאנשי קשר",
        subtitle: "G → C",
        icon: <Users size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => go("/contacts"),
      },
      {
        id: "action-deals",
        type: "action",
        title: "עבור לעסקאות",
        subtitle: "G → E",
        icon: <Handshake size={16} />,
        iconColor: "#00CA72",
        iconBg: "#D6F5E8",
        action: () => go("/deals"),
      },
      {
        id: "action-tasks",
        type: "action",
        title: "עבור למשימות",
        subtitle: "G → T",
        icon: <CheckSquare size={16} />,
        iconColor: "#A25DDC",
        iconBg: "#EDE1F5",
        action: () => go("/tasks"),
      },
      {
        id: "action-tickets",
        type: "action",
        title: "עבור לפניות",
        subtitle: "G → K",
        icon: <Ticket size={16} />,
        iconColor: "#FDAB3D",
        iconBg: "#FEF0D8",
        action: () => go("/tickets"),
      },
      {
        id: "action-companies",
        type: "action",
        title: "עבור לחברות",
        subtitle: "",
        icon: <Building2 size={16} />,
        iconColor: "#037F4C",
        iconBg: "#D6F5E8",
        action: () => go("/companies"),
      },
      {
        id: "action-documents",
        type: "action",
        title: "עבור למסמכים",
        subtitle: "",
        icon: <FileText size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => go("/documents"),
      },
      {
        id: "action-knowledge",
        type: "action",
        title: "עבור למאגר ידע",
        subtitle: "",
        icon: <BookOpen size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => go("/knowledge"),
      },
      {
        id: "action-automations",
        type: "action",
        title: "עבור לאוטומציות",
        subtitle: "",
        icon: <Zap size={16} />,
        iconColor: "#FDAB3D",
        iconBg: "#FEF0D8",
        action: () => go("/automations"),
      },
      {
        id: "action-history",
        type: "action",
        title: "עבור להיסטוריה",
        subtitle: "",
        icon: <History size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => go("/history"),
      },
      {
        id: "action-settings",
        type: "action",
        title: "עבור להגדרות",
        subtitle: "G → S",
        icon: <Settings size={16} />,
        iconColor: "#676879",
        iconBg: "#F0F0F0",
        action: () => go("/settings"),
      },
    ],
  };
}

function buildSearchGroups(
  data: SearchResults,
  navigate: ReturnType<typeof useNavigate>,
  onClose: () => void,
): ResultGroup[] {
  const groups: ResultGroup[] = [];

  function go(path: string) {
    navigate(path);
    onClose();
  }

  if (data.contacts.length > 0) {
    groups.push({
      label: "אנשי קשר",
      items: data.contacts.map((c) => ({
        id: `contact-${c.id}`,
        type: "contact" as const,
        title: c.fullName,
        subtitle: c.email || c.phone || "",
        icon: <Users size={16} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        action: () => go(`/contacts/${c.id}`),
      })),
    });
  }

  if (data.deals.length > 0) {
    groups.push({
      label: "עסקאות",
      items: data.deals.map((d) => ({
        id: `deal-${d.id}`,
        type: "deal" as const,
        title: d.title,
        subtitle: d.value
          ? `₪${d.value.toLocaleString()}`
          : STAGE_LABELS[d.stage] || d.stage,
        icon: <Handshake size={16} />,
        iconColor: "#00CA72",
        iconBg: "#D6F5E8",
        action: () => go(`/deals?open=${d.id}`),
      })),
    });
  }

  if (data.companies.length > 0) {
    groups.push({
      label: "חברות",
      items: data.companies.map((c) => ({
        id: `company-${c.id}`,
        type: "company" as const,
        title: c.name,
        subtitle: c.industry || "",
        icon: <Building2 size={16} />,
        iconColor: "#037F4C",
        iconBg: "#D6F5E8",
        action: () => go(`/companies/${c.id}`),
      })),
    });
  }

  if (data.tickets.length > 0) {
    groups.push({
      label: "פניות",
      items: data.tickets.map((t) => ({
        id: `ticket-${t.id}`,
        type: "ticket" as const,
        title: t.subject,
        subtitle: TICKET_STATUS_LABELS[t.status] || t.status,
        icon: <Ticket size={16} />,
        iconColor: "#FDAB3D",
        iconBg: "#FEF0D8",
        action: () => go(`/tickets/${t.id}`),
      })),
    });
  }

  return groups;
}

export default function CommandPalette({
  open,
  onClose,
  onQuickAdd,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isCommandMode = query.startsWith(">");
  const searchQuery = isCommandMode ? "" : debouncedQuery;

  const { data, isLoading } = useQuery({
    queryKey: ["command-palette-search", searchQuery],
    queryFn: () => globalSearch(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 30_000,
  });

  const quickActions = useMemo(
    () => getQuickActions(navigate, onClose, onQuickAdd),
    [navigate, onClose, onQuickAdd],
  );

  // Filter quick actions when in command mode or empty query
  const filteredActions = useMemo(() => {
    const commandQuery = isCommandMode ? query.slice(1).trim() : "";
    if (!commandQuery && !isCommandMode && !query) return quickActions;
    if (isCommandMode && !commandQuery) return quickActions;
    const lowerQ = commandQuery.toLowerCase();
    return {
      ...quickActions,
      items: quickActions.items.filter(
        (item) =>
          item.title.includes(lowerQ) ||
          item.title.toLowerCase().includes(lowerQ),
      ),
    };
  }, [quickActions, query, isCommandMode]);

  // Build result groups
  const groups: ResultGroup[] = useMemo(() => {
    if (searchQuery.length >= 2 && data) {
      return buildSearchGroups(data, navigate, onClose);
    }
    if (!query || isCommandMode || searchQuery.length < 2) {
      return filteredActions.items.length > 0 ? [filteredActions] : [];
    }
    return [];
  }, [data, searchQuery, query, isCommandMode, filteredActions, navigate, onClose]);

  // Flatten for keyboard nav
  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  // Reset selection when groups change
  useEffect(() => {
    setSelectedIndex(0);
  }, [groups]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            flatItems[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatItems, selectedIndex, onClose],
  );

  // Global Escape listener
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const showLoading = isLoading && searchQuery.length >= 2;
  const showEmpty =
    !isLoading &&
    searchQuery.length >= 2 &&
    data &&
    flatItems.length === 0 &&
    !isCommandMode;

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="חיפוש גלובלי ופעולות מהירות"
    >
      <div
        className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-[520px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-[#E6E9EF]">
          <div className="relative">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6]"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='חפש אנשי קשר, עסקאות, משימות... או הקלד ">" לפעולות'
              className="w-full pr-10 pl-4 py-2.5 bg-[#F5F6F8] rounded-xl text-sm text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:bg-white transition-colors"
              aria-label="חיפוש"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto overscroll-contain"
          role="listbox"
        >
          {showLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="text-[#0073EA] animate-spin" />
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center py-10 text-[#9699A6]">
              <SearchX size={28} className="mb-2 opacity-50" />
              <span className="text-sm">לא נמצאו תוצאות</span>
              <span className="text-xs mt-1 opacity-70">
                נסה מילות חיפוש אחרות
              </span>
            </div>
          )}

          {!showLoading &&
            groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F6F8]/40 border-b border-[#E6E9EF]/50">
                  <span className="text-[11px] font-bold text-[#9699A6]">
                    {group.label}
                  </span>
                </div>
                {group.items.map((item) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                        isSelected
                          ? "bg-[#0073EA]/5"
                          : "hover:bg-[#F5F6F8]/50"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: item.iconBg,
                          color: item.iconColor,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#323338] truncate block">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-[#9699A6] truncate block">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <kbd className="px-1.5 py-0.5 bg-[#F5F6F8] rounded border border-[#E6E9EF] text-[10px] font-mono text-[#9699A6] shrink-0">
                          Enter
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#E6E9EF] flex items-center gap-4 text-[10px] text-[#9699A6] bg-[#F5F6F8]/30">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">
              ↑↓
            </kbd>
            ניווט
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">
              Enter
            </kbd>
            בחירה
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">
              Esc
            </kbd>
            סגירה
          </span>
          <span className="flex items-center gap-1 mr-auto">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">
              &gt;
            </kbd>
            פעולות מהירות
          </span>
        </div>
      </div>
    </div>
  );
}
