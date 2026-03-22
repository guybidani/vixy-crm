import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";
import { useAuth } from "../../hooks/useAuth";
import { updateWorkspaceOptions } from "../../api/settings";

// Preset color palette (Monday-style)
const COLOR_PRESETS = [
  "#6161FF",
  "#579BFC",
  "#66CCFF",
  "#00CA72",
  "#25D366",
  "#CAB641",
  "#FDAB3D",
  "#FF642E",
  "#FB275D",
  "#A25DDC",
  "#FF7EB3",
  "#C4C4C4",
  "#323338",
  "#676879",
];

interface CategoryConfig {
  title: string;
  settingsKey: string;
  supportsHidden: boolean;
}

const CATEGORIES: CategoryConfig[] = [
  {
    title: "שלבי עסקה",
    settingsKey: "dealStages",
    supportsHidden: true,
  },
  {
    title: "עדיפויות",
    settingsKey: "priorities",
    supportsHidden: false,
  },
  {
    title: "סטטוסי פניות",
    settingsKey: "ticketStatuses",
    supportsHidden: true,
  },
  {
    title: "סטטוסי משימות",
    settingsKey: "taskStatuses",
    supportsHidden: true,
  },
  {
    title: "סטטוסי אנשי קשר",
    settingsKey: "contactStatuses",
    supportsHidden: true,
  },
  {
    title: "סטטוסי חברות",
    settingsKey: "companyStatuses",
    supportsHidden: true,
  },
  {
    title: "ערוצי פניות",
    settingsKey: "ticketChannels",
    supportsHidden: false,
  },
];

export default function OptionsTab() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useAuth();
  const workspaceOptions = useWorkspaceOptions();

  // Local draft state for all categories
  const [draft, setDraft] = useState<Record<string, Record<string, any>>>(() =>
    buildDraft(workspaceOptions),
  );
  const [leadSourcesDraft, setLeadSourcesDraft] = useState<string[]>(
    () => workspaceOptions.leadSources,
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "dealStages",
  );
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, any> = {};
      for (const cat of CATEGORIES) {
        const options = draft[cat.settingsKey];
        if (options) {
          payload[cat.settingsKey] = options;
        }
      }
      payload.leadSources = leadSourcesDraft;
      return updateWorkspaceOptions(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-options", currentWorkspaceId],
      });
      toast.success("ההגדרות נשמרו בהצלחה");
      setHasChanges(false);
    },
    onError: () => {
      toast.error("שגיאה בשמירת ההגדרות");
    },
  });

  const updateOption = useCallback(
    (category: string, key: string, field: string, value: any) => {
      setDraft((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: {
            ...prev[category]?.[key],
            [field]: value,
          },
        },
      }));
      setHasChanges(true);
    },
    [],
  );

  const resetDraft = useCallback(() => {
    setDraft(buildDraft(workspaceOptions));
    setLeadSourcesDraft(workspaceOptions.leadSources);
    setHasChanges(false);
  }, [workspaceOptions]);

  return (
    <div className="space-y-4">
      {/* Sticky save bar */}
      {hasChanges && (
        <div className="sticky top-16 z-20 bg-primary/95 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm font-medium">יש שינויים שלא נשמרו</span>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDraft}
              className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw size={12} />
              ביטול
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 text-xs bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-1"
            >
              <Save size={12} />
              {saveMutation.isPending ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        </div>
      )}

      {/* Option categories */}
      {CATEGORIES.map((cat) => {
        const isExpanded = expandedCategory === cat.settingsKey;
        const options = draft[cat.settingsKey] || {};
        const entries = Object.entries(options).sort(
          ([, a]: any, [, b]: any) => (a.order ?? 99) - (b.order ?? 99),
        );

        return (
          <div
            key={cat.settingsKey}
            className="bg-white rounded-xl shadow-card overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedCategory(isExpanded ? null : cat.settingsKey)
              }
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">
                  {cat.title}
                </h3>
                <span className="text-xs text-text-tertiary">
                  ({entries.length})
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp size={16} className="text-text-tertiary" />
              ) : (
                <ChevronDown size={16} className="text-text-tertiary" />
              )}
            </button>

            {isExpanded && (
              <div className="px-5 pb-4 space-y-2">
                {entries.map(([key, opt]: [string, any]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-secondary/50 group"
                  >
                    {/* Color */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setColorPickerOpen(
                            colorPickerOpen === `${cat.settingsKey}-${key}`
                              ? null
                              : `${cat.settingsKey}-${key}`,
                          )
                        }
                        className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ backgroundColor: opt.color }}
                        aria-label={`צבע ${opt.label}`}
                      />
                      {colorPickerOpen === `${cat.settingsKey}-${key}` && (
                        <div className="absolute top-9 right-0 z-30 bg-white rounded-lg shadow-xl border border-border-light p-2 grid grid-cols-7 gap-1.5 min-w-[180px]">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                updateOption(cat.settingsKey, key, "color", c);
                                setColorPickerOpen(null);
                              }}
                              className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                                opt.color === c
                                  ? "border-text-primary"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: c }}
                              aria-label={c}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <input
                      value={opt.label}
                      onChange={(e) =>
                        updateOption(
                          cat.settingsKey,
                          key,
                          "label",
                          e.target.value,
                        )
                      }
                      className="flex-1 text-sm text-text-primary bg-transparent border-b border-transparent focus:border-primary outline-none py-1 transition-colors"
                    />

                    {/* Key badge */}
                    <span className="text-[10px] text-text-tertiary bg-surface-secondary px-2 py-0.5 rounded font-mono">
                      {key}
                    </span>

                    {/* Hidden toggle */}
                    {cat.supportsHidden && (
                      <button
                        onClick={() =>
                          updateOption(
                            cat.settingsKey,
                            key,
                            "hidden",
                            !opt.hidden,
                          )
                        }
                        className={`p-1 rounded transition-colors ${
                          opt.hidden
                            ? "text-text-tertiary hover:text-text-secondary"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                        title={opt.hidden ? "הצג אפשרות" : "הסתר אפשרות"}
                        aria-label={opt.hidden ? "הצג אפשרות" : "הסתר אפשרות"}
                      >
                        {opt.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Lead Sources */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <button
          onClick={() =>
            setExpandedCategory(
              expandedCategory === "leadSources" ? null : "leadSources",
            )
          }
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text-primary">
              מקורות לידים
            </h3>
            <span className="text-xs text-text-tertiary">
              ({leadSourcesDraft.length})
            </span>
          </div>
          {expandedCategory === "leadSources" ? (
            <ChevronUp size={16} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={16} className="text-text-tertiary" />
          )}
        </button>

        {expandedCategory === "leadSources" && (
          <div className="px-5 pb-4 space-y-2">
            {leadSourcesDraft.map((source, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={source}
                  onChange={(e) => {
                    const next = [...leadSourcesDraft];
                    next[idx] = e.target.value;
                    setLeadSourcesDraft(next);
                    setHasChanges(true);
                  }}
                  className="flex-1 text-sm text-text-primary border border-border-light rounded-lg px-3 py-1.5 focus:border-primary outline-none transition-colors"
                />
                <button
                  onClick={() => {
                    setLeadSourcesDraft(
                      leadSourcesDraft.filter((_, i) => i !== idx),
                    );
                    setHasChanges(true);
                  }}
                  className="p-1 text-text-tertiary hover:text-danger transition-colors"
                  aria-label="הסר מקור"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setLeadSourcesDraft([...leadSourcesDraft, ""]);
                setHasChanges(true);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium mt-1"
            >
              <Plus size={14} />
              הוסף מקור
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Build initial draft from current workspace options. */
function buildDraft(
  opts: ReturnType<typeof useWorkspaceOptions>,
): Record<string, Record<string, any>> {
  const result: Record<string, Record<string, any>> = {};
  for (const cat of CATEGORIES) {
    const key = cat.settingsKey as keyof typeof opts;
    const val = opts[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      result[cat.settingsKey] = JSON.parse(JSON.stringify(val));
    }
  }
  return result;
}
