import { useState, useRef, useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { cn } from "../../lib/utils";

interface StatusOption {
  label: string;
  color: string;
}

interface StatusDropdownProps {
  value: string;
  options: Record<string, StatusOption>;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

/**
 * Monday-style status pill with a dropdown for picking another option.
 * - Trigger: StatusBadge pill (vibrant bg, white text, hover brightness).
 * - Dropdown: vibrant colored rows (matching Monday's single-select color menu).
 */
export default function StatusDropdown({
  value,
  options,
  onChange,
  size = "sm",
  disabled = false,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const optionKeys = useMemo(() => Object.keys(options), [options]);

  // Close on outside click or Escape; arrow-key / enter keyboard support
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((i) =>
            i < optionKeys.length - 1 ? i + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((i) =>
            i > 0 ? i - 1 : optionKeys.length - 1,
          );
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (highlightIndex >= 0 && optionKeys[highlightIndex]) {
            onChange(optionKeys[highlightIndex]);
            setOpen(false);
          }
          break;
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, optionKeys, highlightIndex, onChange]);

  // Reset highlight when opening and scroll highlighted into view
  useEffect(() => {
    if (open) {
      const idx = optionKeys.indexOf(value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    }
  }, [open, optionKeys, value]);

  useEffect(() => {
    if (!listRef.current || highlightIndex < 0) return;
    const el = listRef.current.querySelector(
      `[data-status-idx="${highlightIndex}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const current = options[value];
  if (!current) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <StatusBadge
        label={current.label}
        color={current.color}
        size={size}
        onClick={disabled ? undefined : () => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-activedescendant={
            highlightIndex >= 0
              ? `status-opt-${optionKeys[highlightIndex]}`
              : undefined
          }
          className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#E6E9EF] p-1.5 min-w-[180px] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {optionKeys.map((key, idx) => {
            const opt = options[key];
            const isHighlighted = idx === highlightIndex;
            const isSelected = key === value;
            return (
              <button
                key={key}
                id={`status-opt-${key}`}
                role="option"
                aria-selected={isSelected}
                data-status-idx={idx}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={cn(
                  "w-full relative flex items-center gap-2 rounded-[3px] mb-1 last:mb-0 transition-[filter]",
                  "text-white text-[12px] font-medium py-[7px] px-3 text-center",
                  "hover:brightness-95",
                  isHighlighted && "brightness-95",
                )}
                style={{ backgroundColor: opt.color }}
              >
                <span className="flex-1 text-center truncate">{opt.label}</span>
                {isSelected && (
                  <Check
                    size={14}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white/90"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
