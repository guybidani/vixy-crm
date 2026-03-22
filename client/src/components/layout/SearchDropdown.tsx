import { useRef, useEffect } from "react";
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

interface SearchDropdownProps {
  query: string;
  onClose: () => void;
}

export default function SearchDropdown({
  query,
  onClose,
}: SearchDropdownProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
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
        item.value ? `₪${item.value.toLocaleString()}` : item.stage,
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
      getSubtitle: (item) => item.status,
      getPath: (item) => `/tickets?selected=${item.id}`,
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] max-h-[400px] overflow-y-auto z-50"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="text-primary animate-spin" />
        </div>
      )}

      {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
        <div className="flex flex-col items-center py-8 text-text-tertiary">
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
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary/50 border-b border-[#E6E9EF]">
                  <section.icon size={14} className="text-text-tertiary" />
                  <span className="text-[11px] font-bold text-text-tertiary uppercase">
                    {section.label}
                  </span>
                </div>
                {section.items.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(section.getPath(item))}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary/50 text-right transition-colors"
                  >
                    <span className="text-sm text-text-primary font-medium truncate">
                      {section.getTitle(item)}
                    </span>
                    {section.getSubtitle(item) && (
                      <span className="text-[11px] text-text-tertiary truncate mr-auto">
                        {section.getSubtitle(item)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ),
        )}
    </div>
  );
}
