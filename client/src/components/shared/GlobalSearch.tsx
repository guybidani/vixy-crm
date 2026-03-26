import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Handshake,
  Building2,
  Ticket,
  Loader2,
  SearchX,
} from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { globalSearch, type SearchResults } from "../../api/search";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
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

interface ResultItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  path: string;
}

interface ResultSection {
  label: string;
  items: ResultItem[];
}

function buildSections(
  data: SearchResults,
): ResultSection[] {
  const sections: ResultSection[] = [];

  if (data.contacts.length > 0) {
    sections.push({
      label: "אנשי קשר",
      items: data.contacts.map((c) => ({
        id: `contact-${c.id}`,
        title: c.fullName,
        subtitle: c.email || c.phone || "",
        icon: <Users size={15} />,
        iconColor: "#6161FF",
        iconBg: "#E8E8FF",
        path: `/contacts?selected=${c.id}`,
      })),
    });
  }

  if (data.deals.length > 0) {
    sections.push({
      label: "עסקאות",
      items: data.deals.map((d) => ({
        id: `deal-${d.id}`,
        title: d.title,
        subtitle: d.value
          ? `₪${d.value.toLocaleString()}`
          : STAGE_LABELS[d.stage] || d.stage,
        icon: <Handshake size={15} />,
        iconColor: "#00CA72",
        iconBg: "#D6F5E8",
        path: `/deals?selected=${d.id}`,
      })),
    });
  }

  if (data.companies.length > 0) {
    sections.push({
      label: "חברות",
      items: data.companies.map((c) => ({
        id: `company-${c.id}`,
        title: c.name,
        subtitle: c.industry || "",
        icon: <Building2 size={15} />,
        iconColor: "#037F4C",
        iconBg: "#D6F5E8",
        path: `/companies?selected=${c.id}`,
      })),
    });
  }

  if (data.tickets.length > 0) {
    sections.push({
      label: "פניות",
      items: data.tickets.map((t) => ({
        id: `ticket-${t.id}`,
        title: t.subject,
        subtitle: TICKET_STATUS_LABELS[t.status] || t.status,
        icon: <Ticket size={15} />,
        iconColor: "#FDAB3D",
        iconBg: "#FEF0D8",
        path: `/tickets?selected=${t.id}`,
      })),
    });
  }

  return sections;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 280);

  const { data, isLoading } = useQuery({
    queryKey: ["global-search-modal", debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const sections = data && debouncedQuery.length >= 2 ? buildSections(data) : [];
  const flatItems = sections.flatMap((s) => s.items);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [sections.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Global keyboard: Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i < flatItems.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : flatItems.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleNavigate(flatItems[selectedIndex].path);
        }
        break;
    }
  }

  if (!open) return null;

  const showLoading = isLoading && debouncedQuery.length >= 2;
  const showEmpty =
    !isLoading &&
    debouncedQuery.length >= 2 &&
    data &&
    flatItems.length === 0;

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="חיפוש גלובלי"
    >
      <div
        className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-[540px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-[#E6E9EF]">
          <div className="relative">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="חפש אנשי קשר, עסקאות, חברות, פניות..."
              className="w-full pr-10 pl-4 py-2.5 bg-[#F5F6F8] rounded-xl text-sm text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:bg-white transition-colors"
              autoComplete="off"
              spellCheck={false}
              aria-label="חיפוש גלובלי"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9699A6] hover:text-[#323338] transition-colors"
                aria-label="נקה חיפוש"
              >
                <span className="text-xs font-mono bg-[#F5F6F8] px-1.5 py-0.5 rounded border border-[#E6E9EF]">
                  Esc
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[420px] overflow-y-auto overscroll-contain"
          role="listbox"
        >
          {/* Idle state */}
          {!query && (
            <div className="flex flex-col items-center py-10 text-[#9699A6]">
              <Search size={28} className="mb-2 opacity-30" />
              <span className="text-sm">התחל להקליד כדי לחפש</span>
              <div className="flex items-center gap-2 mt-3 text-[11px]">
                <kbd className="px-1.5 py-0.5 bg-[#F5F6F8] rounded border border-[#E6E9EF] font-mono">
                  Ctrl+K
                </kbd>
                <span>פתיחה</span>
                <kbd className="px-1.5 py-0.5 bg-[#F5F6F8] rounded border border-[#E6E9EF] font-mono mr-2">
                  Esc
                </kbd>
                <span>סגירה</span>
              </div>
            </div>
          )}

          {/* Short query */}
          {query.length === 1 && (
            <div className="flex flex-col items-center py-8 text-[#9699A6]">
              <span className="text-sm">הקלד לפחות 2 תווים...</span>
            </div>
          )}

          {/* Loading */}
          {showLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="text-[#0073EA] animate-spin" />
            </div>
          )}

          {/* Empty */}
          {showEmpty && (
            <div className="flex flex-col items-center py-10 text-[#9699A6]">
              <SearchX size={28} className="mb-2 opacity-50" />
              <span className="text-sm">לא נמצאו תוצאות עבור "{debouncedQuery}"</span>
              <span className="text-xs mt-1 opacity-70">נסה מילות חיפוש אחרות</span>
            </div>
          )}

          {/* Grouped results */}
          {!showLoading &&
            sections.map((section) => (
              <div key={section.label}>
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-1.5 bg-[#F5F6F8]/50 border-b border-[#E6E9EF]/50 sticky top-0">
                  <span className="text-[10px] font-bold text-[#9699A6] uppercase tracking-wide">
                    {section.label}
                  </span>
                  <span className="text-[10px] text-[#9699A6]">
                    ({section.items.length})
                  </span>
                </div>

                {section.items.map((item) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleNavigate(item.path)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                        isSelected
                          ? "bg-[#0073EA]/5"
                          : "hover:bg-[#F5F6F8]/50"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: item.iconBg,
                          color: item.iconColor,
                        }}
                      >
                        {item.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 text-right">
                        <span className="text-sm font-medium text-[#323338] truncate block">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-[#9699A6] truncate block">
                            {item.subtitle}
                          </span>
                        )}
                      </div>

                      {/* Enter hint on selected */}
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
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">↑↓</kbd>
            ניווט
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">Enter</kbd>
            פתיחה
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">Esc</kbd>
            סגירה
          </span>
          <span className="mr-auto flex items-center gap-1 opacity-60">
            <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] font-mono shadow-sm">Ctrl+K</kbd>
            חיפוש גלובלי
          </span>
        </div>
      </div>
    </div>
  );
}
