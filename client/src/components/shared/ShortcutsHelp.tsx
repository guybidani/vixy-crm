import { useEffect, useMemo, useRef, useState } from "react";
import { X, Keyboard, Search } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  label: string;
  /** Extra words to match against when searching (aliases / synonyms) */
  hints?: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

/**
 * All keyboard shortcuts, grouped by context.
 * Keys use English canonical names (Ctrl / Cmd / Shift / Enter / Esc / Tab / Space / Delete
 * / arrow glyphs). Labels are Hebrew so end-users can scan them quickly.
 */
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "ניווט",
    shortcuts: [
      { keys: ["G", "D"], label: "דשבורד", hints: "dashboard" },
      { keys: ["G", "C"], label: "אנשי קשר", hints: "contacts" },
      { keys: ["G", "E"], label: "עסקאות", hints: "deals" },
      { keys: ["G", "T"], label: "משימות", hints: "tasks" },
      { keys: ["G", "K"], label: "פניות", hints: "tickets" },
      { keys: ["G", "S"], label: "הגדרות", hints: "settings" },
    ],
  },
  {
    title: "פעולות",
    shortcuts: [
      { keys: ["N", "C"], label: "איש קשר חדש", hints: "new contact" },
      { keys: ["N", "D"], label: "עסקה חדשה", hints: "new deal" },
      { keys: ["N", "T"], label: "משימה חדשה", hints: "new task" },
      { keys: ["Ctrl", "K"], label: "חיפוש כללי / Command Palette", hints: "command palette search" },
      { keys: ["Ctrl", "Shift", "K"], label: "הוספה מהירה", hints: "quick add" },
      { keys: ["?"], label: "פתח חלון זה", hints: "help shortcuts" },
      { keys: ["Esc"], label: "סגירת חלון", hints: "close" },
    ],
  },
  {
    title: "טבלה",
    shortcuts: [
      { keys: ["↑", "↓", "←", "→"], label: "ניווט בין תאים", hints: "arrows navigate cells" },
      { keys: ["Enter"], label: "עריכת תא / פתיחת פרטים", hints: "edit open" },
      { keys: ["Space"], label: "בחירת שורה", hints: "select toggle" },
      { keys: ["Ctrl", "A"], label: "בחר הכל", hints: "select all" },
      { keys: ["Delete"], label: "מחיקת הנבחרים", hints: "delete selected" },
      { keys: ["Tab"], label: "תא הבא", hints: "next cell" },
      { keys: ["Shift", "Tab"], label: "תא קודם", hints: "previous cell" },
    ],
  },
  {
    title: "פאנל פרטים",
    shortcuts: [
      { keys: ["Esc"], label: "סגירת הפאנל", hints: "close" },
      { keys: ["J"], label: "פריט הבא", hints: "next" },
      { keys: ["K"], label: "פריט קודם", hints: "previous" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-white border border-[#E6E9EF] rounded-md text-xs font-mono font-semibold text-[#323338] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      {children}
    </kbd>
  );
}

export default function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      // Reset the search when the dialog closes so it re-opens empty.
      setQuery("");
      return;
    }

    // Lock body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus the search input so users can filter immediately.
    requestAnimationFrame(() => {
      searchRef.current?.focus();
    });

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey, { capture: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey, { capture: true });
    };
  }, [open, onClose]);

  // Filter groups by query. Matches against label, hints, and joined keys.
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHORTCUT_GROUPS;
    return SHORTCUT_GROUPS.map((group) => ({
      ...group,
      shortcuts: group.shortcuts.filter((s) => {
        const haystack = [
          s.label,
          s.hints ?? "",
          s.keys.join(" "),
          s.keys.join("+"),
          s.keys.join(""),
          group.title,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }),
    })).filter((group) => group.shortcuts.length > 0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="קיצורי מקלדת"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[85vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#E6E9EF]">
          <div className="w-9 h-9 rounded-xl bg-[#E8F3FF] flex items-center justify-center shrink-0">
            <Keyboard size={18} className="text-[#0073EA]" />
          </div>
          <h2 className="text-base font-bold text-[#323338] flex-1">
            קיצורי מקלדת
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F6F7FB] transition-colors"
            aria-label="סגירה"
          >
            <X size={16} className="text-[#9699A6]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 border-b border-[#E6E9EF]">
          <div className="relative">
            <Search
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש קיצור..."
              className="w-full pr-8 pl-3 py-2 text-[13px] bg-[#F6F7FB] border border-transparent focus:border-[#0073EA] focus:bg-white rounded-[6px] outline-none transition-colors placeholder:text-[#9699A6]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#9699A6]">
              לא נמצאו קיצורים תואמים
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-bold text-[#9699A6] uppercase mb-2.5 tracking-wide">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.label + shortcut.keys.join("+")}
                      className="flex items-center justify-between py-1.5 px-2 rounded-[4px] hover:bg-[#F6F7FB]/60 transition-colors"
                    >
                      <span className="text-sm text-[#323338]">
                        {shortcut.label}
                      </span>
                      <div className="flex items-center gap-1" dir="ltr">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-[10px] text-[#9699A6] mx-0.5">
                                +
                              </span>
                            )}
                            <Kbd>{key}</Kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E6E9EF] bg-[#F6F7FB]/30">
          <p className="text-[11px] text-[#9699A6] text-center">
            קיצורים פעילים רק כשלא מקלידים בשדה טקסט · לחץ{" "}
            <kbd className="font-mono bg-white border border-[#E6E9EF] rounded px-1 py-0.5 text-[#323338]">
              Esc
            </kbd>{" "}
            לסגירה
          </p>
        </div>
      </div>
    </div>
  );
}
