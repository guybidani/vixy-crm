import { useState, useRef } from "react";
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
  Calendar,
  Plus,
  PhoneCall,
  MessageCircle,
  Bot,
  StickyNote,
  Pencil,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageCard } from "../components/layout/PageShell";
import StatusBadge from "../components/shared/StatusBadge";
import StatusDropdown from "../components/shared/StatusDropdown";
import EntityDocumentsSection from "../components/shared/EntityDocumentsSection";
import { getCompany, updateCompany, deleteCompany, type Company } from "../api/companies";
import { createActivity, updateActivity, deleteActivity } from "../api/activities";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";

/* ── Inline-editable row (local helper) ───────────────────────── */
function EditableInfoRow({
  icon,
  label,
  value,
  placeholder,
  dir,
  href,
  onSave,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder?: string;
  dir?: string;
  href?: string;
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
      {value ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {href ? (
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-sm text-[#323338] hover:text-[#0073EA] hover:underline transition-colors truncate"
              dir={dir}
            >
              {value}
            </a>
          ) : (
            <span
              role="button"
              tabIndex={0}
              className="text-sm text-[#323338] truncate cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
              dir={dir}
              onClick={() => {
                setEditVal(value);
                setEditing(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setEditVal(value);
                  setEditing(true);
                }
              }}
            >
              {value}
            </span>
          )}
          <button
            onClick={() => {
              setEditVal(value);
              setEditing(true);
            }}
            className="opacity-0 group-hover/row:opacity-100 p-0.5 text-[#9699A6] hover:text-[#0073EA] transition-all flex-shrink-0"
            title="ערוך"
          >
            <Pencil size={11} />
          </button>
        </div>
      ) : (
        <span
          role="button"
          tabIndex={0}
          className="text-sm text-[#9699A6] cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
          onClick={() => {
            setEditVal("");
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditVal("");
              setEditing(true);
            }
          }}
        >
          {placeholder || "\u2014"}
        </span>
      )}
    </div>
  );
}

function ActivityBodyText({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = body.length > 200;
  return (
    <div className="mt-0.5">
      <p className={`text-[12px] text-[#9699A6] whitespace-pre-wrap ${!expanded && isLong ? "line-clamp-3" : ""}`}>
        {body}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-[#0073EA] hover:underline mt-0.5"
        >
          {expanded ? "פחות \u25B2" : "קרא עוד \u25BC"}
        </button>
      )}
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, any> = {
  NOTE: StickyNote,
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: Calendar,
  WHATSAPP: MessageCircle,
  STATUS_CHANGE: ArrowRight,
  SYSTEM: Bot,
};

/* ── Main page ────────────────────────────────────────────────── */
export default function CompanyDetailPage() {
  const { contactStatuses, companyStatuses, dealStages, activityTypes } = useWorkspaceOptions();
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

  /* Activity log state */
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityType, setActivityType] = useState<"NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP">("NOTE");
  const [activityBody, setActivityBody] = useState("");
  const [loggingActivity, setLoggingActivity] = useState(false);
  const activityTextareaRef = useRef<HTMLTextAreaElement>(null);

  /* Activity inline-edit state */
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityBody, setEditingActivityBody] = useState("");
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  const { data: company, isLoading, isError, refetch } = useQuery({
    queryKey: ["company", id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-board"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-board"] });
      toast.success("חברה נמחקה");
      navigate("/companies");
    },
    onError: () => toast.error("שגיאה במחיקת החברה"),
  });

  /* Inline update mutation */
  const updateMut = useMutation({
    mutationFn: (
      data: Partial<Company>,
    ) => updateCompany(company!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-board"] });
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const updateActivityMut = useMutation({
    mutationFn: ({ actId, body }: { actId: string; body: string }) =>
      updateActivity(actId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      setEditingActivityId(null);
    },
    onError: () => toast.error("שגיאה בעדכון פעילות"),
  });

  const deleteActivityMut = useMutation({
    mutationFn: (actId: string) => deleteActivity(actId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      toast.success("פעילות נמחקה");
    },
    onError: () => toast.error("שגיאה במחיקת פעילות"),
  });

  async function logActivity() {
    if (!activityBody.trim() || loggingActivity) return;
    // Log against the first contact of this company if any, otherwise just a note with no entity
    const firstContactId = (company as any)?.contacts?.[0]?.id;
    setLoggingActivity(true);
    try {
      await createActivity({
        type: activityType,
        body: activityBody.trim(),
        ...(firstContactId ? { contactId: firstContactId } : {}),
      });
      setActivityBody("");
      setShowLogActivity(false);
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      toast.success("פעילות נרשמה");
    } catch {
      toast.error("שגיאה ברישום הפעילות");
    } finally {
      setLoggingActivity(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-32 bg-[#E6E9EF] rounded animate-pulse" />
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E6E9EF] rounded-xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 bg-[#E6E9EF] rounded animate-pulse" />
              <div className="h-4 w-32 bg-[#E6E9EF] rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-[#E6E9EF] rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
            ))}
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6">
              <div className="h-5 w-36 bg-[#E6E9EF] rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-[#F5F6F8] rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-[#E44258]" />
        </div>
        <h2 className="text-base font-bold text-[#323338] mb-1">שגיאה בטעינת החברה</h2>
        <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את הנתונים. נסו שוב.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
        >
          <RefreshCw size={14} />
          נסה שוב
        </button>
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 bg-[#E8F3FF] rounded-xl flex items-center justify-center flex-shrink-0">
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
                  tabIndex={0}
                  role="button"
                  aria-label="לחץ לעריכת שם חברה"
                  className="text-xl font-bold text-[#323338] cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
                  onClick={() => {
                    setNameVal(company.name);
                    setEditingName(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setNameVal(company.name);
                      setEditingName(true);
                    }
                  }}
                >
                  {company.name}
                </h1>
              )}
              <div className="flex items-center gap-4 mt-1 text-sm text-[#676879]">
                <StatusDropdown
                  value={company.status}
                  options={companyStatuses}
                  onChange={(status) => updateMut.mutate({ status: status as Company["status"] })}
                  size="md"
                />
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>{company.size} עובדים</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                href={company.email ? `mailto:${company.email}` : undefined}
                onSave={(val) => updateMut.mutate({ email: val })}
              />
              <EditableInfoRow
                icon={<Phone size={14} />}
                label="טלפון"
                value={company.phone || ""}
                placeholder="הוסף טלפון"
                dir="ltr"
                href={company.phone ? `tel:${company.phone}` : undefined}
                onSave={(val) => updateMut.mutate({ phone: val })}
              />
              <EditableInfoRow
                icon={<Globe size={14} />}
                label="אתר"
                value={company.website || ""}
                href={company.website ? (company.website.startsWith("http") ? company.website : `https://${company.website}`) : undefined}
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
              <div className="flex items-center gap-2">
                <span className="text-[#9699A6]"><Calendar size={14} /></span>
                <span className="text-[12px] text-[#9699A6] w-14">נוצר</span>
                <span className="text-sm text-[#323338]">
                  {new Date(company.createdAt).toLocaleDateString("he-IL")}
                </span>
              </div>
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
                role="button"
                tabIndex={0}
                aria-label="לחץ לעריכת הערות"
                className="text-sm text-[#323338] whitespace-pre-wrap cursor-text hover:bg-[#F5F6F8]/80 rounded px-2 py-1 -mx-1 transition-colors min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
                onClick={() => {
                  setNotesVal(company.notes || "");
                  setEditingNotes(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setNotesVal(company.notes || "");
                    setEditingNotes(true);
                  }
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
            {company.deals && company.deals.length > 0 && (
              <div className="mt-3 p-3 bg-[#F5F6F8] rounded-[4px] text-center">
                <p className="text-lg font-bold text-[#323338]">
                  ₪{company.deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0).toLocaleString()}
                </p>
                <p className="text-[12px] text-[#9699A6]">סך ערך עסקאות</p>
              </div>
            )}
          </PageCard>

          {/* Documents */}
          {id && (
            <PageCard>
              <EntityDocumentsSection entityType="company" entityId={id} />
            </PageCard>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contacts */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Users size={16} className="text-[#0073EA]" />
                אנשי קשר ({company.contacts?.length || 0})
              </h3>
              <button
                onClick={() => navigate(`/contacts?new=1&companyId=${company.id}`)}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
              >
                <Plus size={13} />
                הוסף איש קשר
              </button>
            </div>
            {company.contacts && company.contacts.length > 0 ? (
              <div className="space-y-2">
                {company.contacts.map((contact: any) => {
                  const status = contactStatuses[contact.status];
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#EEEFF3] transition-colors text-right"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-8 h-8 bg-[#E8F3FF] rounded-full flex items-center justify-center flex-shrink-0"
                          aria-hidden="true"
                        >
                          <span className="text-[#0073EA] text-[12px] font-bold">
                            {contact.firstName?.[0] || "?"}
                          </span>
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <span className="font-medium text-sm text-[#323338] block truncate">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.position && (
                            <span className="text-[12px] text-[#9699A6] block truncate">
                              {contact.position}
                            </span>
                          )}
                          <div className="flex items-center gap-3 mt-0.5">
                            {contact.email && (
                              <span className="text-[11px] text-[#9699A6] flex items-center gap-1 truncate" dir="ltr">
                                <Mail size={10} className="flex-shrink-0" />
                                {contact.email}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="text-[11px] text-[#9699A6] flex items-center gap-1" dir="ltr">
                                <Phone size={10} className="flex-shrink-0" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {status && (
                        <StatusBadge
                          label={status.label}
                          color={status.color}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users size={24} className="mx-auto text-[#C4C4C4] mb-2" />
                <p className="text-sm text-[#9699A6] mb-2">אין אנשי קשר</p>
                <button
                  onClick={() => navigate(`/contacts?new=1&companyId=${company.id}`)}
                  className="text-[12px] font-medium text-[#0073EA] hover:underline"
                >
                  + הוסף איש קשר ראשון
                </button>
              </div>
            )}
          </PageCard>

          {/* Deals */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Handshake size={16} className="text-success" />
                עסקאות ({company.deals?.length || 0})
              </h3>
              <button
                onClick={() => navigate(`/deals?new=1&companyId=${company.id}`)}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
              >
                <Plus size={13} />
                הוסף עסקה
              </button>
            </div>
            {company.deals && company.deals.length > 0 ? (
              <div className="space-y-2">
                {company.deals.map((deal: any) => {
                  const stage = dealStages[deal.stage];
                  return (
                    <button
                      key={deal.id}
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#EEEFF3] transition-colors text-right"
                      onClick={() => navigate(`/deals?open=${deal.id}`)}
                    >
                      <div className="text-right">
                        <span className="font-medium text-sm text-[#323338] block">
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
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Handshake size={24} className="mx-auto text-[#C4C4C4] mb-2" />
                <p className="text-sm text-[#9699A6] mb-2">אין עסקאות</p>
                <button
                  onClick={() => navigate(`/deals?new=1&companyId=${company.id}`)}
                  className="text-[12px] font-medium text-[#0073EA] hover:underline"
                >
                  + הוסף עסקה ראשונה
                </button>
              </div>
            )}
          </PageCard>

          {/* Activity Timeline */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Calendar size={16} className="text-[#676879]" />
                היסטוריית פעילות
              </h3>
              <button
                onClick={() => {
                  setShowLogActivity((v) => !v);
                  setTimeout(() => activityTextareaRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
              >
                <Plus size={13} />
                רשום פעילות
              </button>
            </div>

            {/* Inline log form */}
            {showLogActivity && (
              <div className="mb-4 bg-[#F5F6F8] rounded-xl border border-[#E6E9EF] p-3 space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {([
                    { key: "NOTE", label: "הערה", color: "#6161FF" },
                    { key: "CALL", label: "שיחה", color: "#00CA72" },
                    { key: "EMAIL", label: "מייל", color: "#579BFC" },
                    { key: "MEETING", label: "פגישה", color: "#A25DDC" },
                    { key: "WHATSAPP", label: "ווטסאפ", color: "#25D366" },
                  ] as const).map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setActivityType(key)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                        activityType === key ? "text-white" : "text-[#676879] bg-white border border-[#E6E9EF] hover:border-[#C5C7D0]"
                      }`}
                      style={activityType === key ? { backgroundColor: color } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={activityTextareaRef}
                  value={activityBody}
                  onChange={(e) => setActivityBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      logActivity();
                    }
                    if (e.key === "Escape") setShowLogActivity(false);
                  }}
                  placeholder={
                    activityType === "CALL" ? "תאר את השיחה..." :
                    activityType === "EMAIL" ? "סכם את המייל..." :
                    activityType === "MEETING" ? "סכם את הפגישה..." :
                    activityType === "WHATSAPP" ? "תאר את שיחת הווטסאפ..." :
                    "כתוב הערה..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-[#E6E9EF] rounded-[4px] outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#9699A6]">Ctrl+Enter לשמירה</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowLogActivity(false); setActivityBody(""); }}
                      className="px-3 py-1 text-[12px] text-[#676879] hover:bg-white rounded-[4px] transition-colors"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={logActivity}
                      disabled={!activityBody.trim() || loggingActivity}
                      className="px-4 py-1 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[12px] font-semibold rounded-[4px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loggingActivity ? "שומר..." : "שמור"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(company as any).activities && (company as any).activities.length > 0 ? (
              <div className="relative">
                <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-[#E6E9EF]" />
                <div className="space-y-4">
                  {(company as any).activities.map((activity: any) => {
                    const typeInfo = activityTypes[activity.type];
                    const ActivityIconComp = ACTIVITY_ICONS[activity.type] || StickyNote;
                    const isEditingThis = editingActivityId === activity.id;
                    return (
                      <div key={activity.id} className="flex gap-3 relative group/act">
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-[#E6E9EF] flex items-center justify-center flex-shrink-0 z-10 text-[#9699A6]">
                          <ActivityIconComp size={12} />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#323338]">
                              {typeInfo?.label || activity.type}
                            </span>
                            {activity.contact && (
                              <button
                                className="text-[11px] text-[#0073EA] hover:underline"
                                onClick={() => navigate(`/contacts/${activity.contact.id}`)}
                              >
                                {activity.contact.firstName} {activity.contact.lastName}
                              </button>
                            )}
                            {activity.deal && (
                              <button
                                className="text-[11px] text-[#00CA72] hover:underline"
                                onClick={() => navigate(`/deals?open=${activity.deal.id}`)}
                              >
                                {activity.deal.title}
                              </button>
                            )}
                            <span className="text-[12px] text-[#9699A6]">
                              {new Date(activity.createdAt).toLocaleDateString("he-IL")}{" "}
                              {new Date(activity.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {/* Hover edit/delete actions */}
                            {!isEditingThis && (
                              <span className="opacity-0 group-hover/act:opacity-100 transition-opacity flex items-center gap-1 mr-auto">
                                <button
                                  onClick={() => {
                                    setEditingActivityId(activity.id);
                                    setEditingActivityBody(activity.body || "");
                                  }}
                                  className="p-1 rounded hover:bg-[#E8F3FF] text-[#9699A6] hover:text-[#0073EA] transition-colors"
                                  title="ערוך"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => setDeletingActivityId(activity.id)}
                                  className="p-1 rounded hover:bg-[#FFEEF0] text-[#9699A6] hover:text-[#E44258] transition-colors"
                                  title="מחק"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </span>
                            )}
                          </div>
                          {isEditingThis ? (
                            <div className="mt-1 space-y-1.5">
                              <textarea
                                autoFocus
                                value={editingActivityBody}
                                onChange={(e) => setEditingActivityBody(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    updateActivityMut.mutate({ actId: activity.id, body: editingActivityBody.trim() });
                                  }
                                  if (e.key === "Escape") setEditingActivityId(null);
                                }}
                                rows={2}
                                className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#0073EA] rounded-[4px] outline-none focus:ring-1 focus:ring-[#0073EA]/20 resize-none"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[#9699A6]">Ctrl+Enter לשמירה | Esc לביטול</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setEditingActivityId(null)}
                                    className="px-2 py-0.5 text-[11px] text-[#676879] hover:bg-[#F5F6F8] rounded transition-colors"
                                  >
                                    ביטול
                                  </button>
                                  <button
                                    onClick={() => updateActivityMut.mutate({ actId: activity.id, body: editingActivityBody.trim() })}
                                    disabled={updateActivityMut.isPending}
                                    className="px-2 py-0.5 text-[11px] bg-[#0073EA] text-white rounded transition-colors disabled:opacity-50"
                                  >
                                    שמור
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            activity.body && (
                              <ActivityBodyText body={activity.body} />
                            )
                          )}
                          {activity.member?.user?.name && (
                            <span className="text-[12px] text-[#9699A6]">— {activity.member.user.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#9699A6] text-center py-4">
                אין פעילות
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

      <ConfirmDialog
        open={!!deletingActivityId}
        onConfirm={() => {
          if (deletingActivityId) deleteActivityMut.mutate(deletingActivityId);
          setDeletingActivityId(null);
        }}
        onCancel={() => setDeletingActivityId(null)}
        title="מחיקת פעילות"
        message="האם אתה בטוח שברצונך למחוק את הפעילות?"
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </div>
  );
}
