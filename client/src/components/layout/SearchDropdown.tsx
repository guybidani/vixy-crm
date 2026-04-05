import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Handshake,
  Building2,
  Ticket,
  Loader2,
  SearchX,
} from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { globalSearch, type SearchResults } from "../../api/search";

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

interface SearchDropdownProps {
  query: string;
  onClose: () => void;
}

interface FlatItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  sectionKey: string;
}

export default function SearchDropdown({
  query,
  onClose,
}: SearchDropdownProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const hasResults =
    data &&
    (data.contacts.length > 0 ||
      data.deals.length > 0 ||
      data.companies.length > 0 ||
      data.tickets.length > 0);

  function navigateTo(path: string) {
    navigate(path);
    onClose();
  }

  const sections: Array<{
    key: keyof SearchResults;
    label: string;
    icon: typeof Users;
    items: any[];
    getTitle: (item: any) => string;
    getSubtitle: (item: any) => string;
    getPath: (item: any) => string;
  }> = [
    {
      key: "contacts",
      label: "אנשי קשר",
      icon: Users,
      items: data?.contacts || [],
      getTitle: (item) => item.fullName,
      getSubtitle: (item) => item.email || item.phone || "",
      getPath: (item) => `/contacts?selected=${item.id}`,
    },
    {
      key: "deals",
      label: "עסקאות",
      icon: Handshake,
      items: data?.deals || [],
      getTitle: (item) => item.title,
      getSubtitle: (item) =>
        item.value ? `₪${item.value.toLocaleString()}` : (STAGE_LABELS[item.stage] || item.stage),
      getPath: (item) => `/deals?selected=${item.id}`,
    },
    {
      key: "companies",
      label: "חברות",
      icon: Building2,
      items: data?.companies || [],
      getTitle: (item) => item.name,
      getSubtitle: (item) => item.industry || "",
      getPath: (item) => `/companies?selected=${item.id}`,
    },
    {
      key: "tickets",
      label: "פניות",
      icon: Ticket,
      items: data?.tickets || [],
      getTitle: (item) => item.subject,
      getSubtitle: (item) => TICKET_STATUS_LABELS[item.status] || item.status,
      getPath: (item) => `/tickets?selected=${item.id}`,
    },
  ];

  // Flatten all items for keyboard navigation
  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        items.push({
          id: item.id,
          title: section.getTitle(item),
          subtitle: section.getSubtitle(item),
          path: section.getPath(item),
          sectionKey: section.key,
        });
      }
    }
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems]);

  // Scroll selected item into view
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current.querySelector(`[data-search-idx="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Keyboard navigation: ArrowDown, ArrowUp, Enter, Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
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
            navigateTo(flatItems[selectedIndex].path);
          }
          break;
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, flatItems, selectedIndex]);

  let flatIdx = -1;

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] max-h-[400px] overflow-y-auto z-50"
      role="listbox"
      aria-activedescendant={flatItems[selectedIndex] ? `search-option-${flatItems[selectedIndex].id}` : undefined}
    >
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="text-[#0073EA] animate-spin" />
        </div>
      )}

      {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
        <div className="flex flex-col items-center py-8 text-[#9699A6]">
          <SearchX size={24} className="mb-2" />
          <span className="text-sm">לא נמצאו תוצאות</span>
        </div>
      )}

      {!isLoading &&
        hasResults &&
        sections.map(
          (section) =>
            section.items.length > 0 && (
              <div key={section.key}>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F6F8] border-b border-[#E6E9EF]" role="presentation">
                  <section.icon size={14} className="text-[#9699A6]" />
                  <span className="text-[11px] font-bold text-[#9699A6] uppercase">
                    {section.label}
                  </span>
                </div>
                {section.items.map((item: any) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      id={`search-option-${item.id}`}
                      data-search-idx={idx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => navigateTo(section.getPath(item))}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                        isSelected
                          ? "bg-[#0073EA]/5"
                          : "hover:bg-[#F5F6F8]"
                      }`}
                    >
                      <span className="text-[13px] text-[#323338] font-medium truncate">
                        {section.getTitle(item)}
                      </span>
                      {section.getSubtitle(item) && (
                        <span className="text-[11px] text-[#9699A6] truncate mr-auto">
                          {section.getSubtitle(item)}
                        </span>
                      )}
                      {isSelected && (
                        <kbd className="px-1.5 py-0.5 bg-[#F5F6F8] rounded border border-[#E6E9EF] text-[10px] font-mono text-[#9699A6] shrink-0">
                          Enter
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ),
        )}
    </div>
  );
}
