import { LayoutGrid, List, LayoutDashboard } from "lucide-react";

type ViewMode = "kanban" | "table" | "cards";

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** When true, show the cards toggle button (default: false) */
  showCards?: boolean;
}

export default function ViewToggle({ viewMode, onChange, showCards = false }: ViewToggleProps) {
  return (
    <div className="flex bg-surface-secondary rounded-lg p-0.5">
      <button
        onClick={() => onChange("kanban")}
        className={`p-1.5 rounded-md transition-all ${
          viewMode === "kanban"
            ? "bg-white shadow-sm text-primary"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
        aria-label="תצוגת בורד"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        onClick={() => onChange("table")}
        className={`p-1.5 rounded-md transition-all ${
          viewMode === "table"
            ? "bg-white shadow-sm text-primary"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
        aria-label="תצוגת טבלה"
      >
        <List size={16} />
      </button>
      {showCards && (
        <button
          onClick={() => onChange("cards")}
          className={`p-1.5 rounded-md transition-all ${
            viewMode === "cards"
              ? "bg-white shadow-sm text-primary"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
          aria-label="תצוגת כרטיסים"
        >
          <LayoutDashboard size={16} />
        </button>
      )}
    </div>
  );
}
