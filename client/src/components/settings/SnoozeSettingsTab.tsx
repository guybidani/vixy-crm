import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import {
  updateSnoozeOptions,
  type SnoozeOption,
} from "../../api/settings";
import { useSnoozeOptions, DEFAULT_SNOOZE_OPTIONS } from "../../hooks/useSnoozeOptions";
import { useAuth } from "../../hooks/useAuth";

type DurationUnit = "minutes" | "hours" | "days";

interface EditableRow {
  id: string;
  label: string;
  durationValue: number;
  durationUnit: DurationUnit;
  special?: string;
}

function toMinutes(value: number, unit: DurationUnit): number {
  switch (unit) {
    case "minutes":
      return value;
    case "hours":
      return value * 60;
    case "days":
      return value * 60 * 24;
  }
}

function fromMinutes(minutes: number): { value: number; unit: DurationUnit } {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: "days" };
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: "hours" };
  }
  return { value: minutes, unit: "minutes" };
}

function optionToRow(opt: SnoozeOption): EditableRow {
  if (opt.special) {
    return {
      id: crypto.randomUUID(),
      label: opt.label,
      durationValue: 0,
      durationUnit: "minutes",
      special: opt.special,
    };
  }
  const { value, unit } = fromMinutes(opt.minutes);
  return {
    id: crypto.randomUUID(),
    label: opt.label,
    durationValue: value,
    durationUnit: unit,
  };
}

function rowToOption(row: EditableRow): SnoozeOption {
  if (row.special) {
    return { label: row.label, minutes: -1, special: row.special };
  }
  return { label: row.label, minutes: toMinutes(row.durationValue, row.durationUnit) };
}

const SPECIAL_PRESETS: { label: string; special: string }[] = [
  { label: "מחר בבוקר", special: "tomorrow_9am" },
  { label: "עוד שבוע בבוקר", special: "next_sunday_9am" },
];

const UNIT_LABELS: Record<DurationUnit, string> = {
  minutes: "דקות",
  hours: "שעות",
  days: "ימים",
};

export default function SnoozeSettingsTab() {
  const { workspaces, currentWorkspaceId } = useAuth();
  const currentRole = workspaces.find((w) => w.id === currentWorkspaceId)?.role;
  const isAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

  const { snoozeOptions, isLoading } = useSnoozeOptions();
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [dirty, setDirty] = useState(false);

  // Initialize rows from server data
  useEffect(() => {
    if (!isLoading) {
      setRows(snoozeOptions.map(optionToRow));
      setDirty(false);
    }
  }, [snoozeOptions, isLoading]);

  const mutation = useMutation({
    mutationFn: (options: SnoozeOption[]) => updateSnoozeOptions(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snooze-options"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-options"] });
      toast.success("הגדרות דחייה נשמרו");
      setDirty(false);
    },
    onError: () => {
      toast.error("שגיאה בשמירת הגדרות");
    },
  });

  function updateRow(id: string, updates: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
    setDirty(true);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  }

  function addDurationRow() {
    if (rows.length >= 10) {
      toast.error("עד 10 אפשרויות");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "",
        durationValue: 30,
        durationUnit: "minutes" as DurationUnit,
      },
    ]);
    setDirty(true);
  }

  function addSpecialPreset(preset: { label: string; special: string }) {
    if (rows.length >= 10) {
      toast.error("עד 10 אפשרויות");
      return;
    }
    // Don't add if already exists
    if (rows.some((r) => r.special === preset.special)) {
      toast.error("אפשרות זו כבר קיימת");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: preset.label,
        durationValue: 0,
        durationUnit: "minutes" as DurationUnit,
        special: preset.special,
      },
    ]);
    setDirty(true);
  }

  function resetToDefaults() {
    setRows(DEFAULT_SNOOZE_OPTIONS.map(optionToRow));
    setDirty(true);
  }

  function handleSave() {
    // Validate
    const invalid = rows.find(
      (r) => !r.label.trim() || (!r.special && r.durationValue <= 0),
    );
    if (invalid) {
      toast.error("יש למלא תווית ומשך זמן חיובי לכל אפשרות");
      return;
    }
    if (rows.length === 0) {
      toast.error("חובה לפחות אפשרות אחת");
      return;
    }
    mutation.mutate(rows.map(rowToOption));
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-40" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const availablePresets = SPECIAL_PRESETS.filter(
    (p) => !rows.some((r) => r.special === p.special),
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              הגדרות דחייה
            </h2>
            <p className="text-xs text-text-tertiary mt-1">
              הגדר אפשרויות דחייה מהירות למשימות. חברי הצוות יראו אפשרויות אלו
              בתפריט הדחייה.
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-tertiary hover:text-text-secondary border border-border-light rounded-lg hover:bg-gray-50 transition-colors"
                title="חזור לברירת מחדל"
              >
                <RotateCcw size={14} />
                ברירת מחדל
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || mutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={14} />
                {mutation.isPending ? "שומר..." : "שמור"}
              </button>
            </div>
          )}
        </div>

        {/* Options list */}
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg border border-border-light"
            >
              {/* Label */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) =>
                    updateRow(row.id, { label: e.target.value })
                  }
                  placeholder="תווית (למשל: שעתיים)"
                  disabled={!isAdmin}
                  className="w-full text-sm font-medium bg-white border border-border-light rounded-md px-3 py-1.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                  dir="rtl"
                />
              </div>

              {/* Duration or Special badge */}
              {row.special ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200 whitespace-nowrap">
                  {row.special === "tomorrow_9am" && "מחר 09:00"}
                  {row.special === "next_sunday_9am" && "יום ראשון 09:00"}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={row.durationValue}
                    onChange={(e) =>
                      updateRow(row.id, {
                        durationValue: Math.max(
                          1,
                          Math.min(999, parseInt(e.target.value) || 1),
                        ),
                      })
                    }
                    min={1}
                    max={999}
                    disabled={!isAdmin}
                    className="w-16 text-sm text-center bg-white border border-border-light rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  <select
                    value={row.durationUnit}
                    onChange={(e) =>
                      updateRow(row.id, {
                        durationUnit: e.target.value as DurationUnit,
                      })
                    }
                    disabled={!isAdmin}
                    className="text-sm bg-white border border-border-light rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    dir="rtl"
                  >
                    {(Object.entries(UNIT_LABELS) as [DurationUnit, string][]).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}

              {/* Delete */}
              {isAdmin && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="מחק"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {rows.length === 0 && (
            <div className="text-center py-8 text-text-tertiary text-sm">
              אין אפשרויות דחייה מוגדרות. הוסף אפשרות או חזור לברירת מחדל.
            </div>
          )}
        </div>

        {/* Add buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={addDurationRow}
              disabled={rows.length >= 10}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
              הוסף אפשרות
            </button>

            {availablePresets.map((preset) => (
              <button
                key={preset.special}
                onClick={() => addSpecialPreset(preset)}
                disabled={rows.length >= 10}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} />
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-text-tertiary mt-4">
          כל חבר צוות יוכל גם לבחור &quot;מותאם אישית...&quot; כדי לדחות
          בזמן חופשי (דקות / שעות / ימים).
        </p>
      </div>
    </div>
  );
}
