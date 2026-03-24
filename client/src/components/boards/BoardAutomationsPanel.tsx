import { useState } from "react";
import { X, Zap, Bell, Plus, CalendarClock } from "lucide-react";
import type { AutomationConfig, AutomationTrigger, BoardColumn } from "../../api/boards";

// ── Template definitions ─────────────────────────────────────────

interface AutomationTemplate {
  id: AutomationTrigger;
  icon: React.ReactNode;
  title: string;
  description: string;
  needsColumn: boolean;
  columnTypes: string[];  // which column types are valid
  needsTriggerValue: boolean;
}

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "STATUS_CHANGE",
    icon: <Bell size={18} className="text-[#0073EA]" />,
    title: "כשסטטוס משתנה → שלח התראה",
    description: "כשעמודת סטטוס משתנה לערך מסוים, שלח התראה לאחראי הפריט.",
    needsColumn: true,
    columnTypes: ["STATUS", "PRIORITY"],
    needsTriggerValue: true,
  },
  {
    id: "ITEM_CREATED",
    icon: <Plus size={18} className="text-[#00CA72]" />,
    title: "כשפריט נוצר → שמור משימה",
    description: "כשפריט חדש נוסף לבורד, צור אוטומטית משימת מעקב.",
    needsColumn: false,
    columnTypes: [],
    needsTriggerValue: false,
  },
  {
    id: "DATE_ARRIVED",
    icon: <CalendarClock size={18} className="text-[#FDAB3D]" />,
    title: "כשתאריך מגיע → שלח תזכורת",
    description: "כשתאריך בעמודת תאריך מגיע להיום, צור משימת תזכורת.",
    needsColumn: true,
    columnTypes: ["DATE"],
    needsTriggerValue: false,
  },
];

// ── Props ────────────────────────────────────────────────────────

interface BoardAutomationsPanelProps {
  open: boolean;
  onClose: () => void;
  columns: BoardColumn[];
  automations: AutomationConfig[];
  onSave: (automations: AutomationConfig[]) => void;
  saving?: boolean;
}

// ── Main Component ───────────────────────────────────────────────

export default function BoardAutomationsPanel({
  open,
  onClose,
  columns,
  automations,
  onSave,
  saving,
}: BoardAutomationsPanelProps) {
  const [local, setLocal] = useState<AutomationConfig[]>(automations);
  const [configuring, setConfiguring] = useState<string | null>(null);

  if (!open) return null;

  // ── helpers ────────────────────────────────────────────────────

  function getAutomation(templateId: AutomationTrigger): AutomationConfig | undefined {
    return local.find((a) => a.templateId === templateId);
  }

  function toggleEnabled(templateId: AutomationTrigger) {
    const existing = getAutomation(templateId);
    if (existing) {
      setLocal((prev) =>
        prev.map((a) =>
          a.templateId === templateId ? { ...a, enabled: !a.enabled } : a,
        ),
      );
    } else {
      const newAuto: AutomationConfig = {
        id: crypto.randomUUID(),
        templateId,
        enabled: true,
      };
      setLocal((prev) => [...prev, newAuto]);
      setConfiguring(templateId);
    }
  }

  function updateConfig(
    templateId: AutomationTrigger,
    patch: Partial<Pick<AutomationConfig, "columnId" | "triggerValue">>,
  ) {
    setLocal((prev) =>
      prev.map((a) => (a.templateId === templateId ? { ...a, ...patch } : a)),
    );
  }

  function handleSave() {
    onSave(local);
  }

  // ── render ─────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        className="fixed top-0 right-0 h-full w-[420px] z-50 bg-white shadow-2xl flex flex-col"
        style={{ borderLeft: "1px solid #E6E9EF" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E9EF] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[#FDAB3D]" />
            <span className="text-[15px] font-semibold text-[#323338]">אוטומציות</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F5F6F8] text-[#9699A6] hover:text-[#323338] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-[12px] text-[#9699A6] mb-4">
            בחר אוטומציות שיפעלו על הבורד הזה. הפעל / כבה ועדכן הגדרות לכל אחת.
          </p>

          {AUTOMATION_TEMPLATES.map((tpl) => {
            const auto = getAutomation(tpl.id);
            const isEnabled = auto?.enabled ?? false;
            const isConfiguring = configuring === tpl.id;

            const validColumns = columns.filter((c) =>
              tpl.columnTypes.includes(c.type),
            );

            return (
              <div
                key={tpl.id}
                className={`rounded-xl border transition-all ${
                  isEnabled
                    ? "border-[#0073EA]/30 bg-[#EEF4FF]"
                    : "border-[#E6E9EF] bg-white"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 flex-shrink-0">{tpl.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#323338] leading-snug">
                      {tpl.title}
                    </p>
                    <p className="text-[11px] text-[#9699A6] mt-0.5 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${
                      isEnabled ? "bg-[#0073EA]" : "bg-[#C3C6D4]"
                    }`}
                    onClick={() => toggleEnabled(tpl.id)}
                    title={isEnabled ? "כבה אוטומציה" : "הפעל אוטומציה"}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                        isEnabled ? "translate-x-4" : "translate-x-0.5"
                      } mt-0.5`}
                    />
                  </button>
                </div>

                {/* Enabled indicator */}
                {isEnabled && (
                  <div className="px-4 pb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00CA72] flex-shrink-0" />
                    <span className="text-[11px] text-[#00CA72] font-medium">פעיל</span>
                    <button
                      className="mr-auto text-[11px] text-[#0073EA] hover:underline"
                      onClick={() => setConfiguring(isConfiguring ? null : tpl.id)}
                    >
                      {isConfiguring ? "סגור" : "הגדרות"}
                    </button>
                  </div>
                )}

                {/* Config form */}
                {isEnabled && isConfiguring && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#E6E9EF] pt-3 mt-1">
                    {tpl.needsColumn && (
                      <div>
                        <label className="block text-[11px] font-medium text-[#676879] mb-1">
                          עמודה
                        </label>
                        {validColumns.length === 0 ? (
                          <p className="text-[11px] text-[#FF642E]">
                            אין עמודות מתאימות בבורד זה ({tpl.columnTypes.join(", ")})
                          </p>
                        ) : (
                          <select
                            className="w-full text-[12px] border border-[#D0D4E4] rounded-[6px] px-2.5 py-1.5 text-[#323338] bg-white focus:outline-none focus:border-[#0073EA]"
                            value={auto?.columnId ?? ""}
                            onChange={(e) =>
                              updateConfig(tpl.id, { columnId: e.target.value })
                            }
                          >
                            <option value="">-- בחר עמודה --</option>
                            {validColumns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {tpl.needsTriggerValue && auto?.columnId && (
                      <div>
                        <label className="block text-[11px] font-medium text-[#676879] mb-1">
                          ערך טריגר
                        </label>
                        <input
                          type="text"
                          className="w-full text-[12px] border border-[#D0D4E4] rounded-[6px] px-2.5 py-1.5 text-[#323338] bg-white focus:outline-none focus:border-[#0073EA]"
                          placeholder="לדוג׳: סגור, בביצוע..."
                          value={auto?.triggerValue ?? ""}
                          onChange={(e) =>
                            updateConfig(tpl.id, { triggerValue: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E6E9EF] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-[13px] font-medium bg-[#0073EA] text-white rounded-[6px] hover:bg-[#0060C0] transition-colors disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>
    </>
  );
}
