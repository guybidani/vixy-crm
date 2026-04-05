import { LayoutGrid, List, LayoutDashboard } from "lucide-react";
import { cn } from "../../lib/utils";

type ViewMode = "kanban" | "table" | "cards";

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  showCards?: boolean;
}

export default function ViewToggle({ viewMode, onChange, showCards = false }: ViewToggleProps) {
  const buttons = [
    { key: "table" as const, Icon: List, label: "טבלה" },
    { key: "kanban" as const, Icon: LayoutGrid, label: "קנבאן" },
    ...(showCards ? [{ key: "cards" as const, Icon: LayoutDashboard, label: "כרטיסים" }] : []),
  ];

  return (
    <div className="flex items-center border border-[#D0D4E4] rounded-[4px] overflow-hidden" role="group" aria-label="תצוגה">
      {buttons.map(({ key, Icon, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-label={label}
          aria-pressed={viewMode === key}
          className={cn(
            "p-[6px] transition-colors",
            viewMode === key
              ? "bg-[#0073EA] text-white"
              : "bg-white text-[#676879] hover:bg-[#F5F6F8]",
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
