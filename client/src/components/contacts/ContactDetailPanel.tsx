import { useState, useRef, useEffect } from "react";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Edit2,
  Trash2,
  X,
  StickyNote,
  PhoneCall,
  MessageCircle,
  Bot,
  Handshake,
  Ticket,
  CheckSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  Clock,
  Plus,
  Tag,
  UserCircle2,
  Pencil,
} from "lucide-react";
import { avatarColor, timeAgo } from "../../lib/utils";
import toast from "react-hot-toast";
import StatusBadge from "../shared/StatusBadge";
import StatusDropdown from "../shared/StatusDropdown";
import { LeadHeatPicker, type LeadHeat } from "../shared/LeadHeatBadge";
import TagSelector from "../shared/TagSelector";
import MondayPersonCell, {
  type PersonOption,
} from "../shared/MondayPersonCell";
import { getContact, updateContact, deleteContact } from "../../api/contacts";
import { listCompanies } from "../../api/companies";
import { createActivity, updateActivity, deleteActivity } from "../../api/activities";
import { createTask, type TaskType } from "../../api/tasks";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";
import { getWhatsAppUrl } from "../../utils/phone";
import FollowUpCard from "./FollowUpCard";

const ACTIVITY_COLORS: Record<string, string> = {
  NOTE: "#6161FF",
  CALL: "#00CA72",
  EMAIL: "#579BFC",
  MEETING: "#A25DDC",
  WHATSAPP: "#25D366",
  STATUS_CHANGE: "#FDAB3D",
  SYSTEM: "#C4C4C4",
};

interface ContactDetailPanelProps {
  contactId: string;
  onClose: () => void;
}

export default function ContactDetailPanel({
  contactId,
  onClose,
}: ContactDetailPanelProps) {
  const { contactStatuses } = useWorkspaceOptions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelated, setShowRelated] = useState(false);

  const { data: contact, isLoading, isError, refetch } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => getContact(contactId),
    enabled: !!contactId,
  });

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateContact(contactId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-board"] });
      toast.success("סטטוס עוד��ן");
    },
    onError: () => toast.error("שגיאה בעדכו�� סטטוס"),
  });

  const nameMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string }) =>
      updateContact(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-board"] });
      toast.success("שם עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון שם"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-board"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-board"] });
      toast.success("איש קשר נמחק");
      onClose();
    },
    onError: () => toast.error("שגיאה במחיקת איש הקשר"),
  });

  const quickLogMutation = useMutation({
    mutationFn: (data: { type: string; subject: string; contactId: string }) =>
      createActivity(data),
    onSuccess: (_data, variables) => {
      const labels: Record<string, string> = {
        CALL: "שיחה נרשמה ✓",
        EMAIL: "אימייל נרשם ✓",
        MEETING: "פגישה נרשמה ✓",
      };
      toast.success(labels[variables.type] || "פעילות נרשמה ✓");
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("שגיאה ברישום פעילות"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#0073EA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-[#FFF0F0] flex items-center justify-center mb-3">
          <X size={24} className="text-[#E44258]" />
        </div>
        <h3 className="text-sm font-bold text-[#323338] mb-1">שגיאה בטעינת איש הקשר</h3>
        <p className="text-[12px] text-[#676879] mb-3">לא הצלחנו לטעון את הנתונים.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[12px] font-semibold rounded-[4px] transition-colors"
        >
          נסה שוב
        </button>
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

  const scoreColor =
    contact.leadScore >= 70
      ? "#00CA72"
      : contact.leadScore >= 40
        ? "#FDAB3D"
        : "#C4C4C4";

  const initials = [contact.firstName?.[0], contact.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="flex flex-col h-full">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="flex items-start gap-4 pb-4 border-b border-[#E6E9EF] mb-4">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold shadow-sm"
          style={{ backgroundColor: avatarColor(contact.fullName) }}
          aria-label={contact.fullName}
        >
          {initials}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              className="text-xl font-bold text-[#323338] bg-white border border-[#0073EA] rounded-[4px] px-2 py-0.5 outline-none w-full"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => {
                const parts = nameValue.trim().split(/\s+/);
                const firstName = parts[0] || contact.firstName;
                const lastName = parts.slice(1).join(" ") || contact.lastName;
                if (firstName !== contact.firstName || lastName !== contact.lastName) {
                  nameMutation.mutate({ firstName, lastName });
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
          ) : (
            <button
              className="text-xl font-bold text-[#323338] cursor-text hover:bg-[#F5F6F8] rounded-[4px] px-1 -mx-1 transition-colors leading-snug text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]"
              onClick={() => {
                setNameValue(`${contact.firstName} ${contact.lastName}`);
                setEditingName(true);
              }}
              title="לחץ לעריכה"
            >
              {contact.firstName} {contact.lastName}
            </button>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusDropdown
              value={contact.status}
              options={contactStatuses}
              onChange={(s) => statusMutation.mutate(s)}
              size="md"
            />
            <LeadScoreRing
              score={contact.leadScore}
              scoreColor={scoreColor}
              onSave={(score) => {
                nameMutation.mutate({ leadScore: score } as any);
              }}
            />
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-[4px] text-[#9699A6] hover:text-[#0073EA] hover:bg-[#E8F3FF] transition-colors"
            title="עריכה"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => navigate(`/contacts/${contactId}`)}
            className="p-2 rounded-[4px] text-[#9699A6] hover:text-[#0073EA] hover:bg-[#E8F3FF] transition-colors"
            title="פתח בעמוד מלא"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-[4px] text-[#9699A6] hover:text-[#E44258] hover:bg-[#FFEEF0] transition-colors"
            title="מחיקה"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-[4px] text-[#9699A6] hover:text-[#323338] hover:bg-[#F5F6F8] transition-colors"
            title="סגור"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── ACTION BUTTONS ROW ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <ActionButton
          icon="📞"
          label="שיחה"
          color="#00CA72"
          onClick={() =>
            quickLogMutation.mutate({
              type: "CALL",
              subject: `שיחה עם ${contact.fullName}`,
              contactId: contact.id,
            })
          }
        />
        <ActionButton
          icon="✉️"
          label="אימייל"
          color="#579BFC"
          onClick={() =>
            quickLogMutation.mutate({
              type: "EMAIL",
              subject: `אימייל ל-${contact.fullName}`,
              contactId: contact.id,
            })
          }
        />
        {contact.phone ? (
          <a
            href={getWhatsAppUrl(contact.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-semibold border transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/5"
          >
            <span>💬</span>
            <span>WhatsApp</span>
          </a>
        ) : (
          <ActionButton
            icon="💬"
            label="WhatsApp"
            color="#25D366"
            onClick={() => toast.error("יש להוסיף טלפון תחילה")}
          />
        )}
        <ActionButton
          icon="📅"
          label="פגישה"
          color="#A25DDC"
          onClick={() =>
            quickLogMutation.mutate({
              type: "MEETING",
              subject: `פגישה עם ${contact.fullName}`,
              contactId: contact.id,
            })
          }
        />
      </div>

      {/* ── 2-COLUMN BODY ────────────────────────────────────── */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* LEFT — Activity Feed */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <h3 className="text-xs font-bold text-[#676879] uppercase tracking-wide mb-3">
            פעילות
          </h3>
          <TimelineTab contact={contact} />
        </div>

        {/* RIGHT — Contact Fields */}
        <div className="w-64 flex-shrink-0 overflow-y-auto">
          <h3 className="text-xs font-bold text-[#676879] uppercase tracking-wide mb-3">
            פרטים
          </h3>
          <ContactFieldsPanel contact={contact} />
        </div>
      </div>

      {/* ── RELATED SECTION (collapsible) ────────────────────── */}
      <div className="mt-5 border-t border-[#E6E9EF] pt-4">
        <button
          onClick={() => setShowRelated((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-[#676879] hover:text-[#323338] transition-colors w-full"
        >
          <span>{showRelated ? "▼" : "▶"}</span>
          קשורים (עסקאות, פניות, משימות)
        </button>
        {showRelated && (
          <div className="mt-3">
            <RelatedTab contact={contact} navigate={navigate} />
          </div>
        )}
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

function ActionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-semibold border transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
      style={{
        borderColor: `${color}40`,
        color,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${color}10`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/** Compact single-column fields panel for the right side of the Monday.com layout */
function ContactFieldsPanel({ contact }: { contact: any }) {
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (data: Record<string, any>) => updateContact(contact.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies", { limit: 200 }],
    queryFn: () => listCompanies({ limit: 200 }),
  });
  const companyOptions: PersonOption[] = (companiesData?.data || []).map(
    (c) => ({ id: c.id, name: c.name }),
  );

  const handleSave = (field: string, value: string) => {
    const payload: Record<string, any> = {};
    payload[field] = value || (field === "companyId" ? null : undefined);
    updateMut.mutate(payload);
  };

  return (
    <div className="space-y-3">
      {/* Contact details card */}
      <div className="bg-[#F5F6F8] rounded-xl p-3 space-y-2">
        <EditableInfoRow
          icon={<Phone size={13} />}
          label="טלפון"
          value={contact.phone || ""}
          placeholder="הוסף טלפון..."
          dir="ltr"
          onSave={(v) => handleSave("phone", v)}
        />
        <EditableInfoRow
          icon={<Mail size={13} />}
          label="אימייל"
          value={contact.email || ""}
          placeholder="הוסף אימייל..."
          dir="ltr"
          onSave={(v) => handleSave("email", v)}
        />
        <div className="flex items-center gap-2">
          <span className="text-[#9699A6] flex-shrink-0">
            <Building2 size={13} />
          </span>
          <span className="text-[11px] text-[#9699A6] w-12 flex-shrink-0">חברה</span>
          <div className="flex-1 min-w-0">
            <MondayPersonCell
              value={
                contact.company
                  ? { id: contact.company.id, name: contact.company.name }
                  : null
              }
              options={companyOptions}
              onChange={(id) => updateMut.mutate({ companyId: id })}
              placeholder="בחר חברה"
            />
          </div>
        </div>
        <EditableInfoRow
          icon={<Briefcase size={13} />}
          label="תפקיד"
          value={contact.position || ""}
          placeholder="הוסף תפקיד..."
          onSave={(v) => handleSave("position", v)}
        />
        <EditableInfoRow
          icon={<MessageCircle size={13} />}
          label="מקור"
          value={contact.source || ""}
          placeholder="הוסף מקור..."
          onSave={(v) => handleSave("source", v)}
        />
        <InfoRow
          icon={<Calendar size={13} />}
          label="נוצר"
          value={new Date(contact.createdAt).toLocaleDateString("he-IL")}
        />
      </div>

      {/* Follow-up date */}
      <FollowUpDateField contact={contact} />

      {/* Follow-up automation */}
      <FollowUpCard contactId={contact.id} />

      {/* Tags */}
      <div className="bg-[#F5F6F8] rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Tag size={12} className="text-[#9699A6]" />
            <span className="text-xs font-semibold text-[#323338]">תגיות</span>
          </div>
          <TagSelector
            entityType="contact"
            entityId={contact.id}
            currentTags={
              contact.tags?.map((t: any) => ({
                id: t.tag?.id || t.id,
                name: t.tag?.name || t.name,
                color: t.tag?.color || t.color,
              })) || []
            }
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {contact.tags?.map((t: any) => (
            <span
              key={t.tag?.id || t.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: t.tag?.color || t.color }}
            >
              {t.tag?.name || t.name}
            </span>
          ))}
          {(!contact.tags || contact.tags.length === 0) && (
            <span className="text-xs text-[#9699A6]">אין תגיות</span>
          )}
        </div>
      </div>

      {/* Assigned to / last activity */}
      {contact.lastActivityAt && (
        <div className="bg-[#F5F6F8] rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <UserCircle2 size={13} className="text-[#9699A6]" />
            <span className="text-xs text-[#9699A6]">פעילות אחרונה</span>
          </div>
          <span className="text-xs font-semibold text-[#323338] mt-1 block">
            {new Date(contact.lastActivityAt).toLocaleDateString("he-IL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      )}
    </div>
  );
}


type TimelineItemType = "activity" | "task_completed" | "task_upcoming";

interface TimelineItem {
  type: TimelineItemType;
  date: Date;
  data: any;
}

function formatDueDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "מחר";
  if (diffDays === -1) return "אתמול";
  return date.toLocaleDateString("he-IL");
}

function isOverdue(date: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return target.getTime() < today.getTime();
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  URGENT: "#FB275D",
  HIGH: "#FDAB3D",
  MEDIUM: "#579BFC",
  LOW: "#C4C4C4",
};

type ComposeTab = "NOTE" | "CALL" | "EMAIL" | "MEETING";
type FilterType = "ALL" | "CALL" | "EMAIL" | "NOTE" | "MEETING";

const COMPOSE_TABS: { id: ComposeTab; label: string; emoji: string; color: string }[] = [
  { id: "NOTE",    label: "הערה",   emoji: "📝", color: "#6161FF" },
  { id: "CALL",    label: "שיחה",   emoji: "📞", color: "#00CA72" },
  { id: "EMAIL",   label: "אימייל", emoji: "✉️", color: "#579BFC" },
  { id: "MEETING", label: "פגישה",  emoji: "📅", color: "#A25DDC" },
];

const FILTER_CHIPS: { id: FilterType; label: string }[] = [
  { id: "ALL",     label: "הכל" },
  { id: "CALL",    label: "שיחות" },
  { id: "EMAIL",   label: "אימיילים" },
  { id: "NOTE",    label: "הערות" },
  { id: "MEETING", label: "פגישות" },
];

const CALL_OUTCOMES = [
  { value: "ANSWERED",  label: "ענה" },
  { value: "NO_ANSWER", label: "לא ענה" },
  { value: "VOICEMAIL", label: "תא קולי" },
];

function TimelineTab({ contact }: { contact: any }) {
  const { activityTypes } = useWorkspaceOptions();
  const { workspaces, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Current workspace member id for author check
  const currentMemberId = workspaces.find(
    (w) => w.id === currentWorkspaceId,
  )?.memberId;

  // ── Compose state ─────────────────────────────
  const [activeTab, setActiveTab] = useState<ComposeTab>("NOTE");
  const [noteBody, setNoteBody] = useState("");
  const [callOutcome, setCallOutcome] = useState("ANSWERED");
  const [callDuration, setCallDuration] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingAttendees, setMeetingAttendees] = useState("");

  // ── Task compose ──────────────────────────────
  const [showTaskCompose, setShowTaskCompose] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("TASK");

  // ── Filter ────────────────────────────────────
  const [filter, setFilter] = useState<FilterType>("ALL");

  // ── Edit state ────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");

  // ── Expand state for long activity bodies ─────
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── Mutations ─────────────────────────────────
  const logMutation = useMutation({
    mutationFn: (data: Parameters<typeof createActivity>[0]) =>
      createActivity(data),
    onSuccess: () => {
      // Reset all compose fields
      setNoteBody("");
      setCallNotes("");
      setCallDuration("");
      setCallOutcome("ANSWERED");
      setEmailSubject("");
      setEmailBody("");
      setMeetingNotes("");
      setMeetingAttendees("");
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("נרשם בהצלחה ✓");
    },
    onError: () => toast.error("שגיאה ברישום"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { subject?: string; body?: string } }) =>
      updateActivity(id, data),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      toast.success("עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      toast.success("נמחק");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  const addTaskMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      dueDate?: string;
      dueTime?: string;
      taskType: string;
      contactId: string;
    }) => createTask(data),
    onSuccess: () => {
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setTaskDueTime("");
      setTaskType("TASK");
      setShowTaskCompose(false);
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("משימה נוצרה");
    },
    onError: () => toast.error("שגיאה ביצירת משימה"),
  });

  const handleLog = () => {
    switch (activeTab) {
      case "NOTE":
        if (!noteBody.trim()) return;
        logMutation.mutate({ type: "NOTE", body: noteBody.trim(), contactId: contact.id });
        break;
      case "CALL":
        logMutation.mutate({
          type: "CALL",
          subject: `שיחה עם ${contact.fullName}`,
          body: callNotes.trim() || undefined,
          contactId: contact.id,
          metadata: {
            outcome: callOutcome,
            duration: callDuration || undefined,
          },
        });
        break;
      case "EMAIL":
        if (!emailSubject.trim()) return;
        logMutation.mutate({
          type: "EMAIL",
          subject: emailSubject.trim(),
          body: emailBody.trim() || undefined,
          contactId: contact.id,
        });
        break;
      case "MEETING":
        logMutation.mutate({
          type: "MEETING",
          subject: `פגישה עם ${contact.fullName}`,
          body: meetingNotes.trim() || undefined,
          contactId: contact.id,
          metadata: {
            attendees: meetingAttendees.trim() || undefined,
          },
        });
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleLog();
    }
  };

  const applyDuePreset = (preset: "1h" | "3h" | "tomorrow9" | "1w") => {
    const now = new Date();
    let target: Date = new Date(now);
    switch (preset) {
      case "1h": target = new Date(now.getTime() + 60 * 60 * 1000); break;
      case "3h": target = new Date(now.getTime() + 3 * 60 * 60 * 1000); break;
      case "tomorrow9":
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
        break;
      case "1w":
        target.setDate(target.getDate() + 7);
        target.setHours(9, 0, 0, 0);
        break;
    }
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setTaskDueDate(`${yyyy}-${mm}-${dd}`);
    setTaskDueTime(
      `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`,
    );
  };

  const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
    { value: "CALL",     label: "שיחה" },
    { value: "MEETING",  label: "פגישה" },
    { value: "FOLLOW_UP",label: "מעקב" },
    { value: "TASK",     label: "כללי" },
  ];

  // Build unified timeline
  const tasks: any[] = contact.tasks || [];
  const activities: any[] = contact.activities || [];

  // Next action banner — earliest upcoming task
  const upcomingTasks = tasks
    .filter((t: any) => t.status !== "DONE" && t.status !== "CANCELLED" && t.dueDate)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextTask = upcomingTasks[0] || null;

  const historyItems: TimelineItem[] = [
    ...activities.map((a: any) => ({
      type: "activity" as const,
      date: new Date(a.createdAt),
      data: a,
    })),
    ...tasks
      .filter((t: any) => t.status === "DONE")
      .map((t: any) => ({
        type: "task_completed" as const,
        date: new Date(t.completedAt || t.updatedAt || t.createdAt),
        data: t,
      })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Apply filter
  const filteredHistory = historyItems.filter((item) => {
    if (filter === "ALL") return true;
    if (item.type === "activity") return item.data.type === filter;
    return false; // completed tasks always hidden when filter is active
  });

  const hasHistory = filteredHistory.length > 0;
  const totalHistory = historyItems.length;

  // Check if log button should be disabled
  const logDisabled =
    logMutation.isPending ||
    (activeTab === "NOTE" && !noteBody.trim()) ||
    (activeTab === "EMAIL" && !emailSubject.trim());

  return (
    <div className="space-y-3">
      {/* ── Next action banner ─────────────────────────────────────── */}
      {nextTask && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#6161FF]/8 border border-[#6161FF]/20">
          <Clock size={13} className="text-[#6161FF] flex-shrink-0" />
          <span className="text-xs font-semibold text-[#6161FF]">משימה הבאה:</span>
          <span className="text-xs text-[#323338] font-medium truncate flex-1">{nextTask.title}</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              isOverdue(new Date(nextTask.dueDate))
                ? "bg-[#E44258]/10 text-[#E44258]"
                : "bg-[#6161FF]/10 text-[#6161FF]"
            }`}
          >
            {formatDueDateLabel(new Date(nextTask.dueDate))}
          </span>
        </div>
      )}

      {/* ── Compose area ───────────────────────────────────────────── */}
      <div className="bg-white border border-[#E6E9EF] rounded-xl overflow-hidden shadow-sm">
        {/* Tab bar */}
        <div className="flex border-b border-[#E6E9EF]">
          {COMPOSE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "border-b-2 text-[#323338]"
                  : "text-[#9699A6] hover:text-[#676879] hover:bg-[#F5F6F8]"
              }`}
              style={activeTab === tab.id ? { borderBottomColor: tab.color } : {}}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowTaskCompose((v) => !v)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all border-r border-[#E6E9EF] ${
              showTaskCompose
                ? "bg-[#E8F3FF] text-[#0073EA] border-b-2 border-b-[#0073EA]"
                : "text-[#9699A6] hover:text-[#676879] hover:bg-[#F5F6F8]"
            }`}
          >
            <CheckSquare size={12} />
            <span>משימה</span>
          </button>
        </div>

        {/* Task compose panel */}
        {showTaskCompose ? (
          <div className="p-3 space-y-2">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="כותרת המשימה *"
              className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors"
            />
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              rows={2}
              className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors"
            />
            <div className="flex flex-wrap gap-1">
              {([{ key: "1h", label: "עוד שעה" }, { key: "3h", label: "עוד 3 שעות" }, { key: "tomorrow9", label: "מחר 9:00" }, { key: "1w", label: "עוד שבוע" }] as const).map((p) => (
                <button key={p.key} type="button" onClick={() => applyDuePreset(p.key)}
                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-[#F5F6F8] border border-[#E6E9EF] text-[#676879] hover:bg-[#0060C2]/10 hover:text-[#0073EA] hover:border-[#0073EA]/30 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)}
                className="flex-1 bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20" />
              <input type="time" value={taskDueTime} onChange={(e) => setTaskDueTime(e.target.value)}
                className="w-24 bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20" />
            </div>
            <div className="flex flex-wrap gap-1">
              {TASK_TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setTaskType(opt.value)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${taskType === opt.value ? "bg-[#0073EA] text-white" : "bg-[#F5F6F8] border border-[#E6E9EF] text-[#676879] hover:bg-[#0060C2]/10"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => addTaskMutation.mutate({ title: taskTitle.trim(), description: taskDescription.trim() || undefined, dueDate: taskDueDate || undefined, dueTime: taskDueTime || undefined, taskType, contactId: contact.id })}
                disabled={!taskTitle.trim() || addTaskMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[12px] font-semibold rounded-[4px] transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none">
                <Plus size={12} />
                {addTaskMutation.isPending ? "יוצר..." : "צור משימה"}
              </button>
            </div>
          </div>
        ) : (
          /* Activity compose body */
          <div className="p-3 space-y-2">
            {activeTab === "NOTE" && (
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="כתוב הערה..."
                rows={3}
                className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors"
              />
            )}
            {activeTab === "CALL" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-[#9699A6] mb-1 block">תוצאה</label>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                      className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-2 py-1.5 text-[12px] text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                    >
                      {CALL_OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] font-semibold text-[#9699A6] mb-1 block">משך (דקות)</label>
                    <input
                      type="number"
                      min={0}
                      value={callDuration}
                      onChange={(e) => setCallDuration(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-2 py-1.5 text-[12px] text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                    />
                  </div>
                </div>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="הערות שיחה..."
                  rows={2}
                  className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                />
              </div>
            )}
            {activeTab === "EMAIL" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="נושא *"
                  className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                />
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="תוכן האימייל (אופציונלי)..."
                  rows={2}
                  className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                />
              </div>
            )}
            {activeTab === "MEETING" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={meetingAttendees}
                  onChange={(e) => setMeetingAttendees(e.target.value)}
                  placeholder="משתתפים (אופציונלי)..."
                  className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                />
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="סיכום פגישה..."
                  rows={2}
                  className="w-full bg-[#F5F6F8]/40 border border-[#E6E9EF] rounded-[4px] px-3 py-2 text-[13px] text-[#323338] placeholder:text-[#9699A6] resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                />
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#9699A6]">Ctrl+Enter לשמירה</span>
              <button
                onClick={handleLog}
                disabled={logDisabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[12px] font-semibold rounded-[4px] transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send size={12} />
                {logMutation.isPending ? "שומר..." : "רשום"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter chips ───────────────────────────────────────────── */}
      {historyItems.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all ${
                filter === chip.id
                  ? "bg-[#0073EA] text-white"
                  : "bg-[#F5F6F8] text-[#676879] hover:bg-[#0060C2]/10 hover:text-[#0073EA] border border-[#E6E9EF]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Timeline history ───────────────────────────────────────── */}
      <div>
        {!hasHistory ? (
          <p className="text-sm text-[#9699A6] text-center py-6">
            {totalHistory > 0 && filter !== "ALL"
              ? "אין פעילות מסוג זה"
              : "אין פעילות עדיין"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filteredHistory.map((item) => {
              if (item.type === "activity") {
                const activity = item.data;
                const typeInfo = activityTypes[activity.type as string];
                const color = ACTIVITY_COLORS[activity.type as string] || "#C4C4C4";
                const isAuthor = currentMemberId && activity.member?.id === currentMemberId;
                const isEditing = editingId === activity.id;

                // Render metadata badge for CALL
                const outcome = activity.metadata?.outcome;
                const duration = activity.metadata?.duration;
                const attendees = activity.metadata?.attendees;

                return (
                  <div
                    key={`activity-${activity.id as string}`}
                    className="group/item flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-[#F5F6F8]/40 transition-colors"
                  >
                    {/* Type icon circle */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white mt-0.5 shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      <ActivityIcon type={activity.type} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#323338]">
                          {typeInfo?.label || activity.type}
                        </span>
                        {activity.member?.user?.name && (
                          <span className="text-xs text-[#9699A6]">
                            {activity.member.user.name}
                          </span>
                        )}
                        <span className="text-[11px] text-[#9699A6]/70">
                          {timeAgo(activity.createdAt)}
                        </span>
                        {/* Call outcome badge */}
                        {outcome && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#00CA72]/10 text-[#00CA72]">
                            {CALL_OUTCOMES.find((o) => o.value === outcome)?.label || outcome}
                          </span>
                        )}
                        {duration && (
                          <span className="text-[10px] text-[#9699A6]">{duration} דק׳</span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-2 space-y-1.5">
                          {activity.type === "EMAIL" && (
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full bg-white border border-[#0073EA] rounded-[4px] px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                              placeholder="נושא"
                            />
                          )}
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={3}
                            className="w-full bg-white border border-[#0073EA] rounded-[4px] px-2 py-1.5 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => editMutation.mutate({
                                id: activity.id,
                                data: {
                                  subject: activity.type === "EMAIL" ? editSubject : undefined,
                                  body: editBody,
                                },
                              })}
                              disabled={editMutation.isPending}
                              className="px-3 py-1 bg-[#0073EA] text-white text-[12px] font-semibold rounded-[4px] hover:bg-[#0060C2] transition-colors disabled:opacity-50"
                            >
                              {editMutation.isPending ? "שומר..." : "שמור"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 bg-[#F5F6F8] text-[#676879] text-xs font-semibold rounded-[4px] hover:bg-[#E6E9EF] transition-colors"
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {activity.subject && activity.type !== "CALL" && activity.type !== "MEETING" && (
                            <p className="text-sm text-[#676879] mt-0.5 font-medium">
                              {activity.subject}
                            </p>
                          )}
                          {activity.body && (() => {
                            const isExpanded = expandedActivities.has(activity.id as string);
                            const CHAR_LIMIT = 200;
                            const isLong = (activity.body as string).length > CHAR_LIMIT;
                            return (
                              <div className="mt-0.5">
                                <p className={`text-sm text-[#676879] whitespace-pre-wrap ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                                  {activity.body}
                                </p>
                                {isLong && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(activity.id as string); }}
                                    className="text-[11px] font-semibold text-[#0073EA] hover:text-[#0060C2] mt-0.5 transition-colors"
                                  >
                                    {isExpanded ? "פחות ▲" : "קרא עוד ▼"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          {attendees && (
                            <p className="text-xs text-[#9699A6] mt-0.5">משתתפים: {attendees}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Edit / Delete — shown on hover, author only */}
                    {isAuthor && !isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => {
                            setEditingId(activity.id);
                            setEditBody(activity.body || "");
                            setEditSubject(activity.subject || "");
                          }}
                          className="p-1.5 rounded-[4px] text-[#9699A6] hover:text-[#0073EA] hover:bg-[#0060C2]/10 transition-colors"
                          title="ערוך"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("למחוק את הפעילות?")) {
                              deleteMutation.mutate(activity.id);
                            }
                          }}
                          className="p-1.5 rounded-[4px] text-[#9699A6] hover:text-[#E44258] hover:bg-[#FFEEF0] transition-colors"
                          title="מחק"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // task_completed
              const task = item.data;
              return (
                <div
                  key={`task-done-${task.id as string}`}
                  className="flex items-start gap-3 py-3 px-2 rounded-xl hover:bg-[#F5F6F8]/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white mt-0.5 bg-[#00CA72] shadow-sm">
                    <CheckCircle2 size={13} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#9699A6] line-through">
                        {task.title}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#00CA72]/15 text-[#00CA72]">
                        הושלמה
                      </span>
                      {task.assignee?.user?.name && (
                        <span className="text-xs text-[#9699A6]">{task.assignee.user.name}</span>
                      )}
                      <span className="text-[11px] text-[#9699A6]/70">
                        {timeAgo(task.completedAt || task.updatedAt || task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RelatedTab({
  contact,
  navigate,
}: {
  contact: any;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { dealStages, ticketStatuses, priorities } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTask) {
      requestAnimationFrame(() => newTaskInputRef.current?.focus());
    }
  }, [addingTask]);

  const createTaskMut = useMutation({
    mutationFn: (data: { title: string; dueDate?: string }) =>
      createTask({
        title: data.title,
        contactId: contact.id,
        dueDate: data.dueDate || undefined,
        priority: "MEDIUM",
        taskType: "TASK",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setAddingTask(false);
      toast.success("משימה נוצרה");
    },
    onError: () => toast.error("שגיאה ביצירת משימה"),
  });

  return (
    <div className="space-y-5">
      {/* Deals */}
      <div>
        <h3 className="font-bold text-[#323338] text-sm mb-3 flex items-center gap-2">
          <Handshake size={16} className="text-[#00CA72]" />
          עסקאות ({contact.deals?.length || 0})
        </h3>
        {contact.deals && contact.deals.length > 0 ? (
          <div className="space-y-2">
            {contact.deals.map((deal: any) => {
              const stage = dealStages[deal.stage];
              return (
                <button
                  key={deal.id}
                  className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-xl hover:bg-[#ECEDF0] transition-colors text-right"
                  onClick={() => navigate(`/deals?open=${deal.id}`)}
                >
                  <div>
                    <span className="font-medium text-sm text-[#323338]">
                      {deal.title}
                    </span>
                    {deal.assignee && (
                      <span className="text-xs text-[#9699A6] block">
                        {deal.assignee.user.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#323338]">
                      ₪{deal.value?.toLocaleString() || 0}
                    </span>
                    {stage && (
                      <StatusBadge label={stage.label} color={stage.color} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#9699A6] text-center py-3 bg-[#F5F6F8]/30 rounded-xl">
            אין עסקאות
          </p>
        )}
      </div>

      {/* Tickets */}
      <div>
        <h3 className="font-bold text-[#323338] text-sm mb-3 flex items-center gap-2">
          <Ticket size={16} className="text-[#FB275D]" />
          פניות ({contact.tickets?.length || 0})
        </h3>
        {contact.tickets && contact.tickets.length > 0 ? (
          <div className="space-y-2">
            {contact.tickets.map((ticket: any) => {
              const status = ticketStatuses[ticket.status];
              const priority = priorities[ticket.priority];
              return (
                <button
                  key={ticket.id}
                  className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-xl hover:bg-[#ECEDF0] transition-colors text-right"
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
                      <StatusBadge label={status.label} color={status.color} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#9699A6] text-center py-3 bg-[#F5F6F8]/30 rounded-xl">
            אין פניות
          </p>
        )}
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#323338] text-sm flex items-center gap-2">
            <CheckSquare size={16} className="text-[#00CA72]" />
            משימות ({contact.tasks?.length || 0})
          </h3>
          {!addingTask && (
            <button
              onClick={() => setAddingTask(true)}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#0073EA] hover:text-[#0060C2] hover:bg-[#E8F3FF] px-2 py-1 rounded-[4px] transition-colors"
            >
              <Plus size={13} />
              הוסף משימה
            </button>
          )}
        </div>

        {/* Inline task creation form */}
        {addingTask && (
          <div className="mb-3 bg-white border border-[#0073EA] rounded-xl px-3 py-2.5 shadow-[0_0_0_3px_rgba(0,115,234,0.10)]">
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="כותרת משימה..."
              className="w-full text-[13px] text-[#323338] bg-transparent outline-none placeholder:text-[#C3C6D4]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  createTaskMut.mutate({ title: newTaskTitle.trim(), dueDate: newTaskDueDate || undefined });
                }
                if (e.key === "Escape") {
                  setAddingTask(false);
                  setNewTaskTitle("");
                  setNewTaskDueDate("");
                }
              }}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0F0F5]">
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="text-[11px] text-[#676879] bg-transparent border-none outline-none cursor-pointer"
                dir="ltr"
                title="תאריך יעד"
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setAddingTask(false);
                    setNewTaskTitle("");
                    setNewTaskDueDate("");
                  }}
                  className="px-2 py-1 text-[11px] text-[#9699A6] hover:text-[#323338] rounded transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={() => {
                    if (newTaskTitle.trim()) {
                      createTaskMut.mutate({ title: newTaskTitle.trim(), dueDate: newTaskDueDate || undefined });
                    }
                  }}
                  disabled={!newTaskTitle.trim() || createTaskMut.isPending}
                  className="px-3 py-1 text-[11px] font-semibold text-white bg-[#0073EA] hover:bg-[#0060C2] rounded-[4px] transition-colors disabled:opacity-40"
                >
                  {createTaskMut.isPending ? "יוצר..." : "צור"}
                </button>
              </div>
            </div>
          </div>
        )}

        {contact.tasks && contact.tasks.length > 0 ? (
          <div className="space-y-2">
            {contact.tasks.map((task: any) => {
              const priority = priorities[task.priority];
              return (
                <button
                  key={task.id}
                  className="w-full flex items-center justify-between p-3 bg-[#F5F6F8] rounded-xl hover:bg-[#ECEDF0] transition-colors text-right"
                  onClick={() => navigate(`/tasks?selected=${task.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        task.status === "DONE"
                          ? "bg-[#00CA72] border-[#00CA72]"
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
                      <span className="text-xs text-[#9699A6]">
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
          !addingTask && (
            <div className="text-center py-4 bg-[#F5F6F8]/30 rounded-xl">
              <p className="text-sm text-[#9699A6]">אין משימות</p>
              <p className="text-[11px] text-[#9699A6] mt-0.5 opacity-70">לחץ "הוסף משימה" למעלה</p>
            </div>
          )
        )}
      </div>

    </div>
  );
}

function FollowUpDateField({ contact }: { contact: any }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const updateMut = useMutation({
    mutationFn: (data: Record<string, any>) => updateContact(contact.id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Auto-create a follow-up task when nextFollowUpDate is set
      if (variables.nextFollowUpDate && variables.nextFollowUpDate !== null) {
        const contactName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        createTask({
          title: `מעקב - ${contactName}`,
          taskType: "FOLLOW_UP",
          dueDate: variables.nextFollowUpDate as string,
          dueTime: "09:00",
          contactId: contact.id,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["tasks-today-widget"] });
          toast.success("תאריך מעקב עודכן + משימת מעקב נוצרה");
        }).catch(() => {
          // Contact was updated but task creation failed
          toast.success("תאריך מעקב עודכן");
          toast.error("שגיאה ביצירת משימת מעקב");
        });
      } else {
        toast.success("תאריך מעקב עודכן");
      }
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const followUpDate = contact.nextFollowUpDate
    ? new Date(contact.nextFollowUpDate)
    : null;

  let statusBadge: React.ReactNode = null;
  let dateColorClass = "text-[#676879]";

  if (followUpDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fuDate = new Date(followUpDate);
    fuDate.setHours(0, 0, 0, 0);
    const diff = Math.round((fuDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      dateColorClass = "text-[#E44258] font-bold";
      statusBadge = (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E44258]/10 text-[#E44258]">
          באיחור!
        </span>
      );
    } else if (diff === 0) {
      dateColorClass = "text-warning font-bold";
      statusBadge = (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
          היום
        </span>
      );
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      updateMut.mutate({ nextFollowUpDate: new Date(val).toISOString() });
    } else {
      updateMut.mutate({ nextFollowUpDate: null });
    }
    setEditing(false);
  };

  const handleClear = () => {
    updateMut.mutate({ nextFollowUpDate: null });
  };

  return (
    <div className="bg-[#F5F6F8] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-[#323338] text-sm flex items-center gap-1.5">
          <Calendar size={14} className="text-[#0073EA]" />
          תאריך מעקב
        </h3>
        {followUpDate && (
          <button
            onClick={handleClear}
            className="text-[10px] text-[#9699A6] hover:text-[#E44258] transition-colors"
          >
            הסר
          </button>
        )}
      </div>
      {followUpDate ? (
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              type="date"
              autoFocus
              defaultValue={followUpDate.toISOString().split("T")[0]}
              onChange={handleDateChange}
              onBlur={() => setEditing(false)}
              className="text-xs border border-[#0073EA] rounded px-2 py-1 focus:outline-none bg-white"
            />
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className={`text-sm ${dateColorClass} hover:underline cursor-pointer`}
              >
                {followUpDate.toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </button>
              {statusBadge}
            </>
          )}
        </div>
      ) : (
        <>
          {editing ? (
            <input
              type="date"
              autoFocus
              onChange={handleDateChange}
              onBlur={() => setEditing(false)}
              className="text-xs border border-[#0073EA] rounded px-2 py-1 focus:outline-none bg-white"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-[12px] text-[#0073EA] hover:text-[#0060C2] font-semibold transition-colors px-2 py-1.5 rounded-[4px] hover:bg-[#E8F3FF]"
            >
              <Calendar size={12} />
              הגדר מעקב
            </button>
          )}
        </>
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
      <span className="text-xs text-[#9699A6] w-14">{label}</span>
      <span
        className={`text-sm text-[#323338] ${onClick ? "cursor-pointer hover:text-[#0073EA] underline-offset-2 hover:underline" : ""}`}
        dir={dir}
        onClick={onClick}
      >
        {value}
      </span>
    </div>
  );
}

function EditableInfoRow({
  icon,
  label,
  value,
  placeholder,
  dir,
  onSave,
  onClick,
  readOnly,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder?: string;
  dir?: string;
  onSave: (value: string) => void;
  onClick?: () => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);

  if (editing && !readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[#9699A6]">{icon}</span>
        <span className="text-xs text-[#9699A6] w-14">{label}</span>
        <input
          autoFocus
          className="flex-1 text-sm text-[#323338] bg-white border border-[#0073EA] rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-[#0073EA]/20"
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
      <span className="text-xs text-[#9699A6] w-14">{label}</span>
      <span
        role={!readOnly || onClick ? "button" : undefined}
        tabIndex={!readOnly || onClick ? 0 : undefined}
        className={`text-sm flex-1 min-w-0 ${
          value
            ? onClick
              ? "text-[#0073EA] cursor-pointer hover:underline"
              : "text-[#323338]"
            : "text-[#9699A6]"
        } ${!readOnly ? "cursor-text hover:bg-[#F5F6F8]/80 rounded px-1 -mx-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]" : ""}`}
        dir={dir}
        onClick={() => {
          if (onClick) {
            onClick();
          } else if (!readOnly) {
            setEditVal(value);
            setEditing(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (onClick) {
              onClick();
            } else if (!readOnly) {
              setEditVal(value);
              setEditing(true);
            }
          }
        }}
      >
        {value || placeholder || "—"}
      </span>
      {!readOnly && !value && (
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

function LeadScoreRing({
  score,
  scoreColor,
  onSave,
}: {
  score: number;
  scoreColor: string;
  onSave: (score: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(score));

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          className="w-14 text-sm text-center border border-[#0073EA] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[#0073EA]/20"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            const n = Math.min(100, Math.max(0, parseInt(val) || 0));
            if (n !== score) onSave(n);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <span className="text-xs text-[#9699A6]">ציון</span>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      onClick={() => {
        setVal(String(score));
        setEditing(true);
      }}
      aria-label="ערוך ציון"
    >
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#E8E8FF"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={scoreColor}
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#323338]">
          {score}
        </span>
      </div>
      <span className="text-xs text-[#9699A6]">ציון</span>
    </button>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const size = 12;
  const cls = "text-white";
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
      return <Handshake size={size} className={cls} />;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      queryClient.invalidateQueries({ queryKey: ["contacts-board"] });
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
    <div
      className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#323338]">עריכת איש קשר</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
          >
            <X size={18} className="text-[#9699A6]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                שם פרטי *
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                שם משפחה *
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                אימייל
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                טלפון
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                חברה
              </label>
              <select
                value={form.companyId}
                onChange={(e) => setField("companyId", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
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
              <label className="block text-sm font-medium text-[#323338] mb-1">
                תפקיד
              </label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setField("position", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                סטטוס
              </label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
              >
                {Object.entries(contactStatuses).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">
                ציון ליד (0-100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.leadScore}
                onChange={(e) => setField("leadScore", e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#676879] mb-2">
              חום ליד
            </label>
            <LeadHeatPicker
              value={form.leadHeat}
              onChange={(heat) => setForm((f) => ({ ...f, leadHeat: heat }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
              מקור
            </label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setField("source", e.target.value)}
              placeholder="למשל: פייסבוק, אתר, הפניה..."
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !form.firstName.trim() || !form.lastName.trim()}
              className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
