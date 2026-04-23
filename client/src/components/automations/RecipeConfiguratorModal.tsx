import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Modal from "../shared/Modal";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import {
  useWorkspaceOptions,
  sortedEntries,
} from "../../hooks/useWorkspaceOptions";
import { getWorkspaceMembers } from "../../api/auth";
import { listTags } from "../../api/tags";
import {
  buildWorkflowFromRecipe,
  type RecipePlaceholder,
  type RecipeTemplate,
} from "../../lib/automation-recipes";

interface RecipeConfiguratorModalProps {
  recipe: RecipeTemplate;
  onClose: () => void;
  onCreate: (payload: ReturnType<typeof buildWorkflowFromRecipe>) => void;
  isCreating: boolean;
}

/**
 * Renders a single placeholder's input control. Dropdown options come from
 * workspace data (statuses, stages, members, tags, priorities) — or free text
 * for text/days/tag inputs.
 */
function PlaceholderControl({
  placeholder,
  value,
  onChange,
  options,
}: {
  placeholder: RecipePlaceholder;
  value: string;
  onChange: (v: string) => void;
  options: PlaceholderOptions;
}) {
  const baseClass =
    "inline-block px-2 py-0.5 rounded-full bg-[#CCE5FF] text-[#0073EA] font-medium text-[13px] border-none outline-none focus:ring-2 focus:ring-[#0073EA]/40 align-middle min-w-[90px] max-w-[220px]";

  switch (placeholder.type) {
    case "status": {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseClass, "cursor-pointer")}
        >
          <option value="" disabled>
            בחר סטטוס
          </option>
          {options.contactStatuses.map(([key, opt]) => (
            <option key={key} value={key}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    case "stage": {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseClass, "cursor-pointer")}
        >
          <option value="" disabled>
            בחר שלב
          </option>
          {options.dealStages.map(([key, opt]) => (
            <option key={key} value={key}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    case "priority": {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseClass, "cursor-pointer")}
        >
          <option value="" disabled>
            בחר עדיפות
          </option>
          {options.priorities.map(([key, opt]) => (
            <option key={key} value={key}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    case "member": {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseClass, "cursor-pointer")}
        >
          <option value="" disabled>
            בחר חבר צוות
          </option>
          {options.members.map((m) => (
            <option key={m.memberId} value={m.memberId}>
              {m.name}
            </option>
          ))}
        </select>
      );
    }
    case "tag": {
      // Allow picking an existing tag OR typing a new tag name.
      return (
        <input
          type="text"
          value={value}
          list={`tags-datalist-${placeholder.key}`}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder.label}
          className={cn(baseClass, "px-3")}
        />
      );
    }
    case "days": {
      return (
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder.label}
          className={cn(baseClass, "px-3 w-24")}
        />
      );
    }
    case "text":
    default: {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder.label}
          className={cn(baseClass, "px-3")}
        />
      );
    }
  }
}

interface PlaceholderOptions {
  contactStatuses: [string, { label: string; color: string }][];
  dealStages: [string, { label: string; color: string }][];
  priorities: [string, { label: string; color: string }][];
  members: Array<{ memberId: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
}

export default function RecipeConfiguratorModal({
  recipe,
  onClose,
  onCreate,
  isCreating,
}: RecipeConfiguratorModalProps) {
  const { currentWorkspaceId } = useAuth();
  const workspaceOptions = useWorkspaceOptions();

  // Whether the recipe uses member/tag placeholders determines what we fetch.
  const needsMembers = recipe.placeholders.some((p) => p.type === "member");
  const needsTags = recipe.placeholders.some((p) => p.type === "tag");

  const membersQuery = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: needsMembers && !!currentWorkspaceId,
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
    enabled: needsTags,
  });

  // Initialise state with each placeholder's defaultValue (or "").
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of recipe.placeholders) {
      initial[p.key] = p.defaultValue ?? "";
    }
    return initial;
  });

  const options = useMemo<PlaceholderOptions>(() => {
    return {
      contactStatuses: sortedEntries(workspaceOptions.contactStatuses),
      dealStages: sortedEntries(workspaceOptions.dealStages),
      priorities: sortedEntries(workspaceOptions.priorities),
      members:
        membersQuery.data?.map((m) => ({
          memberId: m.memberId,
          name: m.name || m.email,
        })) ?? [],
      tags:
        tagsQuery.data?.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
        })) ?? [],
    };
  }, [workspaceOptions, membersQuery.data, tagsQuery.data]);

  const allFilled = recipe.placeholders.every(
    (p) => values[p.key] !== undefined && values[p.key]!.toString().trim() !== "",
  );

  // Split sentence into parts + placeholder pills for rendering.
  const parts = useMemo(
    () => recipe.sentence.split(/(\{\{\w+\}\})/g),
    [recipe.sentence],
  );

  const handleCreate = () => {
    if (!allFilled || isCreating) return;
    const payload = buildWorkflowFromRecipe(recipe, values);
    onCreate(payload);
  };

  const loadingDeps =
    (needsMembers && membersQuery.isLoading) ||
    (needsTags && tagsQuery.isLoading);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="הגדרת אוטומציה"
      maxWidth="max-w-2xl"
    >
      <div className="p-6 space-y-5">
        {/* Header with icon + template name */}
        <div className="flex items-start gap-3 pb-4 border-b border-[#E6E9EF]">
          <div className="w-12 h-12 rounded-full bg-[#0073EA]/10 flex items-center justify-center text-[22px] flex-shrink-0">
            {recipe.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[#323338]">
              {recipe.template.name}
            </h3>
            <p className="text-[12px] text-[#9699A6] mt-0.5">
              מלא את הפרטים כדי להפעיל את המתכון הזה
            </p>
          </div>
        </div>

        {/* Interactive sentence */}
        {loadingDeps ? (
          <div className="flex items-center gap-2 text-[13px] text-[#9699A6] py-6">
            <Loader2 size={14} className="animate-spin" />
            טוען אפשרויות...
          </div>
        ) : (
          <div
            className="p-5 bg-[#F6F7FB] rounded-[8px] text-[14px] leading-[2.2] text-[#323338]"
            dir="rtl"
          >
            {parts.map((part, i) => {
              const match = part.match(/^\{\{(\w+)\}\}$/);
              if (match) {
                const key = match[1];
                const ph = recipe.placeholders.find((p) => p.key === key);
                if (!ph) {
                  // Unknown placeholder — leave as-is (runtime field like {{firstName}})
                  return <span key={i}>{part}</span>;
                }
                return (
                  <PlaceholderControl
                    key={i}
                    placeholder={ph}
                    value={values[key] ?? ""}
                    onChange={(v) =>
                      setValues((prev) => ({ ...prev, [key]: v }))
                    }
                    options={options}
                  />
                );
              }
              return <span key={i}>{part}</span>;
            })}
            {/* Datalists for tag inputs */}
            {recipe.placeholders
              .filter((p) => p.type === "tag")
              .map((p) => (
                <datalist key={p.key} id={`tags-datalist-${p.key}`}>
                  {options.tags.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              ))}
          </div>
        )}

        {/* Hint / preview */}
        {recipe.placeholders.length === 0 && (
          <p className="text-[12px] text-[#9699A6]">
            המתכון מוכן להפעלה — אין שדות נוספים למלא.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E6E9EF]">
        <button
          onClick={onClose}
          className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338]"
          disabled={isCreating}
        >
          ביטול
        </button>
        <button
          onClick={handleCreate}
          disabled={!allFilled || isCreating}
          className="px-6 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreating && <Loader2 size={14} className="animate-spin" />}
          צור אוטומציה
        </button>
      </div>
    </Modal>
  );
}
