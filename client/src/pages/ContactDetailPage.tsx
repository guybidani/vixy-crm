import { useState, useRef, useEffect } from "react";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Edit2,
  Trash2,
  StickyNote,
  PhoneCall,
  MessageCircle,
  Bot,
  Handshake,
  Ticket,
  CheckSquare,
  MessageSquare,
  Mic,
  Brain,
  Megaphone,
  Plus,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageCard } from "../components/layout/PageShell";
import StatusBadge from "../components/shared/StatusBadge";
import StatusDropdown from "../components/shared/StatusDropdown";
import LeadHeatBadge, { LeadHeatPicker, heatFromScore, type LeadHeat } from "../components/shared/LeadHeatBadge";
import FollowUpCard from "../components/contacts/FollowUpCard";
import Modal from "../components/shared/Modal";
import EntityDocumentsSection from "../components/shared/EntityDocumentsSection";
import { getContact, updateContact, deleteContact } from "../api/contacts";
import { createActivity, updateActivity, deleteActivity } from "../api/activities";
import { listCompanies } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { getWhatsAppUrl } from "../utils/phone";

export default function ContactDetailPage() {
  const {
    contactStatuses,
    dealStages,
    ticketStatuses,
    priorities,
    activityTypes,
  } = useWorkspaceOptions();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityType, setActivityType] = useState<"NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP">("NOTE");
  const [activityBody, setActivityBody] = useState("");
  const [loggingActivity, setLoggingActivity] = useState(false);
  const activityTextareaRef = useRef<HTMLTextAreaElement>(null);

  /* Activity inline-edit state */
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityBody, setEditingActivityBody] = useState("");
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", id],
    queryFn: () => getContact(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContact(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר נמחק");
      navigate("/contacts");
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, any>) => updateContact(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const updateActivityMut = useMutation({
    mutationFn: ({ actId, body }: { actId: string; body: string }) =>
      updateActivity(actId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      setEditingActivityId(null);
    },
    onError: () => toast.error("שגיאה בעדכון פעילות"),
  });

  const deleteActivityMut = useMutation({
    mutationFn: (actId: string) => deleteActivity(actId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      toast.success("פעילות נמחקה");
    },
    onError: () => toast.error("שגיאה במחיקת פעילות"),
  });

  async function logActivity() {
    if (!activityBody.trim() || loggingActivity || !id) return;
    setLoggingActivity(true);
    try {
      await createActivity({ type: activityType, body: activityBody.trim(), contactId: id });
      setActivityBody("");
      setShowLogActivity(false);
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      toast.success("פעילות נרשמה");
    } catch {
      toast.error("שגיאה ברישום הפעילות");
    } finally {
      setLoggingActivity(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#676879]">טוען...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#676879]">איש קשר לא נמצא</p>
      </div>
    );
  }

  const statusInfo = contactStatuses[contact.status];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/contacts")}
        className="flex items-center gap-1 text-[13px] text-[#676879] hover:text-[#0073EA] transition-colors"
      >
        <ArrowRight size={14} />
        חזרה לאנשי קשר
      </button>

      {/* Header Card */}
      <PageCard>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E8F3FF] rounded-xl flex items-center justify-center">
              <span className="text-[#0073EA] text-xl font-bold">
                {contact.firstName?.[0] || "?"}
              </span>
            </div>
            <div>
              {editingName ? (
                <input
                  autoFocus
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onBlur={() => {
                    const trimmed = nameVal.trim();
                    if (trimmed && trimmed !== `${contact.firstName} ${contact.lastName}`) {
                      const parts = trimmed.split(" ");
                      updateMut.mutate({
                        firstName: parts[0] || "",
                        lastName: parts.slice(1).join(" ") || "",
                      });
                    }
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      setNameVal(`${contact.firstName} ${contact.lastName}`);
                      setEditingName(false);
                    }
                  }}
                  className="text-xl font-bold text-[#323338] bg-white border border-[#0073EA] rounded-[4px] px-2 py-0.5 outline-none focus:ring-1 focus:ring-[#0073EA]/20"
                />
              ) : (
                <h1
                  className="text-xl font-bold text-[#323338] cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors"
                  onClick={() => {
                    setNameVal(`${contact.firstName} ${contact.lastName}`);
                    setEditingName(true);
                  }}
                >
                  {contact.firstName} {contact.lastName}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-1">
                <StatusDropdown
                  value={contact.status}
                  options={contactStatuses}
                  onChange={(status) => updateMut.mutate({ status })}
                  size="md"
                />
                <InlineHeatPicker
                  heat={contact.leadHeat || heatFromScore(contact.leadScore)}
                  onChange={(heat) => updateMut.mutate({ leadHeat: heat })}
                />
                <span className="text-[12px] text-[#9699A6]">
                  {contact.leadScore}/100
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#676879] hover:text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
            >
              <Edit2 size={14} />
              עריכה
            </button>
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
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <PageCard>
            <h3 className="font-bold text-[#323338] mb-3">פרטי קשר</h3>
            <div className="space-y-3">
              <EditableInfoRow
                icon={<Mail size={14} />}
                label="אימייל"
                value={contact.email || ""}
                placeholder="הוסף אימייל"
                dir="ltr"
                href={contact.email ? `mailto:${contact.email}` : undefined}
                onSave={(val) => updateMut.mutate({ email: val || undefined })}
              />
              <EditableInfoRow
                icon={<Phone size={14} />}
                label="טלפון"
                value={contact.phone || ""}
                placeholder="הוסף טלפון"
                dir="ltr"
                href={contact.phone ? `tel:${contact.phone}` : undefined}
                onSave={(val) => updateMut.mutate({ phone: val || undefined })}
              />
              {contact.company ? (
                <InfoRow
                  icon={<Building2 size={14} />}
                  label="חברה"
                  value={contact.company.name}
                  onClick={() => navigate(`/companies/${contact.company!.id}`)}
                />
              ) : (
                <InfoRow
                  icon={<Building2 size={14} />}
                  label="חברה"
                  value=""
                />
              )}
              <EditableInfoRow
                icon={<Briefcase size={14} />}
                label="תפקיד"
                value={contact.position || ""}
                placeholder="הוסף תפקיד"
                onSave={(val) => updateMut.mutate({ position: val || undefined })}
              />
              <EditableInfoRow
                icon={<MessageCircle size={14} />}
                label="מקור"
                value={contact.source || ""}
                placeholder="הוסף מקור"
                onSave={(val) => updateMut.mutate({ source: val || undefined })}
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label="נוצר"
                value={new Date(contact.createdAt).toLocaleDateString("he-IL")}
              />
            </div>
          </PageCard>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <PageCard>
              <h3 className="font-bold text-[#323338] mb-3">תגיות</h3>
              <div className="flex gap-1.5 flex-wrap">
                {contact.tags.map((t: any) => (
                  <span
                    key={t.tag?.id || t.id}
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${t.tag?.color || t.color}20`,
                      color: t.tag?.color || t.color,
                    }}
                  >
                    {t.tag?.name || t.name}
                  </span>
                ))}
              </div>
            </PageCard>
          )}
          {/* Follow-Up Automation */}
          {id && <FollowUpCard contactId={id} />}

          {/* Documents */}
          {id && (
            <PageCard>
              <EntityDocumentsSection entityType="contact" entityId={id} />
            </PageCard>
          )}

          {/* WhatsApp (Jony) */}
          <PageCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <MessageSquare size={12} className="text-white" />
              </div>
              <h3 className="font-bold text-[#323338]">WhatsApp</h3>
              <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">
                Jony
              </span>
            </div>
            {contact.phone ? (
              <a
                href={getWhatsAppUrl(contact.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-[4px] transition-colors text-[12px] font-medium w-full justify-center"
              >
                <MessageSquare size={13} />
                פתח שיחה עם {contact.firstName}
              </a>
            ) : (
              <p className="text-[12px] text-[#9699A6] text-center py-2">
                יש להוסיף טלפון לפתיחת שיחה
              </p>
            )}
          </PageCard>

          {/* AI Call Analysis */}
          <PageCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <Brain size={12} className="text-white" />
              </div>
              <h3 className="font-bold text-[#323338]">ניתוח שיחות AI</h3>
            </div>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 bg-purple-50 hover:bg-purple-100 rounded-[4px] transition-colors text-right">
                <Mic size={14} className="text-purple-500" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-purple-700 block">
                    העלה הקלטת שיחה
                  </span>
                  <span className="text-[10px] text-purple-500">
                    AI ינתח את השיחה ויציע פעולות המשך
                  </span>
                </div>
              </button>
              <div className="bg-[#F5F6F8] rounded-[4px] p-2.5">
                <p className="text-[10px] text-[#9699A6] text-center">
                  אין שיחות מנותחות עדיין
                </p>
                <p className="text-[10px] text-[#9699A6] text-center mt-0.5">
                  תמלול + סיכום + פעולות המשך אוטומטיות
                </p>
              </div>
            </div>
          </PageCard>

          {/* Vixy Campaigns */}
          <PageCard>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-[#0073EA] rounded-full flex items-center justify-center">
                <Megaphone size={12} className="text-white" />
              </div>
              <h3 className="font-bold text-[#323338]">Vixy קמפיינים</h3>
            </div>
            <div className="bg-[#E8F3FF]/50 rounded-[4px] p-3 text-center">
              <Megaphone size={24} className="text-[#0073EA] mx-auto mb-1.5" />
              <p className="text-[12px] font-medium text-[#0073EA]">
                בקרוב - חיבור ל-Vixy
              </p>
              <p className="text-[10px] text-[#9699A6] mt-0.5">
                צפו בקמפיינים, הוצאות, ולידים שהגיעו מ-Vixy
              </p>
            </div>
          </PageCard>
        </div>

        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Deals */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Handshake size={16} className="text-[#0073EA]" />
                עסקאות ({contact.deals?.length || 0})
              </h3>
              <button
                onClick={() => navigate(`/deals?new=1&contactId=${contact.id}`)}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
              >
                <Plus size={13} />
                הוסף עסקה
              </button>
            </div>
            {contact.deals && contact.deals.length > 0 ? (
              <div className="space-y-2">
                {contact.deals.map((deal: any) => {
                  const stage = dealStages[deal.stage];
                  return (
                    <button
                      key={deal.id}
                      className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#ECEDF0] transition-colors text-right"
                      onClick={() => navigate(`/deals?open=${deal.id}`)}
                    >
                      <div>
                        <span className="font-medium text-sm text-[#323338]">
                          {deal.title}
                        </span>
                        {deal.assignee && (
                          <span className="text-[12px] text-[#9699A6] block">
                            {deal.assignee.user.name}
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
              <p className="text-sm text-[#9699A6] text-center py-4">
                אין עסקאות
              </p>
            )}
          </PageCard>

          {/* Tickets */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Ticket size={16} className="text-purple-500" />
                פניות ({contact.tickets?.length || 0})
              </h3>
              <button
                onClick={() => navigate(`/tickets?new=1&contactId=${contact.id}`)}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
              >
                <Plus size={13} />
                הוסף פנייה
              </button>
            </div>
            {contact.tickets && contact.tickets.length > 0 ? (
              <div className="space-y-2">
                {contact.tickets.map((ticket: any) => {
                  const status = ticketStatuses[ticket.status];
                  const priority = priorities[ticket.priority];
                  return (
                    <button
                      key={ticket.id}
                      className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#ECEDF0] transition-colors text-right"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <span className="font-medium text-sm text-[#323338]">
                        {ticket.subject}
                      </span>
                      <div className="flex items-center gap-2">
                        {priority && (
                          <StatusBadge
                            label={priority.label}
                            color={priority.color}
                          />
                        )}
                        {status && (
                          <StatusBadge
                            label={status.label}
                            color={status.color}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#9699A6] text-center py-4">
                אין פניות
              </p>
            )}
          </PageCard>

          {/* Tasks */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <CheckSquare size={16} className="text-success" />
                משימות ({contact.tasks?.length || 0})
              </h3>
              <button
                onClick={() => navigate(`/tasks?new=1&contactId=${contact.id}`)}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#0073EA] hover:bg-[#E8F3FF] rounded-[4px] transition-colors"
              >
                <Plus size={13} />
                הו��ף משימה
              </button>
            </div>
            {contact.tasks && contact.tasks.length > 0 ? (
              <div className="space-y-2">
                {contact.tasks.map((task: any) => {
                  const priority = priorities[task.priority];
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#EEEFF3] transition-colors text-right"
                      onClick={() => navigate(`/tasks?selected=${task.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            task.status === "DONE"
                              ? "bg-success border-success"
                              : "border-[#E6E9EF]"
                          }`}
                          aria-hidden="true"
                        >
                          {task.status === "DONE" && (
                            <span className="text-white text-[10px]">✓</span>
                          )}
                        </div>
                        <span
                          className={`font-medium text-sm ${
                            task.status === "DONE"
                              ? "line-through text-[#9699A6]"
                              : "text-[#323338]"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.dueDate && (
                          <span className="text-[12px] text-[#9699A6]">
                            {new Date(task.dueDate).toLocaleDateString("he-IL")}
                          </span>
                        )}
                        {priority && (
                          <StatusBadge
                            label={priority.label}
                            color={priority.color}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#9699A6] text-center py-4">
                אין משימות
              </p>
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

            {contact.activities && contact.activities.length > 0 ? (
              <div className="relative">
                <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-[#E6E9EF]" />
                <div className="space-y-4">
                  {contact.activities.map((activity: any) => {
                    const typeInfo = activityTypes[activity.type];
                    const isEditingThis = editingActivityId === activity.id;
                    return (
                      <div key={activity.id} className="flex gap-3 relative group/act">
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-[#E6E9EF] flex items-center justify-center flex-shrink-0 z-10">
                          <ActivityIcon type={activity.type} />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#323338]">
                              {typeInfo?.label || activity.type}
                            </span>
                            <span className="text-[12px] text-[#9699A6]">
                              {new Date(activity.createdAt).toLocaleDateString("he-IL")}{" "}
                              {new Date(activity.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                            </span>
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
                          {activity.subject && (
                            <p className="text-sm text-[#676879] mt-0.5">
                              {activity.subject}
                            </p>
                          )}
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
                            <span className="text-[12px] text-[#9699A6]">
                              — {activity.member.user.name}
                            </span>
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

      {/* Edit Modal */}
      {editing && (
        <EditContactModal contact={contact} onClose={() => setEditing(false)} />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteMutation.mutate();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="מחיקת איש קשר"
        message="האם אתה בטוח שברצונך למחוק את איש הקשר?"
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

function InlineHeatPicker({
  heat,
  onChange,
}: {
  heat: LeadHeat;
  onChange: (heat: LeadHeat) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer"
        title="שנה חום ליד"
      >
        <LeadHeatBadge heat={heat} size="md" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-[#E6E9EF] p-2 z-20 min-w-[180px]">
          <LeadHeatPicker
            value={heat}
            onChange={(h) => {
              if (h) onChange(h);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: string;
  onClick?: () => void;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#9699A6]">{icon}</span>
      <span className="text-[12px] text-[#9699A6] w-14">{label}</span>
      {onClick ? (
        <button
          className="text-sm text-[#323338] hover:text-[#0073EA] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
          dir={dir}
          onClick={onClick}
        >
          {value}
        </button>
      ) : href ? (
        <a
          href={href}
          className="text-sm text-[#323338] hover:text-[#0073EA] hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
          dir={dir}
        >
          {value}
        </a>
      ) : (
        <span className="text-sm text-[#323338]" dir={dir}>{value}</span>
      )}
    </div>
  );
}

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
              className="text-sm text-[#323338] hover:text-[#0073EA] hover:underline transition-colors truncate"
              dir={dir}
            >
              {value}
            </a>
          ) : (
            <span className="text-sm text-[#323338] truncate" dir={dir}>
              {value}
            </span>
          )}
          <button
            onClick={() => {
              setEditVal(value);
              setEditing(true);
            }}
            className="opacity-0 group-hover/row:opacity-100 p-0.5 text-[#9699A6] hover:text-[#0073EA] transition-all"
            title="ערוך"
          >
            <Edit2 size={11} />
          </button>
        </div>
      ) : (
        <span
          className="text-sm text-[#9699A6] cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors flex-1"
          onClick={() => {
            setEditVal("");
            setEditing(true);
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

function ActivityIcon({ type }: { type: string }) {
  const size = 12;
  const cls = "text-[#9699A6]";
  switch (type) {
    case "NOTE":
      return <StickyNote size={size} className={cls} />;
    case "CALL":
      return <PhoneCall size={size} className={cls} />;
    case "EMAIL":
      return <Mail size={size} className={cls} />;
    case "MEETING":
      return <Calendar size={size} className={cls} />;
    case "WHATSAPP":
      return <MessageCircle size={size} className={cls} />;
    case "STATUS_CHANGE":
      return <ArrowRight size={size} className={cls} />;
    default:
      return <Bot size={size} className={cls} />;
  }
}

function EditContactModal({
  contact,
  onClose,
}: {
  contact: any;
  onClose: () => void;
}) {
  const { contactStatuses } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || "",
    phone: contact.phone || "",
    position: contact.position || "",
    source: contact.source || "",
    status: contact.status,
    leadScore: contact.leadScore,
    leadHeat: (contact.leadHeat as LeadHeat | null) || null,
    companyId: contact.companyId || "",
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", { limit: 100 }],
    queryFn: () => listCompanies({ limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateContact(contact.id, {
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        companyId: form.companyId || null,
        position: form.position || undefined,
        source: form.source || undefined,
        leadScore: Number(form.leadScore),
        leadHeat: form.leadHeat || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר עודכן!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בעדכון");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="עריכת איש קשר"
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              שם פרטי *
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              שם משפחה *
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              טלפון
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              חברה
            </label>
            <select
              value={form.companyId}
              onChange={(e) => setField("companyId", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
            >
              <option value="">ללא חברה</option>
              {companies?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              תפקיד
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setField("position", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              סטטוס
            </label>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
            >
              {Object.entries(contactStatuses).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              ציון ליד (0-100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.leadScore}
              onChange={(e) => setField("leadScore", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
          </div>

          {/* Lead Heat */}
          <div>
            <label className="block text-sm font-semibold text-[#676879] mb-2">
              חום ליד
            </label>
            <LeadHeatPicker
              value={form.leadHeat}
              onChange={(heat) => setForm((f) => ({ ...f, leadHeat: heat }))}
            />
          </div>
        </div>

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
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {mutation.isPending ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
