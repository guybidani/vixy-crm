import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  Clock,
  Send,
  Eye,
  MessageSquare,
  CheckCircle2,
  Zap,
  X,
  Plus,
  PhoneCall,
  AtSign,
  Calendar,
  StickyNote,
} from "lucide-react";
import toast from "react-hot-toast";
import StatusBadge from "../components/shared/StatusBadge";
import UrgencyScoreBadge from "../components/shared/UrgencyScoreBadge";
import EntityDocumentsSection from "../components/shared/EntityDocumentsSection";
import { listCannedResponses, type CannedResponse } from "../api/canned";
import {
  getTicket,
  updateTicket,
  addTicketMessage,
  type TicketDetail,
  type TicketMessage,
} from "../api/tickets";
import { listActivities, createActivity, updateActivity, deleteActivity, type Activity } from "../api/activities";
import { Pencil, Trash2 } from "lucide-react";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";

export default function TicketDetailPage() {
  const { ticketStatuses, priorities, ticketChannels } = useWorkspaceOptions();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateTicket(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("סטטוס עודכן");
    },
  });

  if (isLoading) {
    return <div className="text-center text-[#9699A6] py-12">טוען...</div>;
  }

  if (!ticket) {
    return (
      <div className="text-center text-[#9699A6] py-12">פנייה לא נמצאה</div>
    );
  }

  const statusInfo = ticketStatuses[ticket.status];
  const priorityInfo = priorities[ticket.priority];

  // SLA calculation
  const slaInfo = ticket.slaPolicy ? getSlaInfo(ticket) : null;

  return (
    <div className="space-y-4">
      {/* Back button + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/tickets")}
          className="p-2 hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
        >
          <ArrowRight size={18} className="text-[#676879]" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#323338]">
            {ticket.subject}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge label={statusInfo.label} color={statusInfo.color} />
            <StatusBadge
              label={priorityInfo.label}
              color={priorityInfo.color}
            />
            {ticket.urgencyComputed && (
              <UrgencyScoreBadge urgency={ticket.urgencyComputed} size="md" />
            )}
            <span className="text-[12px] text-[#9699A6]">
              {new Date(ticket.createdAt).toLocaleString("he-IL")}
            </span>
          </div>
        </div>
        {/* Status change buttons */}
        <div className="flex gap-2">
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <button
              onClick={() => statusMutation.mutate("RESOLVED")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success/90 text-white text-[12px] font-semibold rounded-[4px] transition-colors"
            >
              <CheckCircle2 size={14} />
              סמן כנפתר
            </button>
          )}
          {ticket.status === "RESOLVED" && (
            <button
              onClick={() => statusMutation.mutate("CLOSED")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#676879] hover:bg-[#323338] text-white text-[12px] font-semibold rounded-[4px] transition-colors"
            >
              סגור פנייה
            </button>
          )}
          {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
            <button
              onClick={() => statusMutation.mutate("OPEN")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-warning hover:bg-warning/90 text-white text-[12px] font-semibold rounded-[4px] transition-colors"
            >
              פתח מחדש
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main: Message thread */}
        <div className="col-span-2 space-y-4">
          {/* Description */}
          {ticket.description && (
            <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
              <h3 className="text-sm font-semibold text-[#323338] mb-2">
                תיאור
              </h3>
              <p className="text-sm text-[#676879] whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Message thread */}
          <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E6E9EF]">
              <h3 className="text-sm font-semibold text-[#323338] flex items-center gap-2">
                <MessageSquare size={16} />
                שיחה ({ticket.messages.length})
              </h3>
            </div>

            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <p className="text-center text-[#9699A6] text-sm py-8">
                  אין הודעות עדיין
                </p>
              ) : (
                ticket.messages.map((msg: TicketMessage) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
            </div>

            {/* Reply composer */}
            <ReplyComposer ticketId={id!} ticket={ticket} />
          </div>
        </div>

        {/* Sidebar: Ticket info */}
        <div className="space-y-4">
          {/* Contact info */}
          {ticket.contact && (
            <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
              <h3 className="text-sm font-semibold text-[#323338] mb-3">
                איש קשר
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-[#9699A6]" />
                  <button
                    type="button"
                    className="text-sm text-[#0073EA] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
                    onClick={() => navigate(`/contacts/${ticket.contact!.id}`)}
                  >
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </button>
                </div>
                {ticket.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[#9699A6]" />
                    <a
                      href={`mailto:${ticket.contact.email}`}
                      className="text-[12px] text-[#676879] hover:text-[#0073EA] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
                      dir="ltr"
                    >
                      {ticket.contact.email}
                    </a>
                  </div>
                )}
                {ticket.contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[#9699A6]" />
                    <a
                      href={`tel:${ticket.contact.phone}`}
                      className="text-[12px] text-[#676879] hover:text-[#0073EA] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
                      dir="ltr"
                    >
                      {ticket.contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ticket details */}
          <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
            <h3 className="text-sm font-semibold text-[#323338] mb-3">
              פרטי פנייה
            </h3>
            <div className="space-y-3">
              <DetailRow label="סטטוס">
                <StatusBadge
                  label={statusInfo.label}
                  color={statusInfo.color}
                />
              </DetailRow>
              <DetailRow label="עדיפות">
                <StatusBadge
                  label={priorityInfo.label}
                  color={priorityInfo.color}
                />
              </DetailRow>
              {ticket.urgencyComputed && (
                <DetailRow label="ציון דחיפות">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: ticket.urgencyComputed.color }}
                    >
                      {ticket.urgencyComputed.score}
                    </span>
                    <UrgencyScoreBadge
                      urgency={ticket.urgencyComputed}
                      size="sm"
                      showScore={false}
                    />
                  </div>
                </DetailRow>
              )}
              <DetailRow label="ערוץ">
                <span className="text-sm text-[#676879]">
                  {ticketChannels[ticket.channel]?.label || ticket.channel}
                </span>
              </DetailRow>
              <DetailRow label="נציג">
                <span className="text-sm text-[#676879]">
                  {ticket.assignee?.user.name || "לא שויך"}
                </span>
              </DetailRow>
              {ticket.firstResponseAt && (
                <DetailRow label="תגובה ראשונה">
                  <span className="text-[12px] text-[#9699A6]">
                    {new Date(ticket.firstResponseAt).toLocaleString("he-IL")}
                  </span>
                </DetailRow>
              )}
              {ticket.resolvedAt && (
                <DetailRow label="נפתר">
                  <span className="text-[12px] text-[#9699A6]">
                    {new Date(ticket.resolvedAt).toLocaleString("he-IL")}
                  </span>
                </DetailRow>
              )}
              {ticket.csatScore && (
                <DetailRow label="שביעות רצון">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`text-sm ${
                          i <= ticket.csatScore!
                            ? "text-warning"
                            : "text-[#9699A6]"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}
            </div>
          </div>

          {/* SLA info */}
          {slaInfo && (
            <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
              <h3 className="text-sm font-semibold text-[#323338] mb-3">
                SLA
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[12px] text-[#9699A6] mb-1">
                    תגובה ראשונה
                  </p>
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      slaInfo.responseBreached ? "text-[#E44258]" : "text-success"
                    }`}
                  >
                    <Clock size={14} />
                    <span>
                      {slaInfo.responseBreached
                        ? `איחור של ${formatSlaTime(slaInfo.responseOverdue)}`
                        : ticket.firstResponseAt
                          ? "עמד ב-SLA"
                          : `נותרו ${formatSlaTime(slaInfo.responseRemaining)}`}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-[#9699A6] mb-1">פתרון</p>
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      slaInfo.resolutionBreached
                        ? "text-[#E44258]"
                        : "text-success"
                    }`}
                  >
                    <Clock size={14} />
                    <span>
                      {slaInfo.resolutionBreached
                        ? `איחור של ${formatSlaTime(slaInfo.resolutionOverdue)}`
                        : ticket.resolvedAt
                          ? "עמד ב-SLA"
                          : `נותרו ${formatSlaTime(slaInfo.resolutionRemaining)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Internal activity log */}
          {id && <TicketActivityLog ticketId={id} />}

          {/* Documents */}
          {id && (
            <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
              <EntityDocumentsSection entityType="ticket" entityId={id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_TYPES = [
  { key: "NOTE", label: "הערה", icon: StickyNote, color: "#676879" },
  { key: "CALL", label: "שיחה", icon: PhoneCall, color: "#00CA72" },
  { key: "EMAIL", label: "מייל", icon: AtSign, color: "#579BFC" },
  { key: "MEETING", label: "פגישה", icon: Calendar, color: "#FFCB00" },
] as const;

type ActivityType = (typeof ACTIVITY_TYPES)[number]["key"];

function TicketActivityLog({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("NOTE");
  const [activityBody, setActivityBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", { ticketId }],
    queryFn: () => listActivities({ ticketId, limit: 100 }),
  });

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateActivity(id, { body }),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["activities", { ticketId }] });
      toast.success("עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", { ticketId }] });
      toast.success("נמחק");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  async function handleLog() {
    if (!activityBody.trim() || posting) return;
    setPosting(true);
    try {
      await createActivity({ type: activityType, body: activityBody.trim(), ticketId });
      setActivityBody("");
      setShowCompose(false);
      queryClient.invalidateQueries({ queryKey: ["activities", { ticketId }] });
      toast.success("פעילות נרשמה");
    } catch {
      toast.error("שגיאה ברישום הפעילות");
    } finally {
      setPosting(false);
    }
  }

  const visibleActivities = showAll ? activities : activities.slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#323338]">פעילויות</h3>
        <button
          type="button"
          onClick={() => setShowCompose((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-[#0073EA] hover:bg-[#F0F7FF] px-2 py-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
        >
          <Plus size={12} />
          רשום פעילות
        </button>
      </div>

      {showCompose && (
        <div className="mb-3 border border-[#E6E9EF] rounded-lg p-3 space-y-2">
          {/* Type selector */}
          <div className="flex gap-1">
            {ACTIVITY_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActivityType(t.key)}
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] ${
                    activityType === t.key
                      ? "text-white"
                      : "text-[#676879] hover:bg-[#F5F6F8]"
                  }`}
                  style={activityType === t.key ? { backgroundColor: t.color } : {}}
                >
                  <Icon size={11} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <textarea
            className="w-full text-sm border border-[#E6E9EF] rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA] placeholder-[#9699A6]"
            rows={3}
            placeholder="תוכן הפעילות..."
            value={activityBody}
            onChange={(e) => setActivityBody(e.target.value)}
            dir="rtl"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowCompose(false); setActivityBody(""); }}
              className="text-[12px] px-3 py-1.5 text-[#676879] hover:bg-[#F5F6F8] rounded-md transition-colors"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleLog}
              disabled={!activityBody.trim() || posting}
              className="text-[12px] px-3 py-1.5 bg-[#0073EA] hover:bg-[#0060C7] text-white rounded-md transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
            >
              {posting ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="text-[12px] text-[#9699A6] text-center py-3">
          אין פעילויות עדיין
        </p>
      ) : (
        <div className="space-y-2">
          {visibleActivities.map((act: Activity) => {
            const typeInfo = ACTIVITY_TYPES.find((t) => t.key === act.type);
            const Icon = typeInfo?.icon ?? StickyNote;
            const isSystem = act.type === "STATUS_CHANGE" || act.type === "SYSTEM";
            return (
              <div key={act.id} className="flex items-start gap-2 group/act">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: (typeInfo?.color ?? "#676879") + "20" }}
                >
                  <Icon size={11} style={{ color: typeInfo?.color ?? "#676879" }} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === act.id ? (
                    <div className="space-y-1">
                      <textarea
                        autoFocus
                        className="w-full text-[12px] border border-[#0073EA] rounded p-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                        rows={2}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            if (editingText.trim()) editMut.mutate({ id: act.id, body: editingText.trim() });
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <div className="flex gap-1 text-[10px]">
                        <button
                          onClick={() => { if (editingText.trim()) editMut.mutate({ id: act.id, body: editingText.trim() }); }}
                          className="px-2 py-0.5 bg-[#0073EA] text-white rounded"
                        >שמור</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-[#676879] hover:bg-[#F5F6F8] rounded">ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#323338] leading-snug line-clamp-2">
                      {act.body || act.subject || "—"}
                    </p>
                  )}
                  <span className="text-[10px] text-[#9699A6]">
                    {act.member?.user.name} · {new Date(act.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
                {!isSystem && editingId !== act.id && (
                  <div className="flex gap-0.5 opacity-0 group-hover/act:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => { setEditingText(act.body || ""); setEditingId(act.id); }}
                      className="p-1 rounded text-[#9699A6] hover:text-[#0073EA] hover:bg-[#F0F7FF] transition-colors"
                      title="ערוך"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(act.id)}
                      disabled={deleteMut.isPending}
                      className="p-1 rounded text-[#9699A6] hover:text-[#E44258] hover:bg-[#E44258]/10 transition-colors"
                      title="מחק"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {activities.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-[11px] text-[#0073EA] hover:underline py-1 w-full text-center"
            >
              {showAll ? "הצג ��חות" : `הצג את כל ${activities.length} הפעילויות`}
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        onConfirm={() => {
          if (confirmDeleteId) deleteMut.mutate(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
        title="מחיקת פעילות"
        message="האם אתה בטוח שברצונך למחוק את הפעילות? לא ניתן לשחזר."
        confirmText="מ��ק"
        cancelText="ביטול"
        variant="danger"
      />
    </div>
  );
}

function MessageBubble({ message }: { message: TicketMessage }) {
  const isAgent = message.senderType === "agent";
  const isInternal = message.isInternal;

  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
          isInternal
            ? "bg-yellow-50 border border-yellow-200"
            : isAgent
              ? "bg-[#F5F6F8]"
              : "bg-[#0073EA] text-white"
        }`}
      >
        {/* Sender label */}
        <div className="flex items-center gap-1.5 mb-1">
          {isInternal && <Eye size={10} className="text-warning" />}
          <span
            className={`text-[10px] font-medium ${
              isInternal
                ? "text-warning"
                : isAgent
                  ? "text-[#9699A6]"
                  : "text-white/70"
            }`}
          >
            {isInternal ? "הערה פנימית" : isAgent ? "נציג" : "לקוח"}
          </span>
        </div>
        <p
          className={`text-sm whitespace-pre-wrap ${
            isInternal
              ? "text-[#323338]"
              : isAgent
                ? "text-[#323338]"
                : "text-white"
          }`}
        >
          {message.body}
        </p>
        <span
          className={`text-[10px] mt-1 block ${
            isInternal
              ? "text-[#9699A6]"
              : isAgent
                ? "text-[#9699A6]"
                : "text-white/60"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

function ReplyComposer({
  ticketId,
  ticket,
}: {
  ticketId: string;
  ticket: TicketDetail;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const cannedRef = useRef<HTMLDivElement>(null);

  // Close canned responses dropdown on click outside
  useEffect(() => {
    if (!showCanned) return;
    function handleMouseDown(e: MouseEvent) {
      if (cannedRef.current && !cannedRef.current.contains(e.target as Node)) {
        setShowCanned(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showCanned]);

  const { data: cannedResponses } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => listCannedResponses(),
    enabled: showCanned,
  });

  const mutation = useMutation({
    mutationFn: () => addTicketMessage(ticketId, { body, isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setBody("");
      toast.success(isInternal ? "הערה פנימית נוספה" : "תגובה נשלחה");
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בשליחת הודעה");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    mutation.mutate();
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (body.trim() && !mutation.isPending) mutation.mutate();
    }
  }

  function insertCannedResponse(canned: CannedResponse) {
    // Interpolate variables
    let text = canned.body;
    if (ticket.contact) {
      text = text.replace(
        /\{\{contact\.firstName\}\}/g,
        ticket.contact.firstName,
      );
      text = text.replace(
        /\{\{contact\.lastName\}\}/g,
        ticket.contact.lastName,
      );
    }
    if (ticket.assignee) {
      text = text.replace(/\{\{agent\.name\}\}/g, ticket.assignee.user.name);
    }
    setBody(text);
    setShowCanned(false);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#E6E9EF] p-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setIsInternal(false)}
          className={`text-[12px] px-2 py-1 rounded-md transition-colors ${
            !isInternal
              ? "bg-[#0073EA] text-white"
              : "text-[#676879] hover:bg-[#F5F6F8]"
          }`}
        >
          תגובה ללקוח
        </button>
        <button
          type="button"
          onClick={() => setIsInternal(true)}
          className={`text-[12px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
            isInternal
              ? "bg-warning text-white"
              : "text-[#676879] hover:bg-[#F5F6F8]"
          }`}
        >
          <Eye size={12} />
          הערה פנימית
        </button>
        <div className="mr-auto relative" ref={cannedRef}>
          <button
            type="button"
            onClick={() => setShowCanned(!showCanned)}
            className="text-[12px] px-2 py-1 rounded-md transition-colors text-purple-600 hover:bg-purple-50 flex items-center gap-1"
          >
            <Zap size={12} />
            תגובה מוכנה
          </button>
          {showCanned && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-modal border border-[#E6E9EF] z-20 w-72 max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-[#E6E9EF] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#323338]">
                  תגובות מוכנות
                </span>
                <button
                  type="button"
                  onClick={() => setShowCanned(false)}
                  className="p-0.5 rounded hover:bg-[#F5F6F8]"
                >
                  <X size={12} className="text-[#9699A6]" />
                </button>
              </div>
              {cannedResponses && cannedResponses.length > 0 ? (
                cannedResponses.map((cr) => (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => insertCannedResponse(cr)}
                    className="w-full text-right px-3 py-2 hover:bg-[#F5F6F8] transition-colors border-b border-[#E6E9EF] last:border-0"
                  >
                    <div className="text-[12px] font-medium text-[#323338]">
                      {cr.title}
                    </div>
                    {cr.category && (
                      <span className="text-[10px] text-purple-500">
                        {cr.category}
                      </span>
                    )}
                    <p className="text-[10px] text-[#9699A6] truncate mt-0.5">
                      {cr.body.slice(0, 80)}...
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-[12px] text-[#9699A6] text-center py-4">
                  אין תגובות מוכנות
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isInternal ? "הערה פנימית (לא נראית ללקוח)..." : "כתוב תגובה..."
          }
          className={`flex-1 px-3 py-2 border rounded-[4px] text-sm focus:outline-none focus:ring-2 resize-none ${
            isInternal
              ? "border-yellow-200 bg-yellow-50/50 focus:ring-warning/30 focus:border-warning"
              : "border-[#E6E9EF] focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
          }`}
          rows={2}
          onKeyDown={handleTextareaKeyDown}
        />
        <button
          type="submit"
          disabled={!body.trim() || mutation.isPending}
          className={`px-4 self-end rounded-[4px] text-white font-semibold text-[13px] transition-colors disabled:opacity-50 ${
            isInternal
              ? "bg-warning hover:bg-warning/90"
              : "bg-[#0073EA] hover:bg-[#0060C2]"
          }`}
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#9699A6]">{label}</span>
      {children}
    </div>
  );
}

function formatSlaTime(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} שעות`;
  return `${hours} שעות ו-${remainingMinutes} דקות`;
}

function getSlaInfo(ticket: TicketDetail) {
  const sla = ticket.slaPolicy;
  if (!sla) return null;

  const createdAt = new Date(ticket.createdAt).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - createdAt) / 60000;

  const responseBreached =
    !ticket.firstResponseAt && elapsedMinutes > sla.firstResponseMinutes;
  const responseRemaining = Math.max(
    0,
    Math.round(sla.firstResponseMinutes - elapsedMinutes),
  );
  const responseOverdue = Math.max(
    0,
    Math.round(elapsedMinutes - sla.firstResponseMinutes),
  );

  const resolutionBreached =
    !ticket.resolvedAt && elapsedMinutes > sla.resolutionMinutes;
  const resolutionRemaining = Math.max(
    0,
    Math.round(sla.resolutionMinutes - elapsedMinutes),
  );
  const resolutionOverdue = Math.max(
    0,
    Math.round(elapsedMinutes - sla.resolutionMinutes),
  );

  return {
    responseBreached,
    responseRemaining,
    responseOverdue,
    resolutionBreached,
    resolutionRemaining,
    resolutionOverdue,
  };
}
