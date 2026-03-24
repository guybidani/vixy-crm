import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import Modal from "../shared/Modal";
import { addBoardColumn } from "../../api/boards";

const COLUMN_TYPES = [
  { value: "TEXT",     label: "טקסט",    icon: "T" },
  { value: "NUMBER",   label: "מספר",    icon: "#" },
  { value: "DATE",     label: "תאריך",   icon: "📅" },
  { value: "STATUS",   label: "סטטוס",   icon: "●" },
  { value: "PRIORITY", label: "עדיפות",  icon: "⚑" },
  { value: "CHECKBOX", label: "צ'קבוקס", icon: "☑" },
  { value: "EMAIL",    label: "אימייל",  icon: "✉" },
  { value: "PHONE",    label: "טלפון",   icon: "📞" },
  { value: "LINK",     label: "קישור",   icon: "🔗" },
  { value: "PERSON",   label: "אחראי",   icon: "👤" },
] as const;

const DEFAULT_COLORS = [
  "#00CA72",
  "#FDAB3D",
  "#FB275D",
  "#579BFC",
  "#A25DDC",
  "#6161FF",
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
  const [options, setOptions] = useState<
    Array<{ key: string; label: string; color: string }>
  >([
    { key: "option1", label: "אפשרות 1", color: "#00CA72" },
    { key: "option2", label: "אפשרות 2", color: "#FDAB3D" },
    { key: "option3", label: "אפשרות 3", color: "#FB275D" },
  ]);

  const addMut = useMutation({
    mutationFn: (data: Parameters<typeof addBoardColumn>[1]) =>
      addBoardColumn(boardId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onClose();
      resetForm();
    },
  });

  function resetForm() {
    setLabel("");
    setType("TEXT");
    setOptions([
      { key: "option1", label: "אפשרות 1", color: "#00CA72" },
      { key: "option2", label: "אפשרות 2", color: "#FDAB3D" },
      { key: "option3", label: "אפשרות 3", color: "#FB275D" },
    ]);
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
      maxWidth="max-w-[520px]"
    >
      <div className="p-6 space-y-5">
        {/* Column Name */}
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1.5">
            שם העמודה
          </label>
          <input
            autoFocus
            className="w-full px-3 py-2.5 border border-[#D0D4E4] rounded-lg text-sm focus:outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]/20"
            placeholder="לדוגמה: סטטוס"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        {/* Column Type — icon card grid */}
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-2">
            סוג עמודה
          </label>
          <div className="grid grid-cols-3 gap-2">
            {COLUMN_TYPES.map((ct) => {
              const selected = type === ct.value;
              const isEmoji = ct.icon.length > 1; // multi-char = emoji
              return (
                <button
                  key={ct.value}
                  onClick={() => setType(ct.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all text-center hover:shadow-sm",
                    selected
                      ? "border-[#0073EA] bg-[#EEF4FF] shadow-sm"
                      : "border-[#E6E9EF] bg-white hover:border-[#C3C6D4]",
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
                      !isEmoji && !selected && "bg-[#F5F6F8]",
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
            <label className="block text-sm font-medium text-[#323338] mb-1.5">
              אפשרויות
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* Color picker */}
                  <div className="relative group">
                    <button
                      className="w-8 h-8 rounded-lg border border-[#E6E9EF] flex-shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                    <div className="absolute top-full mt-1 right-0 z-10 bg-white shadow-xl border border-[#E6E9EF] rounded-lg p-2 hidden group-hover:grid grid-cols-5 gap-1 min-w-[140px]">
                      {DEFAULT_COLORS.map((c) => (
                        <button
                          key={c}
                          className={cn(
                            "w-6 h-6 rounded",
                            c === opt.color &&
                              "ring-2 ring-offset-1 ring-[#323338]",
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
                  {/* Label input */}
                  <input
                    className="flex-1 px-3 py-1.5 border border-[#D0D4E4] rounded-lg text-sm focus:outline-none focus:border-[#0073EA]"
                    value={opt.label}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[i] = {
                        ...updated[i],
                        label: e.target.value,
                        key: e.target.value
                          .toLowerCase()
                          .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, "_"),
                      };
                      setOptions(updated);
                    }}
                  />
                  {/* Delete */}
                  {options.length > 1 && (
                    <button
                      onClick={() =>
                        setOptions(options.filter((_, j) => j !== i))
                      }
                      className="p-1 text-[#C3C6D4] hover:text-[#FB275D] transition-colors"
                    >
                      <Trash2 size={14} />
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!label.trim() || addMut.isPending}
          className="w-full py-2.5 bg-[#0073EA] hover:bg-[#0060C2] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors"
        >
          {addMut.isPending ? "מוסיף..." : "הוסף עמודה"}
        </button>
      </div>
    </Modal>
  );
}
