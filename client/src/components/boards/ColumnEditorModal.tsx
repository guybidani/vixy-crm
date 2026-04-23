import { type ReactNode, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Hash } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";
import Modal from "../shared/Modal";
import { addBoardColumn } from "../../api/boards";

interface ColumnTypeEntry {
  value: string;
  label: string;
  /** String char/emoji, or a ReactNode (lucide icon) */
  icon: string | ReactNode;
  /** True when icon is an SVG component rather than a text char */
  isIcon?: boolean;
}

const COLUMN_TYPES: ColumnTypeEntry[] = [
  { value: "TEXT",     label: "טקסט",    icon: "T" },
  { value: "NUMBER",   label: "מספר",    icon: <Hash size={18} />, isIcon: true },
  { value: "DATE",     label: "תאריך",   icon: "📅" },
  { value: "STATUS",   label: "סטטוס",   icon: "●" },
  { value: "PRIORITY", label: "עדיפות",  icon: "⚑" },
  { value: "CHECKBOX", label: "צ'קבוקס", icon: "☑" },
  { value: "EMAIL",    label: "אימייל",  icon: "✉" },
  { value: "PHONE",    label: "טלפון",   icon: "📞" },
  { value: "LINK",     label: "קישור",   icon: "🔗" },
  { value: "PERSON",   label: "אחראי",   icon: "👤" },
];

const DEFAULT_COLORS = [
  "#00C875",
  "#FDAB3D",
  "#E2445C",
  "#579BFC",
  "#A25DDC",
  "#0073EA",
  "#FF642E",
  "#66CCFF",
  "#C4C4C4",
  "#333333",
];

interface ColumnEditorModalProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
}

export default function ColumnEditorModal({
  open,
  onClose,
  boardId,
}: ColumnEditorModalProps) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");

  const STATUS_DEFAULTS = [
    { key: "todo", label: "לביצוע", color: "#579BFC" },
    { key: "in_progress", label: "בתהליך", color: "#FDAB3D" },
    { key: "done", label: "הושלם", color: "#00C875" },
    { key: "stuck", label: "תקוע", color: "#E2445C" },
    { key: "waiting", label: "בהמתנה", color: "#9D99B9" },
    { key: "not_relevant", label: "לא רלוונטי", color: "#C4C4C4" },
  ];
  const PRIORITY_DEFAULTS = [
    { key: "low", label: "נמוך", color: "#66CCFF" },
    { key: "medium", label: "בינוני", color: "#0073EA" },
    { key: "high", label: "גבוה", color: "#FDAB3D" },
    { key: "urgent", label: "דחוף", color: "#E2445C" },
  ];

  function handleTypeChange(newType: string) {
    setType(newType);
    if (newType === "STATUS") setOptions(STATUS_DEFAULTS);
    if (newType === "PRIORITY") setOptions(PRIORITY_DEFAULTS);
    // Auto-fill label with the type's Hebrew name if label is empty or matches another type label
    const currentTypeLabels = COLUMN_TYPES.map((ct) => ct.label);
    if (!label.trim() || currentTypeLabels.includes(label.trim())) {
      const found = COLUMN_TYPES.find((ct) => ct.value === newType);
      if (found) setLabel(found.label);
    }
  }
  const [options, setOptions] = useState<
    Array<{ key: string; label: string; color: string }>
  >(STATUS_DEFAULTS);

  const addMut = useMutation({
    mutationFn: (data: Parameters<typeof addBoardColumn>[1]) =>
      addBoardColumn(boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onClose();
      resetForm();
    },
    onError: () => toast.error("שגיאה בהוספת עמודה"),
  });

  function resetForm() {
    setLabel("");
    setType("TEXT");
    setOptions(STATUS_DEFAULTS);
  }

  function handleSubmit() {
    if (!label.trim()) return;
    const key = label
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, "_")
      .replace(/_+/g, "_");

    const data: Parameters<typeof addBoardColumn>[1] = {
      key: key || `col_${Date.now()}`,
      label: label.trim(),
      type,
    };

    if (type === "STATUS" || type === "PRIORITY") {
      data.options = options.filter((o) => o.label.trim());
    }

    addMut.mutate(data);
  }

  const showOptions = type === "STATUS" || type === "PRIORITY";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="הוסף עמודה"
      maxWidth="wide"
    >
      <div className="p-6 space-y-5">
        {/* Column Name */}
        <div>
          <label className="form-label">
            שם העמודה<span className="form-required">*</span>
          </label>
          <input
            autoFocus
            className="input"
            placeholder="לדוגמה: סטטוס"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        {/* Column Type — icon card grid */}
        <div>
          <label className="form-label">סוג עמודה</label>
          <div className="grid grid-cols-3 gap-2">
            {COLUMN_TYPES.map((ct) => {
              const selected = type === ct.value;
              const isEmoji = typeof ct.icon === "string" && ct.icon.length > 1; // multi-char = emoji
              const isLucide = ct.isIcon === true;
              return (
                <button
                  key={ct.value}
                  onClick={() => handleTypeChange(ct.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all text-center hover:shadow-sm",
                    selected
                      ? "border-[#0073EA] bg-[#EEF4FF] shadow-sm"
                      : "border-[#E6E9EF] bg-white hover:border-[#9699A6]",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-lg font-bold leading-none",
                      isEmoji
                        ? "text-[22px] w-9 h-9"
                        : "w-9 h-9 text-[18px]",
                      selected
                        ? isEmoji ? "" : "text-[#0073EA]"
                        : isEmoji ? "" : "text-[#676879]",
                      !isEmoji && selected && "bg-[#0073EA]/10",
                      !isEmoji && !isLucide && !selected && "bg-[#F6F7FB]",
                      isLucide && !selected && "bg-[#F6F7FB]",
                      isLucide && selected && "bg-[#0073EA]/10",
                    )}
                  >
                    {ct.icon}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-tight",
                      selected ? "text-[#0073EA]" : "text-[#676879]",
                    )}
                  >
                    {ct.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status/Priority Options */}
        {showOptions && (
          <div>
            <label className="form-label">אפשרויות סטטוס</label>
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 group/opt">
                  {/* Monday-style colored pill preview */}
                  <div
                    className="h-7 min-w-[80px] flex-1 rounded-[4px] flex items-center justify-center text-white text-[12px] font-semibold cursor-text relative"
                    style={{ backgroundColor: opt.color }}
                  >
                    <input
                      className="w-full bg-transparent text-white text-center text-[12px] font-semibold placeholder-white/70 outline-none border-none"
                      placeholder="שם אפשרות..."
                      value={opt.label}
                      onChange={(e) => {
                        const updated = [...options];
                        updated[i] = {
                          ...updated[i],
                          label: e.target.value,
                          key: e.target.value
                            .toLowerCase()
                            .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, "_") || `option_${i}`,
                        };
                        setOptions(updated);
                      }}
                    />
                  </div>
                  {/* Color picker dots */}
                  <div className="relative group/color flex-shrink-0">
                    <button
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0 hover:scale-110 transition-transform"
                      style={{ backgroundColor: opt.color }}
                    />
                    <div className="absolute top-full mt-1 right-0 z-20 bg-white shadow-xl border border-[#E6E9EF] rounded-[8px] p-2 hidden group-hover/color:grid grid-cols-5 gap-1.5 min-w-[150px]">
                      {DEFAULT_COLORS.map((c) => (
                        <button
                          key={c}
                          className={cn(
                            "w-6 h-6 rounded-full hover:scale-110 transition-transform",
                            c === opt.color && "ring-2 ring-offset-1 ring-[#323338]",
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            const updated = [...options];
                            updated[i] = { ...updated[i], color: c };
                            setOptions(updated);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Delete */}
                  {options.length > 1 && (
                    <button
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="p-1 text-[#9699A6] hover:text-[#E2445C] transition-colors opacity-0 group-hover/opt:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  setOptions([
                    ...options,
                    {
                      key: `option_${options.length + 1}`,
                      label: "",
                      color:
                        DEFAULT_COLORS[options.length % DEFAULT_COLORS.length],
                    },
                  ])
                }
                className="flex items-center gap-1 text-[12px] text-[#0073EA] hover:underline"
              >
                <Plus size={12} />
                הוסף אפשרות
              </button>
            </div>
          </div>
        )}

        {/* Footer — RTL: cancel first, primary at end */}
        <div className="flex items-center justify-start gap-2 pt-4 border-t border-[#E6E9EF]">
          <button
            type="button"
            onClick={onClose}
            className="modal-btn-secondary"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!label.trim() || addMut.isPending}
            className="modal-btn-primary"
          >
            {addMut.isPending ? "מוסיף..." : "הוסף עמודה"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
