import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../shared/Modal";
import {
  type DashboardLayout,
  type DashboardWidgetConfig,
  type DashboardWidgetSize,
} from "../../api/settings";
import { WIDGET_REGISTRY, DEFAULT_WIDGET_ORDER } from "./widgetRegistry";

interface Props {
  open: boolean;
  onClose: () => void;
  layout: DashboardLayout;
  onSave: (next: DashboardLayout) => void | Promise<void>;
}

const SIZE_LABELS: Record<DashboardWidgetSize, string> = {
  small: "S",
  medium: "M",
  large: "L",
};

const SIZE_ORDER: DashboardWidgetSize[] = ["small", "medium", "large"];

function buildDefault(): DashboardLayout {
  return {
    widgets: DEFAULT_WIDGET_ORDER.map((id, idx) => ({
      id,
      visible: id !== "my-tasks", // matches server default
      order: idx,
      size: WIDGET_REGISTRY[id]?.defaultSize ?? "medium",
    })),
  };
}

export default function DashboardCustomizeModal({
  open,
  onClose,
  layout,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<DashboardWidgetConfig[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-seed on open so discarded edits reset next time the modal is opened.
  useEffect(() => {
    if (open) {
      setDraft(
        [...layout.widgets]
          .filter((w) => WIDGET_REGISTRY[w.id]) // skip unknown ids
          .sort((a, b) => a.order - b.order),
      );
    }
  }, [open, layout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const from = prev.findIndex((w) => w.id === active.id);
      const to = prev.findIndex((w) => w.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to).map((w, i) => ({ ...w, order: i }));
    });
  };

  const toggleVisible = (id: string) => {
    setDraft((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  };

  const setSize = (id: string, size: DashboardWidgetSize) => {
    setDraft((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)));
  };

  const resetToDefaults = () => {
    setDraft(buildDefault().widgets);
  };

  const visibleCount = useMemo(() => draft.filter((w) => w.visible).length, [
    draft,
  ]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({ widgets: draft });
      toast.success("הדשבורד עודכן");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="התאם דשבורד"
      maxWidth="max-w-3xl"
    >
      <div className="p-5 max-h-[70vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] text-[#676879]">
            גרור לסידור מחדש, הפעל/כבה ובחר גודל. {visibleCount} מתוך{" "}
            {draft.length} גלויים.
          </p>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-[12px] text-[#676879] hover:text-[#323338] transition-colors"
          >
            <RotateCcw size={12} />
            אפס לברירת מחדל
          </button>
        </div>

        {/* List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={draft.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {draft.map((w) => (
                <SortableRow
                  key={w.id}
                  config={w}
                  onToggle={() => toggleVisible(w.id)}
                  onSize={(s) => setSize(w.id, s)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Preview */}
        <div className="mt-6">
          <h3 className="text-[12px] font-semibold text-[#9699A6] uppercase tracking-wide mb-2">
            תצוגה מקדימה
          </h3>
          <div className="grid grid-cols-6 gap-1.5 p-3 bg-[#F5F6F8] rounded-xl">
            {draft
              .filter((w) => w.visible)
              .map((w) => {
                const meta = WIDGET_REGISTRY[w.id];
                if (!meta) return null;
                const span =
                  w.size === "large" ? 6 : w.size === "medium" ? 3 : 2;
                const height =
                  w.size === "large" ? 32 : w.size === "medium" ? 28 : 24;
                return (
                  <div
                    key={w.id}
                    className="bg-white rounded-[4px] border border-[#E6E9EF] flex items-center justify-center text-[10px] text-[#676879] font-medium"
                    style={{
                      gridColumn: `span ${span} / span ${span}`,
                      height,
                    }}
                  >
                    {meta.title}
                  </div>
                );
              })}
            {visibleCount === 0 && (
              <div className="col-span-6 py-6 text-center text-[12px] text-[#9699A6]">
                כל הווידג׳טים מוסתרים
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E6E9EF]">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-3.5 py-[7px] text-[13px] font-medium text-[#323338] rounded-[4px] hover:bg-[#F5F6F8] transition-colors disabled:opacity-50"
        >
          ביטול
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-[7px] text-[13px] font-semibold bg-[#0073EA] hover:bg-[#0060C2] text-white rounded-[4px] transition-colors disabled:opacity-50"
        >
          {saving ? "שומר…" : "שמירה"}
        </button>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// Sortable row
// ──────────────────────────────────────────────────────────────
interface RowProps {
  config: DashboardWidgetConfig;
  onToggle: () => void;
  onSize: (s: DashboardWidgetSize) => void;
}

function SortableRow({ config, onToggle, onSize }: RowProps) {
  const meta = WIDGET_REGISTRY[config.id];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!meta) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-colors ${
        config.visible
          ? "border-[#E6E9EF]"
          : "border-[#E6E9EF] bg-[#FAFBFC] opacity-60"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1.5 rounded-[4px] text-[#9699A6] hover:bg-[#F5F6F8] cursor-grab active:cursor-grabbing"
        aria-label="גרור לסידור מחדש"
      >
        <GripVertical size={16} />
      </button>

      {/* Icon + title */}
      <div className="w-8 h-8 rounded-lg bg-[#F5F6F8] flex items-center justify-center text-[#676879] flex-shrink-0">
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#323338] truncate">
          {meta.title}
        </p>
        <p className="text-[11px] text-[#9699A6] truncate">
          {meta.description}
        </p>
      </div>

      {/* Size picker */}
      {meta.resizable && (
        <div className="flex items-center rounded-[6px] bg-[#F5F6F8] p-0.5">
          {SIZE_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => onSize(s)}
              disabled={!config.visible}
              className={`w-7 h-6 text-[11px] font-bold rounded-[4px] transition-colors ${
                config.size === s
                  ? "bg-white text-[#323338] shadow-sm"
                  : "text-[#9699A6] hover:text-[#323338]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={`גודל ${SIZE_LABELS[s]}`}
            >
              {SIZE_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Show/hide toggle */}
      <button
        onClick={onToggle}
        disabled={!meta.hideable}
        className={`p-1.5 rounded-[4px] transition-colors ${
          config.visible
            ? "text-[#00CA72] hover:bg-[#D6F5E8]"
            : "text-[#9699A6] hover:bg-[#F5F6F8]"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label={config.visible ? "הסתר" : "הצג"}
      >
        {config.visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}
