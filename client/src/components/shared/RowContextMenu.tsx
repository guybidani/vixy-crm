import { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  Copy,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
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

  // Adjust position if menu would overflow viewport
  const [adjustedPos, setAdjustedPos] = useState({ x, y });
  useEffect(() => {
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
      onKeyDown={handleKeyDown}
      className="fixed z-[100] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-[#E6E9EF] py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="h-px bg-[#E6E9EF] my-1" />}
          <button
            ref={(el) => { buttonRefs.current[i] = el; }}
            role="menuitem"
            tabIndex={focusedIndex === i ? 0 : -1}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            onMouseEnter={() => setFocusedIndex(i)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0073EA] ${
              item.danger
                ? "text-[#FB275D] hover:bg-[#FFF0F0]"
                : "text-[#323338] hover:bg-[#F5F6F8]"
            }`}
          >
            {item.icon && (
              <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/** Helper to build common context menu items */
export function buildRowContextItems<T extends { id: string }>({
  row,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  row: T;
  onOpen?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];

  if (onOpen) {
    items.push({
      label: "פתח",
      icon: <ExternalLink size={14} />,
      onClick: onOpen,
    });
  }

  items.push({
    label: "העתק קישור",
    icon: <Copy size={14} />,
    onClick: () => {
      const url = new URL(window.location.href);
      url.searchParams.set("id", row.id);
      navigator.clipboard.writeText(url.toString()).then(
        () => toast.success("הקישור הועתק"),
        () => toast.error("שגיאה בהעתקת הקישור"),
      );
    },
  });

  if (onDuplicate) {
    items.push({
      label: "שכפל",
      icon: <Copy size={14} />,
      onClick: onDuplicate,
      divider: true,
    });
  }

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
