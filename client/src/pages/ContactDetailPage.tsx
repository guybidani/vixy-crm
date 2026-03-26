import { useState } from "react";
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
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageCard } from "../components/layout/PageShell";
import StatusBadge from "../components/shared/StatusBadge";
import LeadHeatBadge, { LeadHeatPicker, heatFromScore, type LeadHeat } from "../components/shared/LeadHeatBadge";
import FollowUpCard from "../components/contacts/FollowUpCard";
import Modal from "../components/shared/Modal";
import EntityDocumentsSection from "../components/shared/EntityDocumentsSection";
import { getContact, updateContact, deleteContact } from "../api/contacts";
import { listCompanies } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";

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
              <h1 className="text-xl font-bold text-[#323338]">
                {contact.firstName} {contact.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {statusInfo && (
                  <StatusBadge
                    label={statusInfo.label}
                    color={statusInfo.color}
                  />
                )}
                <LeadHeatBadge
                  heat={contact.leadHeat || heatFromScore(contact.leadScore)}
                  size="md"
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

      <div className="grid grid-cols-3 gap-4">
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <PageCard>
            <h3 className="font-bold text-[#323338] mb-3">פרטי קשר</h3>
            <div className="space-y-3">
              {contact.email && (
                <InfoRow
                  icon={<Mail size={14} />}
                  label="אימייל"
                  value={contact.email}
                  dir="ltr"
                />
              )}
              {contact.phone && (
                <InfoRow
                  icon={<Phone size={14} />}
                  label="טלפון"
                  value={contact.phone}
                  dir="ltr"
                />
              )}
              {contact.company && (
                <InfoRow
                  icon={<Building2 size={14} />}
                  label="חברה"
                  value={contact.company.name}
                  onClick={() => navigate(`/companies/${contact.company!.id}`)}
                />
              )}
              {contact.position && (
                <InfoRow
                  icon={<Briefcase size={14} />}
                  label="תפקיד"
                  value={contact.position}
                />
              )}
              {contact.source && (
                <InfoRow
                  icon={<MessageCircle size={14} />}
                  label="מקור"
                  value={contact.source}
                />
              )}
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
              <div className="space-y-2">
                <div className="bg-green-50 rounded-[4px] p-3">
                  <p className="text-[12px] text-green-700 mb-2">
                    שלח הודעת WhatsApp ישירות ל-{contact.firstName}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="כתוב הודעה..."
                      className="flex-1 px-2.5 py-1.5 border border-green-200 rounded-[4px] text-[12px] focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                    />
                    <button className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-[4px] transition-colors">
                      <Send size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-[#9699A6] text-center">
                  מופעל ע״י Jony WhatsApp API
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-[#9699A6] text-center py-2">
                יש להוסיף טלפון לשליחת הודעות
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
        <div className="col-span-2 space-y-4">
          {/* Deals */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Handshake size={16} className="text-[#0073EA]" />
                עסקאות ({contact.deals?.length || 0})
              </h3>
            </div>
            {contact.deals && contact.deals.length > 0 ? (
              <div className="space-y-2">
                {contact.deals.map((deal: any) => {
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

          {/* Tickets */}
          <PageCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#323338] flex items-center gap-2">
                <Ticket size={16} className="text-purple-500" />
                פניות ({contact.tickets?.length || 0})
              </h3>
            </div>
            {contact.tickets && contact.tickets.length > 0 ? (
              <div className="space-y-2">
                {contact.tickets.map((ticket: any) => {
                  const status = ticketStatuses[ticket.status];
                  const priority = priorities[ticket.priority];
                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px] hover:bg-[#F5F6F8] transition-colors cursor-pointer"
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
                    </div>
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
            </div>
            {contact.tasks && contact.tasks.length > 0 ? (
              <div className="space-y-2">
                {contact.tasks.map((task: any) => {
                  const priority = priorities[task.priority];
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-[#F5F6F8] rounded-[4px]"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            task.status === "DONE"
                              ? "bg-success border-success"
                              : "border-[#E6E9EF]"
                          }`}
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
                    </div>
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
            <h3 className="font-bold text-[#323338] mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-[#676879]" />
              היסטוריית פעילות
            </h3>
            {contact.activities && contact.activities.length > 0 ? (
              <div className="relative">
                <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-[#E6E9EF]" />
                <div className="space-y-4">
                  {contact.activities.map((activity: any) => {
                    const typeInfo = activityTypes[activity.type];
                    return (
                      <div key={activity.id} className="flex gap-3 relative">
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-[#E6E9EF] flex items-center justify-center flex-shrink-0 z-10">
                          <ActivityIcon type={activity.type} />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#323338]">
                              {typeInfo?.label || activity.type}
                            </span>
                            <span className="text-[12px] text-[#9699A6]">
                              {new Date(activity.createdAt).toLocaleDateString(
                                "he-IL",
                              )}{" "}
                              {new Date(activity.createdAt).toLocaleTimeString(
                                "he-IL",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          {activity.subject && (
                            <p className="text-sm text-[#676879] mt-0.5">
                              {activity.subject}
                            </p>
                          )}
                          {activity.body && (
                            <p className="text-[12px] text-[#9699A6] mt-0.5">
                              {activity.body}
                            </p>
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
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#9699A6]">{icon}</span>
      <span className="text-[12px] text-[#9699A6] w-14">{label}</span>
      <span
        className={`text-sm text-[#323338] ${onClick ? "cursor-pointer hover:text-[#0073EA]" : ""}`}
        dir={dir}
        onClick={onClick}
      >
        {value}
      </span>
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
