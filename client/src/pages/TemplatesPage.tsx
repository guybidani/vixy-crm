import { useState, useMemo } from "react";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Mail,
  MessageCircle,
  Smartphone,
  Search,
  Copy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import StatusBadge from "../components/shared/StatusBadge";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type Template,
  type TemplateVariable,
} from "../api/templates";

const CATEGORIES: Record<string, { label: string; color: string }> = {
  SALES: { label: "מכירות", color: "#00CA72" },
  SERVICE: { label: "שירות", color: "#579BFC" },
  GENERAL: { label: "כללי", color: "#A25DDC" },
};

const CHANNELS: Record<
  string,
  { label: string; color: string; icon: typeof Mail }
> = {
  EMAIL: { label: "אימייל", color: "#579BFC", icon: Mail },
  WHATSAPP: { label: "ווטסאפ", color: "#25D366", icon: MessageCircle },
  SMS: { label: "SMS", color: "#FDAB3D", icon: Smartphone },
};

const DEFAULT_VARIABLES: TemplateVariable[] = [
  { name: "firstName", label: "שם פרטי" },
  { name: "lastName", label: "שם משפחה" },
  { name: "dealTitle", label: "שם העסקה" },
  { name: "companyName", label: "שם חברה" },
];

const EXAMPLE_VALUES: Record<string, string> = {
  firstName: "דוד",
  lastName: "כהן",
  dealTitle: "חבילת פרימיום",
  companyName: "טכנולוגיות בע״מ",
};

function renderPreview(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading, isError, refetch } = useQuery({
    queryKey: ["templates", { category: filterCategory, channel: filterChannel }],
    queryFn: () =>
      listTemplates({
        category: filterCategory || undefined,
        channel: filterChannel || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("תבנית נמחקה");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה במחיקת תבנית");
    },
  });

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!search.trim()) return templates;
    const s = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.body.toLowerCase().includes(s) ||
        (t.subject && t.subject.toLowerCase().includes(s)),
    );
  }, [templates, search]);

  function handleDelete(template: Template) {
    setTemplateToDelete({ id: template.id, name: template.name });
  }

  return (
    <PageShell
      boardStyle
      emoji="📋"
      title="תבניות הודעות"
      subtitle={`${filteredTemplates.length} תבניות`}
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          צור תבנית
        </button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש תבניות..."
            aria-label="חיפוש תבניות"
            className="w-full pr-9 pl-4 py-2 bg-white border border-[#E6E9EF] rounded-[4px] text-[13px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label="סינון לפי קטגוריה"
          className="px-3 py-2 bg-white border border-[#E6E9EF] rounded-[4px] text-[13px] text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
        >
          <option value="">כל הקטגוריות</option>
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>

        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          aria-label="סינון לפי ערוץ"
          className="px-3 py-2 bg-white border border-[#E6E9EF] rounded-[4px] text-[13px] text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
        >
          <option value="">כל הערוצים</option>
          {Object.entries(CHANNELS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-[#E44258]" />
          </div>
          <h2 className="text-base font-bold text-[#323338] mb-1">שגיאה בטעינת תבניות</h2>
          <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את התבניות. נסו שוב.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
          >
            <RefreshCw size={14} />
            נסה שוב
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} className="text-[#9699A6]" />}
          title="אין תבניות"
          description="צרו תבנית ראשונה כדי לחסוך זמן במשלוח הודעות."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md"
            >
              צור תבנית ראשונה
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditTemplate(template)}
              onDelete={() => handleDelete(template)}
              onPreview={() => setPreviewTemplate(template)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <TemplateFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["templates"] });
          }}
        />
      )}

      {/* Edit Modal */}
      {editTemplate && (
        <TemplateFormModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={() => {
            setEditTemplate(null);
            queryClient.invalidateQueries({ queryKey: ["templates"] });
          }}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      <ConfirmDialog
        open={!!templateToDelete}
        onConfirm={() => {
          if (templateToDelete) deleteMutation.mutate(templateToDelete.id);
          setTemplateToDelete(null);
        }}
        onCancel={() => setTemplateToDelete(null)}
        title="מחיקת תבנית"
        message={templateToDelete ? `האם אתה בטוח שברצונך למחוק את התבנית "${templateToDelete.name}"?` : ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </PageShell>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onPreview,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const cat = CATEGORIES[template.category] || CATEGORIES.GENERAL;
  const ch = CHANNELS[template.channel] || CHANNELS.EMAIL;
  const ChannelIcon = ch.icon;

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all p-5 border-r-4 group flex flex-col" style={{ borderRightColor: cat.color }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: cat.color }}
          >
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#323338] truncate">
              {template.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge label={cat.label} color={cat.color} />
              <span className="flex items-center gap-1 text-[12px] text-[#9699A6]">
                <ChannelIcon size={11} />
                {ch.label}
              </span>
            </div>
          </div>
        </div>
        {!template.isActive && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-tertiary text-[#9699A6]">
            לא פעיל
          </span>
        )}
      </div>

      {/* Subject */}
      {template.subject && (
        <p className="text-[12px] text-[#676879] mb-1 truncate">
          <span className="font-medium">נושא:</span> {template.subject}
        </p>
      )}

      {/* Body preview */}
      <p className="text-[13px] text-[#676879] leading-relaxed line-clamp-3 flex-1">
        {template.body.slice(0, 100)}
        {template.body.length > 100 ? "..." : ""}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E6E9EF]/50">
        <span className="text-[11px] text-[#9699A6]">
          {template.usageCount} שימושים
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="p-1.5 hover:bg-[#F5F6F8] rounded-[4px] transition-colors text-[#9699A6] hover:text-[#0073EA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
            title="תצוגה מקדימה"
            aria-label={`תצוגה מקדימה — ${template.name}`}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 hover:bg-[#F5F6F8] rounded-[4px] transition-colors text-[#9699A6] hover:text-[#0073EA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
            title="עריכה"
            aria-label={`ערוך — ${template.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 hover:bg-red-50 rounded-[4px] transition-colors text-[#9699A6] hover:text-[#E44258] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E44258]"
            title="מחיקה"
            aria-label={`מחק — ${template.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateFormModal({
  template,
  onClose,
  onSaved,
}: {
  template?: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState(template?.category || "GENERAL");
  const [channel, setChannel] = useState(template?.channel || "EMAIL");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [showPreview, setShowPreview] = useState(false);

  const createMut = useMutation({
    mutationFn: () =>
      createTemplate({
        name,
        category,
        channel,
        subject: channel === "EMAIL" ? subject || undefined : undefined,
        body,
      }),
    onSuccess: () => {
      toast.success("תבנית נוצרה בהצלחה!");
      onSaved();
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה ביצירת תבנית");
    },
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateTemplate(template!.id, {
        name,
        category,
        channel,
        subject: channel === "EMAIL" ? subject || null : null,
        body,
      }),
    onSuccess: () => {
      toast.success("תבנית עודכנה בהצלחה!");
      onSaved();
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה בעדכון תבנית");
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function insertVariable(varName: string) {
    setBody((prev) => prev + `{{${varName}}}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? "עריכת תבנית" : "צור תבנית"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {/* Name */}
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            שם התבנית *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            required
            autoFocus
            placeholder="לדוגמה: מעקב אחרי שיחה"
          />
        </div>

        {/* Category + Channel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              קטגוריה
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            >
              {Object.entries(CATEGORIES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              ערוץ
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            >
              {Object.entries(CHANNELS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject (email only) */}
        {channel === "EMAIL" && (
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              נושא (אימייל)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
              placeholder="נושא ההודעה..."
            />
          </div>
        )}

        {/* Variable helpers */}
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1.5">
            משתנים זמינים
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_VARIABLES.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => insertVariable(v.name)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#F5F6FF] border border-[#0073EA]/20 text-[#0073EA] text-[12px] font-medium rounded-full hover:bg-[#0073EA] hover:text-white transition-colors"
              >
                <Copy size={10} />
                {`{{${v.name}}}`}
                <span className="text-[#9699A6] group-hover:text-white/70">
                  ({v.label})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[13px] font-medium text-[#323338]">
              תוכן ההודעה *
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-[12px] text-[#0073EA] hover:text-[#0060C2] transition-colors"
            >
              <Eye size={12} />
              {showPreview ? "הסתר תצוגה מקדימה" : "תצוגה מקדימה"}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] resize-none"
            rows={6}
            required
            placeholder="תוכן ההודעה... השתמשו ב-{{firstName}} להוספת משתנים"
          />
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="bg-[#F5F6FF] border border-primary/10 rounded-lg p-4">
            <p className="text-[12px] font-semibold text-[#0073EA] mb-2">
              תצוגה מקדימה:
            </p>
            {channel === "EMAIL" && subject && (
              <p className="text-[13px] font-medium text-[#323338] mb-1">
                <span className="text-[#9699A6]">נושא: </span>
                {renderPreview(subject, EXAMPLE_VALUES)}
              </p>
            )}
            <p className="text-[13px] text-[#323338] whitespace-pre-wrap leading-relaxed">
              {renderPreview(body, EXAMPLE_VALUES)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {isPending
              ? "שומר..."
              : isEdit
                ? "עדכן תבנית"
                : "צור תבנית"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PreviewModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const cat = CATEGORIES[template.category] || CATEGORIES.GENERAL;
  const ch = CHANNELS[template.channel] || CHANNELS.EMAIL;
  const ChannelIcon = ch.icon;

  const renderedSubject = template.subject
    ? renderPreview(template.subject, EXAMPLE_VALUES)
    : null;
  const renderedBody = renderPreview(template.body, EXAMPLE_VALUES);

  function copyToClipboard() {
    const text = renderedSubject
      ? `נושא: ${renderedSubject}\n\n${renderedBody}`
      : renderedBody;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("הועתק ללוח!");
    });
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="תצוגה מקדימה"
      maxWidth="max-w-lg"
    >
      <div className="p-6 space-y-4">
        {/* Meta */}
        <div className="flex items-center gap-2">
          <StatusBadge label={cat.label} color={cat.color} />
          <span className="flex items-center gap-1 text-[12px] text-[#9699A6]">
            <ChannelIcon size={11} />
            {ch.label}
          </span>
        </div>

        {/* Template name */}
        <h3 className="text-lg font-bold text-[#323338]">{template.name}</h3>

        {/* Rendered content */}
        <div className="bg-[#F5F6F8] rounded-[4px] p-4 space-y-2">
          {renderedSubject && (
            <p className="text-[13px] font-medium text-[#323338]">
              <span className="text-[#9699A6]">נושא: </span>
              {renderedSubject}
            </p>
          )}
          <p className="text-[13px] text-[#323338] whitespace-pre-wrap leading-relaxed">
            {renderedBody}
          </p>
        </div>

        {/* Variables used */}
        {template.variables && template.variables.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-[#9699A6] mb-1.5">
              משתנים בתבנית:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <span
                  key={v.name}
                  className="px-2 py-0.5 bg-[#F5F6FF] border border-[#0073EA]/20 text-[#0073EA] text-[12px] rounded-full"
                >
                  {`{{${v.name}}}`} = {v.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Copy button */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            סגור
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] flex items-center justify-center gap-1.5"
          >
            <Copy size={14} />
            העתק
          </button>
        </div>
      </div>
    </Modal>
  );
}
