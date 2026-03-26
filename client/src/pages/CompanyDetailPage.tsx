import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/shared/ConfirmDialog";
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
        <span className="text-[#9699A6]">{icon}</span>
        <span className="text-[12px] text-[#9699A6] w-14">{label}</span>
        <input
          autoFocus
          className="flex-1 text-sm text-[#323338] bg-white border border-[#0073EA] rounded-[4px] px-2 py-0.5 outline-none focus:ring-1 focus:ring-[#0073EA]/20"
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
      <span className="text-[#9699A6]">{icon}</span>
      <span className="text-[12px] text-[#9699A6] w-14">{label}</span>
      <span
        className={`text-sm flex-1 min-w-0 ${
          value ? "text-[#323338]" : "text-[#9699A6]"
        } cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors`}
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
          className="opacity-0 group-hover/row:opacity-100 text-[#0073EA] text-[10px] transition-opacity"
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <p className="text-[#676879]">טוען...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#676879]">חברה לא נמצאה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/companies")}
        className="flex items-center gap-1 text-[13px] font-normal text-[#676879] hover:text-[#0073EA] transition-colors"
      >
        <ArrowRight size={14} />
        חזרה לחברות
      </button>

      {/* Header Card */}
      <PageCard>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E8F3FF] rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-[#0073EA]" />
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
                  className="text-xl font-bold text-[#323338] bg-white border border-[#0073EA] rounded-[4px] px-2 py-0.5 outline-none focus:ring-1 focus:ring-[#0073EA]/20"
                />
              ) : (
                <h1
                  className="text-xl font-bold text-[#323338] cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors"
                  onClick={() => {
                    setNameVal(company.name);
                    setEditingName(true);
                  }}
                >
                  {company.name}
                </h1>
              )}
              <div className="flex items-center gap-4 mt-1 text-sm text-[#676879]">
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>{company.size} עובדים</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#676879] hover:text-[#E44258] hover:bg-[#FFEEF0] rounded-[4px] transition-colors"
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
            <h3 className="font-bold text-[#323338] mb-3">פרטי חברה</h3>
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
            <h3 className="font-bold text-[#323338] mb-3 flex items-center gap-2">
              <FileText size={14} className="text-[#9699A6]" />
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
                className="w-full min-h-[80px] text-sm text-[#323338] bg-white border border-[#0073EA] rounded-[4px] px-3 py-2 outline-none focus:ring-1 focus:ring-[#0073EA]/20 resize-y"
              />
            ) : (
              <div
                className="text-sm text-[#323338] whitespace-pre-wrap cursor-text hover:bg-[#F5F6F8]/80 rounded px-2 py-1 -mx-1 transition-colors min-h-[40px]"
                onClick={() => {
                  setNotesVal(company.notes || "");
                  setEditingNotes(true);
                }}
              >
                {company.notes || (
                  <span className="text-[#9699A6]">
                    לחץ להוספת הערות...
                  </span>
                )}
              </div>
            )}
          </PageCard>

          {/* Stats */}
          <PageCard>
            <h3 className="font-bold text-[#323338] mb-3">סיכום</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-[#F5F6F8] rounded-[4px]">
                <Users size={18} className="mx-auto text-[#0073EA] mb-1" />
                <p className="text-lg font-bold text-[#323338]">
                  {company.contacts?.length || 0}
                </p>
                <p className="text-[12px] text-[#9699A6]">אנשי קשר</p>
              </div>
              <div className="text-center p-3 bg-[#F5F6F8] rounded-[4px]">
                <Handshake size={18} className="mx-auto text-success mb-1" />
                <p className="text-lg font-bold text-[#323338]">
                  {company.deals?.length || 0}
                </p>
                <p className="text-[12px] text-[#9699A6]">עסקאות</p>
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
            <h3 className="font-bold text-[#323338] mb-3 flex items-center gap-2">
              <Users size={16} className="text-[#0073EA]" />
              אנשי קשר ({company.contacts?.length || 0})
            </h3>
            {company.contacts && company.contacts.length > 0 ? (
              <div className="space-y-2">
                {company.contacts.map((contact: any) => {
                  const status = contactStatuses[contact.status];
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#F5F6F8] transition-colors cursor-pointer"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 bg-[#E8F3FF] rounded-full flex items-center justify-center"
                          role="img"
                          aria-label={`${contact.firstName} ${contact.lastName}`}
                        >
                          <span className="text-[#0073EA] text-[12px] font-bold">
                            {contact.firstName[0]}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-sm text-[#323338]">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.position && (
                            <span className="text-[12px] text-[#9699A6] block">
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
              <p className="text-sm text-[#9699A6] text-center py-4">
                אין אנשי קשר
              </p>
            )}
          </PageCard>

          {/* Deals */}
          <PageCard>
            <h3 className="font-bold text-[#323338] mb-3 flex items-center gap-2">
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
                      className="flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#F5F6F8] transition-colors cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <div>
                        <span className="font-medium text-sm text-[#323338]">
                          {deal.title}
                        </span>
                        {deal.contact && (
                          <span className="text-[12px] text-[#9699A6] block">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#323338]">
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
              <p className="text-sm text-[#9699A6] text-center py-4">
                אין עסקאות
              </p>
            )}
          </PageCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteMutation.mutate();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="מחיקת חברה"
        message="האם אתה בטוח שברצונך למחוק את החברה?"
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </div>
  );
}
