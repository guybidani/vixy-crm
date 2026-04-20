import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save, Type } from "lucide-react";
import toast from "react-hot-toast";
import { updateModuleLabels } from "../../api/settings";
import {
  useWorkspaceOptions,
  DEFAULT_MODULE_LABELS,
} from "../../hooks/useWorkspaceOptions";
import { useAuth } from "../../hooks/useAuth";
import { handleMutationError } from "../../lib/utils";

const MODULE_ICONS: Record<string, string> = {
  dashboard: "📊",
  contacts: "👥",
  companies: "🏢",
  deals: "🤝",
  leads: "📥",
  tasks: "✅",
  tickets: "🎧",
  documents: "📄",
  knowledge: "📚",
  templates: "📋",
  automations: "⚡",
  reports: "📈",
  analytics: "📉",
  history: "🕐",
  import: "📤",
};

// Derived from DEFAULT_MODULE_LABELS — JS objects preserve insertion order,
// so this matches the original hardcoded array. Keeping the order defined
// in one place prevents drift when new modules are added.
const MODULE_ORDER = Object.keys(DEFAULT_MODULE_LABELS);

export default function ModuleLabelsTab() {
  const { moduleLabels } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [labels, setLabels] = useState<Record<string, string>>(moduleLabels);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when server data changes — but only if user hasn't made local edits
  useEffect(() => {
    if (!hasChanges) {
      setLabels(moduleLabels);
    }
  }, [moduleLabels, hasChanges]);

  const saveMut = useMutation<unknown, Error, void>({
    mutationFn: () => updateModuleLabels(labels),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-options", currentWorkspaceId],
      });
      toast.success("שמות המודולים עודכנו");
      setHasChanges(false);
    },
    onError: (err) => handleMutationError(err),
  });

  function handleChange(key: string, value: string) {
    setLabels((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function resetOne(key: string) {
    setLabels((prev) => ({ ...prev, [key]: DEFAULT_MODULE_LABELS[key] }));
    setHasChanges(true);
  }

  function resetAll() {
    setLabels({ ...DEFAULT_MODULE_LABELS });
    setHasChanges(true);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6E9EF]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#323338] flex items-center gap-2">
                <Type size={16} className="text-[#0073EA]" />
                שמות מודולים
              </h2>
              <p className="text-xs text-[#9699A6] mt-1">
                התאם אישית את שמות המודולים בתפריט הניווט ובכותרות העמודים
              </p>
            </div>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#676879] border border-[#D0D4E4] rounded-[4px] hover:border-[#FB275D] hover:text-[#FB275D] transition-colors"
            >
              <RotateCcw size={12} />
              אפס הכל
            </button>
          </div>
        </div>

        {/* Module rows */}
        <div className="divide-y divide-[#E6E9EF]">
          {MODULE_ORDER.map((key) => {
            const isDefault = labels[key] === DEFAULT_MODULE_LABELS[key];
            return (
              <div
                key={key}
                className="flex items-center gap-4 px-6 py-3 hover:bg-[#F5F6FF] transition-colors"
              >
                {/* Module icon + key */}
                <div className="flex items-center gap-2.5 w-32 flex-shrink-0">
                  <span className="text-lg leading-none select-none">
                    {MODULE_ICONS[key]}
                  </span>
                  <span className="text-[11px] font-mono text-[#9699A6] uppercase">
                    {key}
                  </span>
                </div>

                {/* Default label */}
                <div className="w-28 flex-shrink-0">
                  <span className="text-xs text-[#9699A6]">
                    ברירת מחדל: {DEFAULT_MODULE_LABELS[key]}
                  </span>
                </div>

                {/* Input */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={labels[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors ${
                      isDefault
                        ? "border-[#E6E9EF] bg-white"
                        : "border-[#0073EA] bg-[#F5F6FF]"
                    }`}
                    dir="rtl"
                  />
                </div>

                {/* Reset single */}
                {!isDefault && (
                  <button
                    onClick={() => resetOne(key)}
                    className="p-1.5 rounded-md hover:bg-[#FFEEF0] transition-colors group flex-shrink-0"
                    title="אפס לברירת מחדל"
                  >
                    <RotateCcw
                      size={13}
                      className="text-[#9699A6] group-hover:text-[#FB275D] transition-colors"
                    />
                  </button>
                )}
                {isDefault && <span className="w-[30px] flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Save bar */}
        {hasChanges && (
          <div className="px-6 py-4 bg-[#F5F6F8] border-t border-[#E6E9EF] flex items-center justify-between">
            <p className="text-xs text-[#676879]">
              יש שינויים שלא נשמרו
            </p>
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
            >
              <Save size={14} />
              {saveMut.isPending ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
