import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: "kanban" | "table";
  onChange: (mode: "kanban" | "table") => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
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
    </div>
  );
}
