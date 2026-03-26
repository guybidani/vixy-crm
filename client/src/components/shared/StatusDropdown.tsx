import { useState, useRef, useEffect } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

  const current = options[value];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  if (!current) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <StatusBadge
        label={current.label}
        color={current.color}
        size={size}
        onClick={disabled ? undefined : () => setOpen(!open)}
      />
      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#E6E9EF] py-1 min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150">
          {Object.entries(options).map(([key, opt]) => (
            <button
              key={key}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F5F6F8] transition-colors"
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
          ))}
        </div>
      )}
    </div>
  );
}
