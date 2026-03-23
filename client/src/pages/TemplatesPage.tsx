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

  const { data: templates, isLoading } = useQuery({
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
      title={
        <span className="flex items-center gap-2">
          <FileText size={22} className="text-primary" />
          תבניות הודעות
        </span>
      }
      subtitle={`${filteredTemplates.length} תבניות`}
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={16} />
          צור תבנית
        </button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש תבניות..."
            className="w-full pr-9 pl-4 py-2 bg-white border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
          className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-card p-5 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} className="text-text-tertiary" />}
          title="אין תבניות"
          description="צרו תבנית ראשונה כדי לחסוך זמן במשלוח הודעות."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md"
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
    <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all p-5 border-r-4 group flex flex-col" style={{ borderRightColor: cat.color }}>
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
            <h3 className="font-semibold text-text-primary truncate">
              {template.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge label={cat.label} color={cat.color} />
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <ChannelIcon size={11} />
                {ch.label}
              </span>
            </div>
          </div>
        </div>
        {!template.isActive && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-tertiary text-text-tertiary">
            לא פעיל
          </span>
        )}
      </div>

      {/* Subject */}
      {template.subject && (
        <p className="text-xs text-text-secondary mb-1 truncate">
          <span className="font-medium">נושא:</span> {template.subject}
        </p>
      )}

      {/* Body preview */}
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 flex-1">
        {template.body.slice(0, 100)}
        {template.body.length > 100 ? "..." : ""}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-[11px] text-text-tertiary">
          {template.usageCount} שימושים
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors text-text-tertiary hover:text-primary"
            title="תצוגה מקדימה"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors text-text-tertiary hover:text-primary"
            title="עריכה"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-text-tertiary hover:text-danger"
            title="מחיקה"
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
          <label className="block text-sm font-medium text-text-primary mb-1">
            שם התבנית *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
            autoFocus
            placeholder="לדוגמה: מעקב אחרי שיחה"
          />
        </div>

        {/* Category + Channel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              קטגוריה
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {Object.entries(CATEGORIES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              ערוץ
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
            <label className="block text-sm font-medium text-text-primary mb-1">
              נושא (אימייל)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="נושא ההודעה..."
            />
          </div>
        )}

        {/* Variable helpers */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            משתנים זמינים
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_VARIABLES.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => insertVariable(v.name)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#F5F6FF] border border-primary/20 text-primary text-xs font-medium rounded-full hover:bg-primary hover:text-white transition-colors"
              >
                <Copy size={10} />
                {`{{${v.name}}}`}
                <span className="text-text-tertiary group-hover:text-white/70">
                  ({v.label})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-text-primary">
              תוכן ההודעה *
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
            >
              <Eye size={12} />
              {showPreview ? "הסתר תצוגה מקדימה" : "תצוגה מקדימה"}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            rows={6}
            required
            placeholder="תוכן ההודעה... השתמשו ב-{{firstName}} להוספת משתנים"
          />
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="bg-[#F5F6FF] border border-primary/10 rounded-lg p-4">
            <p className="text-xs font-semibold text-primary mb-2">
              תצוגה מקדימה:
            </p>
            {channel === "EMAIL" && subject && (
              <p className="text-sm font-medium text-text-primary mb-1">
                <span className="text-text-tertiary">נושא: </span>
                {renderPreview(subject, EXAMPLE_VALUES)}
              </p>
            )}
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {renderPreview(body, EXAMPLE_VALUES)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
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
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <ChannelIcon size={11} />
            {ch.label}
          </span>
        </div>

        {/* Template name */}
        <h3 className="text-lg font-bold text-text-primary">{template.name}</h3>

        {/* Rendered content */}
        <div className="bg-surface-secondary rounded-lg p-4 space-y-2">
          {renderedSubject && (
            <p className="text-sm font-medium text-text-primary">
              <span className="text-text-tertiary">נושא: </span>
              {renderedSubject}
            </p>
          )}
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {renderedBody}
          </p>
        </div>

        {/* Variables used */}
        {template.variables && template.variables.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-tertiary mb-1.5">
              משתנים בתבנית:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <span
                  key={v.name}
                  className="px-2 py-0.5 bg-[#F5F6FF] border border-primary/20 text-primary text-xs rounded-full"
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
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
          >
            סגור
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5"
          >
            <Copy size={14} />
            העתק
          </button>
        </div>
      </div>
    </Modal>
  );
}
