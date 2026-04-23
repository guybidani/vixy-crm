import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  ExternalLink,
  Link as LinkIcon,
  Copy,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  /** Shortcut hint shown on the left (RTL right) — e.g. "⌘ D" */
  shortcut?: string;
  /** Inserts a divider ABOVE this item */
  divider?: boolean;
}

interface RowContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function RowContextMenu({
  x,
  y,
  items,
  onClose,
}: RowContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-focus first item on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      buttonRefs.current[0]?.focus();
    });
  }, []);

  // Sync focus with focusedIndex
  useEffect(() => {
    buttonRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case "Tab":
        // Prevent Tab from leaving the menu — close instead
        e.preventDefault();
        onClose();
        break;
    }
  }

  // Adjust position to avoid viewport overflow. useLayoutEffect runs before
  // paint so the menu doesn't flash in the wrong spot.
  const [adjustedPos, setAdjustedPos] = useState({ x, y });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let ax = x;
    let ay = y;
    if (x + rect.width > vw) ax = vw - rect.width - 8;
    if (y + rect.height > vh) ay = vh - rect.height - 8;
    if (ax < 0) ax = 8;
    if (ay < 0) ay = 8;
    setAdjustedPos({ x: ax, y: ay });
  }, [x, y]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="תפריט הקשר"
      dir="rtl"
      onKeyDown={handleKeyDown}
      className="fixed z-[100] bg-white rounded-lg border border-[#E6E9EF] p-1 min-w-[220px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02)",
      }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && i > 0 && (
            <div className="h-px bg-[#E6E9EF] my-1 mx-[-4px]" />
          )}
          <button
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            role="menuitem"
            tabIndex={focusedIndex === i ? 0 : -1}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            onMouseEnter={() => setFocusedIndex(i)}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] text-[14px] text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0073EA]/30 ${
              item.danger
                ? "text-[#E2445C] hover:bg-[#FFF1F2] focus-visible:bg-[#FFF1F2]"
                : "text-[#323338] hover:bg-[#F6F7FB] focus-visible:bg-[#F6F7FB]"
            }`}
          >
            {item.icon && (
              <span
                className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${
                  item.danger ? "text-[#E2445C]" : "text-[#676879]"
                }`}
              >
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut && (
              <span
                className={`flex-shrink-0 text-[11px] font-mono tracking-wider ${
                  item.danger ? "text-[#E2445C]/70" : "text-[#9699A6]"
                }`}
                dir="ltr"
              >
                {item.shortcut}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Helper to build common context menu items — Monday.com order */
export function buildRowContextItems<T extends { id: string }>({
  row,
  onOpen,
  onOpenInNewTab,
  onDuplicate,
  onDelete,
  extra,
}: {
  row: T;
  onOpen?: () => void;
  onOpenInNewTab?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Additional items inserted before the delete section */
  extra?: ContextMenuItem[];
}): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  // Open section
  if (onOpen) {
    items.push({
      label: "פתח",
      icon: <ExternalLink size={14} />,
      onClick: onOpen,
    });
  }

  if (onOpenInNewTab) {
    items.push({
      label: "פתח בלשונית חדשה",
      icon: <ExternalLink size={14} />,
      onClick: onOpenInNewTab,
    });
  }

  // Link + duplicate section (divider above)
  items.push({
    label: "העתק קישור",
    icon: <LinkIcon size={14} />,
    onClick: () => {
      const url = new URL(window.location.href);
      url.searchParams.set("id", row.id);
      navigator.clipboard.writeText(url.toString()).then(
        () => toast.success("הקישור הועתק"),
        () => toast.error("שגיאה בהעתקת הקישור"),
      );
    },
    divider: items.length > 0,
  });

  if (onDuplicate) {
    items.push({
      label: "שכפל",
      icon: <Copy size={14} />,
      onClick: onDuplicate,
      shortcut: "⌘ D",
    });
  }

  // Extra items (e.g. "הסמך ליד", "העבר לקבוצה...")
  if (extra && extra.length > 0) {
    extra.forEach((item, idx) => {
      items.push({
        ...item,
        divider: idx === 0 ? true : item.divider,
      });
    });
  }

  // Delete section (always last, with divider)
  if (onDelete) {
    items.push({
      label: "מחק",
      icon: <Trash2 size={14} />,
      onClick: onDelete,
      danger: true,
      divider: true,
    });
  }

  return items;
}
