import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  X,
  Type,
  Hash,
  Calendar,
  List,
  Mail,
  Phone,
  Link2,
  CheckSquare,
  Users,
  Handshake,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../shared/ConfirmDialog";
import Modal from "../shared/Modal";
import {
  listCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  reorderCustomFields,
  type CustomField,
  type SelectOption,
} from "../../api/custom-fields";
import { handleMutationError } from "../../lib/utils";

const ENTITY_TYPES = [
  { key: "contact", label: "אנשי קשר", icon: Users, color: "#0073EA" },
  { key: "deal", label: "עסקאות", icon: Handshake, color: "#00CA72" },
  { key: "company", label: "חברות", icon: Building2, color: "#A25DDC" },
] as const;

const FIELD_TYPES = [
  { value: "text", label: "טקסט", icon: Type },
  { value: "number", label: "מספר", icon: Hash },
  { value: "date", label: "תאריך", icon: Calendar },
  { value: "select", label: "בחירה", icon: List },
  { value: "email", label: "אימייל", icon: Mail },
  { value: "phone", label: "טלפון", icon: Phone },
  { value: "url", label: "קישור", icon: Link2 },
  { value: "checkbox", label: "צ'קבוקס", icon: CheckSquare },
] as const;

const OPTION_COLORS = [
  "#0073EA", "#579BFC", "#66CCFF", "#00CA72", "#25D366",
  "#CAB641", "#FDAB3D", "#FF642E", "#FB275D", "#A25DDC",
  "#FF7EB3", "#C4C4C4",
];

export default function CustomFieldsTab() {
  const [activeEntity, setActiveEntity] = useState<string>("contact");
  const [showCreate, setShowCreate] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<{ id: string; name: string } | null>(null);

  const queryClient = useQueryClient();

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ["custom-fields", activeEntity],
    queryFn: () => listCustomFields(activeEntity),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", activeEntity] });
      toast.success("שדה נמחק");
    },
    onError: (err) => handleMutationError(err, "שגיאה במחיקת שדה"),
  });

  const reorderMut = useMutation({
    mutationFn: (fieldIds: string[]) => reorderCustomFields(activeEntity, fieldIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", activeEntity] });
    },
    onError: (err) => {
      // Revert optimistic cache change by refetching
      queryClient.invalidateQueries({ queryKey: ["custom-fields", activeEntity] });
      handleMutationError(err, "שגיאה בסידור השדות");
    },
  });

  // Simple drag reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    // Read latest cache instead of stale closure `fields`
    const current =
      queryClient.getQueryData<CustomField[]>(["custom-fields", activeEntity]) ?? fields;
    const newFields = [...current];
    const [moved] = newFields.splice(dragIdx, 1);
    newFields.splice(idx, 0, moved);
    // Optimistic reorder via cache
    queryClient.setQueryData(["custom-fields", activeEntity], newFields);
    setDragIdx(idx);
  }

  function handleDragEnd() {
    if (dragIdx === null) return;
    setDragIdx(null);
    // Use latest cache — the closure-captured `fields` is stale after dragOver mutations
    const latest =
      queryClient.getQueryData<CustomField[]>(["custom-fields", activeEntity]) ?? fields;
    const fieldIds = latest.map((f) => f.id);
    reorderMut.mutate(fieldIds);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#323338]">שדות מותאמים</h2>
          <p className="text-xs text-[#9699A6]">
            הוסף שדות מותאמים לאנשי קשר, עסקאות וחברות
          </p>
        </div>
        <button
          onClick={() => { setEditingField(null); setShowCreate(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={16} />
          שדה חדש
        </button>
      </div>

      {/* Entity type tabs */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="flex border-b border-[#E6E9EF]">
          {ENTITY_TYPES.map((et) => {
            const isActive = activeEntity === et.key;
            return (
              <button
                key={et.key}
                onClick={() => setActiveEntity(et.key)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium transition-colors border-b-[2px] -mb-px ${
                  isActive
                    ? "border-[#0073EA] text-[#0073EA]"
                    : "border-transparent text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8]"
                }`}
              >
                <et.icon size={14} />
                {et.label}
              </button>
            );
          })}
        </div>

        {/* Fields list */}
        {isLoading ? (
          <div className="p-8 text-center text-[#9699A6] text-[13px]">טוען...</div>
        ) : fields.length === 0 ? (
          <div className="p-8 text-center text-[#9699A6] text-[13px]">
            אין שדות מותאמים עבור {ENTITY_TYPES.find((e) => e.key === activeEntity)?.label}
          </div>
        ) : (
          <div className="divide-y divide-[#E6E9EF]">
            {fields.map((field, idx) => {
              const ft = FIELD_TYPES.find((t) => t.value === field.fieldType);
              const FtIcon = ft?.icon || Type;
              return (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-[#F5F6F8] transition-colors group cursor-grab active:cursor-grabbing ${
                    dragIdx === idx ? "bg-[#F0F4FF] opacity-70" : ""
                  }`}
                >
                  <GripVertical size={14} className="text-[#C5C7D0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${ENTITY_TYPES.find((e) => e.key === activeEntity)?.color}15` }}
                  >
                    <FtIcon size={14} style={{ color: ENTITY_TYPES.find((e) => e.key === activeEntity)?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#323338]">{field.name}</span>
                      {field.required && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#FFF0F0] text-[#E44258]">
                          חובה
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#9699A6]">
                      {ft?.label || field.fieldType} · {field.key}
                    </span>
                  </div>
                  {field.fieldType === "select" && field.options && (
                    <div className="flex gap-1 flex-shrink-0">
                      {(field.options as SelectOption[]).slice(0, 4).map((opt, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: opt.color || "#579BFC" }}
                        >
                          {opt.label}
                        </span>
                      ))}
                      {(field.options as SelectOption[]).length > 4 && (
                        <span className="text-[10px] text-[#9699A6]">
                          +{(field.options as SelectOption[]).length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => { setEditingField(field); setShowCreate(true); }}
                    className="p-1.5 text-[#9699A6] hover:text-[#0073EA] rounded-[4px] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setFieldToDelete({ id: field.id, name: field.name })}
                    className="p-1.5 text-[#9699A6] hover:text-[#E44258] rounded-[4px] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showCreate && (
        <CustomFieldForm
          editing={editingField}
          entityType={activeEntity}
          onClose={() => { setShowCreate(false); setEditingField(null); }}
        />
      )}

      <ConfirmDialog
        open={!!fieldToDelete}
        onConfirm={() => {
          if (fieldToDelete) deleteMut.mutate(fieldToDelete.id);
          setFieldToDelete(null);
        }}
        onCancel={() => setFieldToDelete(null)}
        title="מחיקת שדה מותאם"
        message={fieldToDelete ? `האם אתה בטוח שברצונך למחוק את השדה "${fieldToDelete.name}"? כל הערכים שנשמרו בשדה זה יימחקו.` : ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </div>
  );
}

// ─── Create / Edit Form ───

function CustomFieldForm({
  editing,
  entityType,
  onClose,
}: {
  editing: CustomField | null;
  entityType: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editing?.name || "");
  const [fieldType, setFieldType] = useState(editing?.fieldType || "text");
  const [required, setRequired] = useState(editing?.required || false);
  const [options, setOptions] = useState<SelectOption[]>(
    (editing?.options as SelectOption[]) || [{ label: "", value: "", color: OPTION_COLORS[0] }],
  );

  const createMut = useMutation({
    mutationFn: () =>
      createCustomField({
        entityType,
        name,
        fieldType,
        required,
        options: fieldType === "select" ? options.filter((o) => o.label.trim()) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", entityType] });
      toast.success("שדה נוצר!");
      onClose();
    },
    onError: (err) => handleMutationError(err, "שגיאה ביצירת שדה"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateCustomField(editing!.id, {
        name,
        // fieldType is immutable after creation — do not send it
        required,
        options: fieldType === "select" ? options.filter((o) => o.label.trim()) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", entityType] });
      toast.success("שדה עודכן!");
      onClose();
    },
    onError: (err) => handleMutationError(err, "שגיאה בעדכון שדה"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateMut.mutate();
    else createMut.mutate();
  }

  function addOption() {
    const colorIdx = options.length % OPTION_COLORS.length;
    setOptions([...options, { label: "", value: "", color: OPTION_COLORS[colorIdx] }]);
  }

  function updateOption(idx: number, patch: Partial<SelectOption>) {
    setOptions(
      options.map((o, i) => {
        if (i !== idx) return o;
        const updated = { ...o, ...patch };
        // Auto-generate value from label
        if (patch.label !== undefined) {
          updated.value = patch.label.trim().toLowerCase().replace(/\s+/g, "_");
        }
        return updated;
      }),
    );
  }

  function removeOption(idx: number) {
    setOptions(options.filter((_, i) => i !== idx));
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? "עריכת שדה מותאם" : "שדה מותאם חדש"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6" dir="rtl">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">שם השדה *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            required
            autoFocus
            dir="rtl"
            placeholder='לדוגמה: "גודל נכס (מ"ר)"'
          />
        </div>

        {/* Field type */}
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">
            סוג שדה *
            {editing && (
              <span className="mr-2 text-[11px] font-normal text-[#9699A6]">
                (לא ניתן לשינוי — מחק וצור מחדש)
              </span>
            )}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FIELD_TYPES.map((ft) => {
              const isActive = fieldType === ft.value;
              const isLocked = !!editing;
              return (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => !isLocked && setFieldType(ft.value)}
                  disabled={isLocked && !isActive}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border-2 transition-all text-[12px] font-medium ${
                    isActive
                      ? "border-[#0073EA] bg-[#F0F4FF] text-[#0073EA]"
                      : "border-[#E6E9EF] text-[#676879] hover:border-[#C5C7D0]"
                  } ${isLocked && !isActive ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <ft.icon size={16} />
                  {ft.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options for select type */}
        {fieldType === "select" && (
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-2">אפשרויות בחירה</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Color picker */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: opt.color || OPTION_COLORS[0] }}
                    />
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#E6E9EF] p-2 hidden group-hover:flex flex-wrap gap-1 z-50 w-[120px]">
                      {OPTION_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateOption(idx, { color: c })}
                          className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${
                            opt.color === c ? "ring-2 ring-[#323338] ring-offset-1" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(idx, { label: e.target.value })}
                    placeholder={`אפשרות ${idx + 1}`}
                    dir="rtl"
                    className="flex-1 px-3 py-1.5 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0073EA]"
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-1 text-[#9699A6] hover:text-[#E44258] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1 mt-2 text-[12px] text-[#0073EA] font-medium hover:bg-[#E8F3FF] px-2 py-1 rounded-[4px] transition-colors"
            >
              <Plus size={12} />
              הוסף אפשרות
            </button>
          </div>
        )}

        {/* Required toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA]"
          />
          <span className="text-sm text-[#323338]">שדה חובה</span>
        </label>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={createMut.isPending || updateMut.isPending || !name.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {editing ? "עדכן" : "צור שדה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
