import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";

export default function TicketDetailPage() {
  const { ticketStatuses, priorities } = useWorkspaceOptions();
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
    return <div className="text-center text-text-tertiary py-12">טוען...</div>;
  }

  if (!ticket) {
    return (
      <div className="text-center text-text-tertiary py-12">פנייה לא נמצאה</div>
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
          className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <ArrowRight size={18} className="text-text-secondary" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">
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
            <span className="text-xs text-text-tertiary">
              {new Date(ticket.createdAt).toLocaleString("he-IL")}
            </span>
          </div>
        </div>
        {/* Status change buttons */}
        <div className="flex gap-2">
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <button
              onClick={() => statusMutation.mutate("RESOLVED")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <CheckCircle2 size={14} />
              סמן כנפתר
            </button>
          )}
          {ticket.status === "RESOLVED" && (
            <button
              onClick={() => statusMutation.mutate("CLOSED")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-text-tertiary hover:bg-text-secondary text-white text-xs font-semibold rounded-lg transition-colors"
            >
              סגור פנייה
            </button>
          )}
          {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
            <button
              onClick={() => statusMutation.mutate("OPEN")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-warning hover:bg-warning/90 text-white text-xs font-semibold rounded-lg transition-colors"
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
            <div className="bg-white rounded-xl shadow-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                תיאור
              </h3>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Message thread */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <MessageSquare size={16} />
                שיחה ({ticket.messages.length})
              </h3>
            </div>

            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <p className="text-center text-text-tertiary text-sm py-8">
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
            <div className="bg-white rounded-xl shadow-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                איש קשר
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-text-tertiary" />
                  <span
                    className="text-sm text-primary cursor-pointer hover:underline"
                    onClick={() => navigate(`/contacts/${ticket.contact!.id}`)}
                  >
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </span>
                </div>
                {ticket.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-text-tertiary" />
                    <span className="text-xs text-text-secondary" dir="ltr">
                      {ticket.contact.email}
                    </span>
                  </div>
                )}
                {ticket.contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-text-tertiary" />
                    <span className="text-xs text-text-secondary" dir="ltr">
                      {ticket.contact.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ticket details */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
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
                <span className="text-sm text-text-secondary">
                  {ticket.channel}
                </span>
              </DetailRow>
              <DetailRow label="נציג">
                <span className="text-sm text-text-secondary">
                  {ticket.assignee?.user.name || "לא שויך"}
                </span>
              </DetailRow>
              {ticket.firstResponseAt && (
                <DetailRow label="תגובה ראשונה">
                  <span className="text-xs text-text-tertiary">
                    {new Date(ticket.firstResponseAt).toLocaleString("he-IL")}
                  </span>
                </DetailRow>
              )}
              {ticket.resolvedAt && (
                <DetailRow label="נפתר">
                  <span className="text-xs text-text-tertiary">
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
                            : "text-text-tertiary"
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
            <div className="bg-white rounded-xl shadow-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                SLA
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-tertiary mb-1">
                    תגובה ראשונה
                  </p>
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      slaInfo.responseBreached ? "text-danger" : "text-success"
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
                  <p className="text-xs text-text-tertiary mb-1">פתרון</p>
                  <div
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      slaInfo.resolutionBreached
                        ? "text-danger"
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

          {/* Documents */}
          {id && (
            <div className="bg-white rounded-xl shadow-card p-4">
              <EntityDocumentsSection entityType="ticket" entityId={id} />
            </div>
          )}
        </div>
      </div>
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
              ? "bg-surface-secondary"
              : "bg-primary text-white"
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
                  ? "text-text-tertiary"
                  : "text-white/70"
            }`}
          >
            {isInternal ? "הערה פנימית" : isAgent ? "נציג" : "לקוח"}
          </span>
        </div>
        <p
          className={`text-sm whitespace-pre-wrap ${
            isInternal
              ? "text-text-primary"
              : isAgent
                ? "text-text-primary"
                : "text-white"
          }`}
        >
          {message.body}
        </p>
        <span
          className={`text-[10px] mt-1 block ${
            isInternal
              ? "text-text-tertiary"
              : isAgent
                ? "text-text-tertiary"
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
    <form onSubmit={handleSubmit} className="border-t border-border-light p-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setIsInternal(false)}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            !isInternal
              ? "bg-primary text-white"
              : "text-text-secondary hover:bg-surface-secondary"
          }`}
        >
          תגובה ללקוח
        </button>
        <button
          type="button"
          onClick={() => setIsInternal(true)}
          className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
            isInternal
              ? "bg-warning text-white"
              : "text-text-secondary hover:bg-surface-secondary"
          }`}
        >
          <Eye size={12} />
          הערה פנימית
        </button>
        <div className="mr-auto relative">
          <button
            type="button"
            onClick={() => setShowCanned(!showCanned)}
            className="text-xs px-2 py-1 rounded-md transition-colors text-purple-600 hover:bg-purple-50 flex items-center gap-1"
          >
            <Zap size={12} />
            תגובה מוכנה
          </button>
          {showCanned && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-modal border border-border z-20 w-72 max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-border-light flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">
                  תגובות מוכנות
                </span>
                <button
                  type="button"
                  onClick={() => setShowCanned(false)}
                  className="p-0.5 rounded hover:bg-surface-secondary"
                >
                  <X size={12} className="text-text-tertiary" />
                </button>
              </div>
              {cannedResponses && cannedResponses.length > 0 ? (
                cannedResponses.map((cr) => (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => insertCannedResponse(cr)}
                    className="w-full text-right px-3 py-2 hover:bg-surface-secondary transition-colors border-b border-border-light last:border-0"
                  >
                    <div className="text-xs font-medium text-text-primary">
                      {cr.title}
                    </div>
                    {cr.category && (
                      <span className="text-[10px] text-purple-500">
                        {cr.category}
                      </span>
                    )}
                    <p className="text-[10px] text-text-tertiary truncate mt-0.5">
                      {cr.body.slice(0, 80)}...
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-xs text-text-tertiary text-center py-4">
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
          className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${
            isInternal
              ? "border-yellow-200 bg-yellow-50/50 focus:ring-warning/30 focus:border-warning"
              : "border-border focus:ring-primary/30 focus:border-primary"
          }`}
          rows={2}
        />
        <button
          type="submit"
          disabled={!body.trim() || mutation.isPending}
          className={`px-4 self-end rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-50 ${
            isInternal
              ? "bg-warning hover:bg-warning/90"
              : "bg-primary hover:bg-primary-hover"
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
      <span className="text-xs text-text-tertiary">{label}</span>
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
