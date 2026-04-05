import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "חיפוש ויצירה",
    shortcuts: [
      { keys: ["Ctrl", "K"], label: "חיפוש כללי" },
      { keys: ["Ctrl", "Shift", "K"], label: "הוספה מהירה" },
      { keys: ["N"], label: "משימה חדשה" },
      { keys: ["C"], label: "איש קשר חדש" },
      { keys: ["D"], label: "עסקה חדשה" },
    ],
  },
  {
    title: "ניווט",
    shortcuts: [
      { keys: ["G", "D"], label: "דשבורד" },
      { keys: ["G", "C"], label: "אנשי קשר" },
      { keys: ["G", "E"], label: "עסקאות" },
      { keys: ["G", "T"], label: "משימות" },
      { keys: ["G", "K"], label: "פניות" },
      { keys: ["G", "S"], label: "הגדרות" },
    ],
  },
  {
    title: "כללי",
    shortcuts: [
      { keys: ["?"], label: "קיצורי מקלדת" },
      { keys: ["Esc"], label: "סגירת חלון" },
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

  useEffect(() => {
    if (!open) return;

    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus the close button so keyboard users start inside the dialog
    requestAnimationFrame(() => {
      const close = dialogRef.current?.querySelector<HTMLElement>("button[aria-label]");
      close?.focus();
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

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="קיצורי מקלדת"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#E6E9EF]">
          <div className="w-9 h-9 rounded-xl bg-[#E8F3FF] flex items-center justify-center">
            <Keyboard size={18} className="text-[#0073EA]" />
          </div>
          <h2 className="text-base font-bold text-[#323338] flex-1">
            קיצורי מקלדת
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
            aria-label="סגירה"
          >
            <X size={16} className="text-[#9699A6]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold text-[#9699A6] uppercase mb-2.5 tracking-wide">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between py-1.5 px-2 rounded-[4px] hover:bg-[#F5F6F8]/60 transition-colors"
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
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E6E9EF] bg-[#F5F6F8]/30">
          <p className="text-[11px] text-[#9699A6] text-center">
            קיצורים פעילים רק כשלא מקלידים בשדה טקסט
          </p>
        </div>
      </div>
    </div>
  );
}
