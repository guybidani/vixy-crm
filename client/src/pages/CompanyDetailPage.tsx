import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Mail,
  Phone,
  Globe,
  Building2,
  Users,
  Handshake,
  Trash2,
  Factory,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageCard } from "../components/layout/PageShell";
import StatusBadge from "../components/shared/StatusBadge";
import EntityDocumentsSection from "../components/shared/EntityDocumentsSection";
import { getCompany, updateCompany, deleteCompany, type Company } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";

/* ── Inline-editable row (local helper) ───────────────────────── */
function EditableInfoRow({
  icon,
  label,
  value,
  placeholder,
  dir,
  onSave,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder?: string;
  dir?: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-text-tertiary">{icon}</span>
        <span className="text-xs text-text-tertiary w-14">{label}</span>
        <input
          autoFocus
          className="flex-1 text-sm text-text-primary bg-white border border-primary rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary/30"
          value={editVal}
          dir={dir}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={() => {
            if (editVal !== value) onSave(editVal);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEditVal(value);
              setEditing(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group/row">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-xs text-text-tertiary w-14">{label}</span>
      <span
        className={`text-sm flex-1 min-w-0 ${
          value ? "text-text-primary" : "text-text-tertiary"
        } cursor-text hover:bg-surface-secondary/80 rounded px-1 -mx-1 transition-colors`}
        dir={dir}
        onClick={() => {
          setEditVal(value);
          setEditing(true);
        }}
      >
        {value || placeholder || "\u2014"}
      </span>
      {!value && (
        <button
          onClick={() => {
            setEditVal("");
            setEditing(true);
          }}
          className="opacity-0 group-hover/row:opacity-100 text-primary text-[10px] transition-opacity"
        >
          +
        </button>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function CompanyDetailPage() {
  const { contactStatuses, dealStages } = useWorkspaceOptions();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* Inline-edit state for company name */
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  /* Inline-edit state for notes */
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState("");

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("חברה נמחקה");
      navigate("/companies");
    },
  });

  /* Inline update mutation */
  const updateMut = useMutation({
    mutationFn: (
      data: Partial<Company>,
    ) => updateCompany(company!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">טוען...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">חברה לא נמצאה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/companies")}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
      >
        <ArrowRight size={14} />
        חזרה לחברות
      </button>

      {/* Header Card */}
      <PageCard>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              {/* Click-to-edit company name */}
              {editingName ? (
                <input
                  autoFocus
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onBlur={() => {
                    const trimmed = nameVal.trim();
                    if (trimmed && trimmed !== company.name) {
                      updateMut.mutate({ name: trimmed });
                    }
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      setNameVal(company.name);
                      setEditingName(false);
                    }
                  }}
                  className="text-xl font-bold text-text-primary bg-white border border-primary rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary/30"
                />
              ) : (
                <h1
                  className="text-xl font-bold text-text-primary cursor-text hover:bg-surface-secondary/80 rounded px-1 -mx-1 transition-colors"
                  onClick={() => {
                    setNameVal(company.name);
                    setEditingName(true);
                  }}
                >
                  {company.name}
                </h1>
              )}
              <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>{company.size} עובדים</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm("האם למחוק את החברה?")) {
                  deleteMutation.mutate();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              מחיקה
            </button>
          </div>
        </div>
      </PageCard>

      <div className="grid grid-cols-3 gap-4">
        {/* Company Info Sidebar */}
        <div className="space-y-4">
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3">פרטי חברה</h3>
            <div className="space-y-3">
              <EditableInfoRow
                icon={<Mail size={14} />}
                label="אימייל"
                value={company.email || ""}
                placeholder="הוסף אימייל"
                dir="ltr"
                onSave={(val) => updateMut.mutate({ email: val })}
              />
              <EditableInfoRow
                icon={<Phone size={14} />}
                label="טלפון"
                value={company.phone || ""}
                placeholder="הוסף טלפון"
                dir="ltr"
                onSave={(val) => updateMut.mutate({ phone: val })}
              />
              <EditableInfoRow
                icon={<Globe size={14} />}
                label="אתר"
                value={company.website || ""}
                placeholder="הוסף אתר"
                dir="ltr"
                onSave={(val) => updateMut.mutate({ website: val })}
              />
              <EditableInfoRow
                icon={<Factory size={14} />}
                label="תעשייה"
                value={company.industry || ""}
                placeholder="הוסף תעשייה"
                onSave={(val) => updateMut.mutate({ industry: val })}
              />
              <EditableInfoRow
                icon={<Users size={14} />}
                label="גודל"
                value={company.size || ""}
                placeholder="הוסף גודל"
                onSave={(val) => updateMut.mutate({ size: val })}
              />
            </div>
          </PageCard>

          {/* Notes */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
              <FileText size={14} className="text-text-tertiary" />
              הערות
            </h3>
            {editingNotes ? (
              <textarea
                autoFocus
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                onBlur={() => {
                  if (notesVal !== (company.notes || "")) {
                    updateMut.mutate({ notes: notesVal });
                  }
                  setEditingNotes(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNotesVal(company.notes || "");
                    setEditingNotes(false);
                  }
                }}
                className="w-full min-h-[80px] text-sm text-text-primary bg-white border border-primary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 resize-y"
              />
            ) : (
              <div
                className="text-sm text-text-primary whitespace-pre-wrap cursor-text hover:bg-surface-secondary/80 rounded px-2 py-1 -mx-1 transition-colors min-h-[40px]"
                onClick={() => {
                  setNotesVal(company.notes || "");
                  setEditingNotes(true);
                }}
              >
                {company.notes || (
                  <span className="text-text-tertiary">
                    לחץ להוספת הערות...
                  </span>
                )}
              </div>
            )}
          </PageCard>

          {/* Stats */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3">סיכום</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <Users size={18} className="mx-auto text-primary mb-1" />
                <p className="text-lg font-bold text-text-primary">
                  {company.contacts?.length || 0}
                </p>
                <p className="text-xs text-text-tertiary">אנשי קשר</p>
              </div>
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <Handshake size={18} className="mx-auto text-success mb-1" />
                <p className="text-lg font-bold text-text-primary">
                  {company.deals?.length || 0}
                </p>
                <p className="text-xs text-text-tertiary">עסקאות</p>
              </div>
            </div>
          </PageCard>

          {/* Documents */}
          {id && (
            <PageCard>
              <EntityDocumentsSection entityType="company" entityId={id} />
            </PageCard>
          )}
        </div>

        {/* Main Content */}
        <div className="col-span-2 space-y-4">
          {/* Contacts */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              אנשי קשר ({company.contacts?.length || 0})
            </h3>
            {company.contacts && company.contacts.length > 0 ? (
              <div className="space-y-2">
                {company.contacts.map((contact: any) => {
                  const status = contactStatuses[contact.status];
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center"
                          role="img"
                          aria-label={`${contact.firstName} ${contact.lastName}`}
                        >
                          <span className="text-primary text-xs font-bold">
                            {contact.firstName[0]}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-sm text-text-primary">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.position && (
                            <span className="text-xs text-text-tertiary block">
                              {contact.position}
                            </span>
                          )}
                        </div>
                      </div>
                      {status && (
                        <StatusBadge
                          label={status.label}
                          color={status.color}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-4">
                אין אנשי קשר
              </p>
            )}
          </PageCard>

          {/* Deals */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
              <Handshake size={16} className="text-success" />
              עסקאות ({company.deals?.length || 0})
            </h3>
            {company.deals && company.deals.length > 0 ? (
              <div className="space-y-2">
                {company.deals.map((deal: any) => {
                  const stage = dealStages[deal.stage];
                  return (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <div>
                        <span className="font-medium text-sm text-text-primary">
                          {deal.title}
                        </span>
                        {deal.contact && (
                          <span className="text-xs text-text-tertiary block">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary">
                          ₪{deal.value?.toLocaleString() || 0}
                        </span>
                        {stage && (
                          <StatusBadge
                            label={stage.label}
                            color={stage.color}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-4">
                אין עסקאות
              </p>
            )}
          </PageCard>
        </div>
      </div>
    </div>
  );
}
