import { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  Copy,
  Trash2,
  Plus,
} from "lucide-react";

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
      className="fixed z-[100] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-[#E6E9EF] py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="h-px bg-[#E6E9EF] my-1" />}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-right transition-colors ${
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
  groups: _groups,
  onMoveToGroup: _onMoveToGroup,
}: {
  row: T;
  onOpen?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  groups?: Array<{ key: string; label: string }>;
  onMoveToGroup?: (groupKey: string) => void;
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
      navigator.clipboard.writeText(window.location.href + "?id=" + row.id);
    },
  });

  if (onDuplicate) {
    items.push({
      label: "שכפל",
      icon: <Plus size={14} />,
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
