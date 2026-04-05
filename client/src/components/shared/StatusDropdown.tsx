import { useState, useRef, useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import StatusBadge from "./StatusBadge";

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

  // Close on outside click or Escape
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
          className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#E6E9EF] py-1 min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {optionKeys.map((key, idx) => {
            const opt = options[key];
            const isHighlighted = idx === highlightIndex;
            return (
              <button
                key={key}
                id={`status-opt-${key}`}
                role="option"
                aria-selected={key === value}
                data-status-idx={idx}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 transition-colors ${
                  isHighlighted ? "bg-[#F5F6F8]" : "hover:bg-[#F5F6F8]"
                }`}
              >
                <span
                  className="inline-flex items-center justify-center font-semibold rounded-full text-[11px] px-3 py-[3px] min-w-[56px] text-white"
                  style={{ backgroundColor: opt.color }}
                >
                  {opt.label}
                </span>
                {key === value && (
                  <Check size={14} className="text-[#676879] mr-auto" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
