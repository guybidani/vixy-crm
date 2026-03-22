import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  X,
  Calendar,
  User,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Circle,
  Ban,
  AlertTriangle,
  Handshake,
  Ticket,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  TrendingUp,
  Tag,
} from "lucide-react";

const TASK_TYPE_OPTIONS = [
  { value: "TASK", label: "משימה", icon: "📋", color: "#6161FF" },
  { value: "CALL", label: "שיחה", icon: "📞", color: "#00CA72" },
  { value: "EMAIL", label: "אימייל", icon: "📧", color: "#579BFC" },
  { value: "MEETING", label: "פגישה", icon: "🤝", color: "#A25DDC" },
  { value: "WHATSAPP", label: "וואטסאפ", icon: "💬", color: "#25D366" },
  { value: "FOLLOW_UP", label: "מעקב", icon: "🔄", color: "#FDAB3D" },
];
import toast from "react-hot-toast";
import StatusDropdown from "../shared/StatusDropdown";
import MondayPersonCell, {
  type PersonOption,
} from "../shared/MondayPersonCell";
import MondayDateCell from "../shared/MondayDateCell";
import {
  getTask,
  updateTask,
  deleteTask,
} from "../../api/tasks";
import { listActivities } from "../../api/activities";
import { getWorkspaceMembers } from "../../api/auth";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";
import { useAuth } from "../../hooks/useAuth";

const ACTIVITY_COLORS: Record<string, string> = {
  NOTE: "#6161FF",
  CALL: "#00CA72",
  EMAIL: "#579BFC",
  MEETING: "#A25DDC",
  WHATSAPP: "#25D366",
  STATUS_CHANGE: "#FDAB3D",
  SYSTEM: "#C4C4C4",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  NOTE: <FileText size={12} />,
  CALL: <Phone size={12} />,
  EMAIL: <Mail size={12} />,
  MEETING: <Calendar size={12} />,
  WHATSAPP: <MessageSquare size={12} />,
  STATUS_CHANGE: <TrendingUp size={12} />,
  SYSTEM: <AlertTriangle size={12} />,
};

const STATUS_ICONS: Record<string, typeof Circle> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
  CANCELLED: Ban,
};

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailPanel({
  taskId,
  onClose,
}: TaskDetailPanelProps) {
  const { taskStatuses, priorities, activityTypes } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "activity">("info");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [outcomeValue, setOutcomeValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });

  const memberOptions: PersonOption[] = (members || []).map((m) => ({
    id: m.memberId,
    name: m.name,
  }));

  // Activities for this task - use contact/deal activities as proxy
  const { data: activities } = useQuery({
    queryKey: ["activities", { contactId: task?.contact?.id }],
    queryFn: () =>
      listActivities({
        contactId: task?.contact?.id || undefined,
        limit: 20,
      }),
    enabled: activeTab === "activity" && !!task?.contact?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateTask>[1]) =>
      updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
    },
    onError: () => {
      toast.error("שגיאה בעדכון");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      toast.success("משימה נמחקה");
      onClose();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">משימה לא נמצאה</p>
      </div>
    );
  }

  const isDone = task.status === "DONE";
  const isOverdue =
    task.dueDate && !isDone && new Date(task.dueDate) < new Date();
  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  const priorityInfo = priorities[task.priority];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isDone
              ? "#D6F5E8"
              : isOverdue
                ? "#FFE5E5"
                : "#E8E8FF",
          }}
        >
          <StatusIcon
            size={20}
            className={
              isDone
                ? "text-success"
                : isOverdue
                  ? "text-danger"
                  : "text-primary"
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              className="text-lg font-bold text-text-primary bg-white border border-primary rounded px-2 py-0.5 outline-none w-full"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => {
                if (titleValue.trim() && titleValue !== task.title) {
                  updateMutation.mutate({ title: titleValue.trim() });
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingTitle(false);
              }}
            />
          ) : (
            <h2
              className={`text-lg font-bold cursor-text hover:bg-surface-secondary/50 rounded px-1 -mx-1 transition-colors ${
                isDone
                  ? "line-through text-text-tertiary"
                  : "text-text-primary"
              }`}
              onClick={() => {
                setTitleValue(task.title);
                setEditingTitle(true);
              }}
            >
              {task.title}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusDropdown
              value={task.status}
              options={taskStatuses}
              onChange={(status) => updateMutation.mutate({ status })}
              size="md"
            />
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}
            >
              {priorityInfo?.label || task.priority}
            </span>
            {(() => {
              const tt = TASK_TYPE_OPTIONS.find(o => o.value === (task.taskType || "TASK"));
              return tt && tt.value !== "TASK" ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ color: tt.color, borderColor: tt.color }}>
                  {tt.icon} {tt.label}
                </span>
              ) : null;
            })()}
            {task.dueTime && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary flex items-center gap-0.5">
                <Clock size={9} /> {task.dueTime}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                באיחור!
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
            title="מחיקה"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border-light">
        {(
          [
            { key: "info", label: "פרטים" },
            { key: "activity", label: "פעילות" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info" ? (
        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-text-tertiary uppercase mb-1.5 block">
              תיאור
            </label>
            {editingDescription ? (
              <textarea
                autoFocus
                className="w-full px-3 py-2 border border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none min-h-[80px]"
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                onBlur={() => {
                  if (descriptionValue !== (task.description || "")) {
                    updateMutation.mutate({ description: descriptionValue });
                  }
                  setEditingDescription(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingDescription(false);
                }}
              />
            ) : (
              <div
                className="text-sm text-text-secondary cursor-text rounded-lg px-3 py-2 hover:bg-surface-secondary/50 transition-colors min-h-[40px] whitespace-pre-wrap"
                onClick={() => {
                  setDescriptionValue(task.description || "");
                  setEditingDescription(true);
                }}
              >
                {task.description || (
                  <span className="text-text-tertiary">
                    לחץ להוספת תיאור...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase">
              עדיפות
            </label>
            <StatusDropdown
              value={task.priority}
              options={priorities}
              onChange={(priority) => updateMutation.mutate({ priority })}
            />
          </div>

          {/* Task Type */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase flex items-center gap-1.5">
              <Tag size={13} />
              סוג משימה
            </label>
            <div className="flex flex-wrap gap-1">
              {TASK_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateMutation.mutate({ taskType: opt.value })}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all"
                  style={
                    (task.taskType || "TASK") === opt.value
                      ? { backgroundColor: opt.color, color: "#fff", borderColor: opt.color }
                      : { backgroundColor: "transparent", color: opt.color, borderColor: opt.color }
                  }
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Due Date + Time */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase flex items-center gap-1.5">
              <Calendar size={13} />
              תאריך ושעה
            </label>
            <div className="flex items-center gap-2">
              <MondayDateCell
                value={task.dueDate || null}
                onChange={(val) => updateMutation.mutate({ dueDate: val ?? undefined })}
              />
              <input
                type="time"
                value={task.dueTime || ""}
                onChange={(e) => updateMutation.mutate({ dueTime: e.target.value || null })}
                className="text-xs border border-border-light rounded px-2 py-1 focus:outline-none focus:border-primary bg-white"
                title="שעת יעד"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-text-tertiary uppercase flex items-center gap-1.5">
              <User size={13} />
              נציג אחראי
            </label>
            <MondayPersonCell
              value={
                task.assignee
                  ? { id: task.assignee.id, name: task.assignee.name }
                  : null
              }
              onChange={(id) => {
                if (id) updateMutation.mutate({ assigneeId: id });
              }}
              options={memberOptions}
              placeholder="בחר נציג"
            />
          </div>

          {/* Outcome Note (shown when completed) */}
          {isDone && (
            <div>
              <label className="text-xs font-semibold text-text-tertiary uppercase mb-1.5 block flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-success" />
                תוצאה / סיכום
              </label>
              {editingOutcome ? (
                <textarea
                  autoFocus
                  className="w-full px-3 py-2 border border-success rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success/30 resize-none min-h-[70px] bg-success/5"
                  value={outcomeValue}
                  onChange={(e) => setOutcomeValue(e.target.value)}
                  onBlur={() => {
                    if (outcomeValue !== (task.outcomeNote || "")) {
                      updateMutation.mutate({ outcomeNote: outcomeValue });
                    }
                    setEditingOutcome(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingOutcome(false);
                  }}
                />
              ) : (
                <div
                  className="text-sm text-text-secondary cursor-text rounded-lg px-3 py-2 hover:bg-success/5 transition-colors min-h-[36px] border border-dashed border-success/30"
                  onClick={() => {
                    setOutcomeValue(task.outcomeNote || "");
                    setEditingOutcome(true);
                  }}
                >
                  {task.outcomeNote || (
                    <span className="text-text-tertiary">הוסף סיכום מה התרחש...</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border-light my-3" />

          {/* Related entities */}
          <div>
            <label className="text-xs font-semibold text-text-tertiary uppercase mb-2 block">
              קישורים
            </label>
            <div className="space-y-1.5">
              {task.contact && (
                <button
                  onClick={() => navigate(`/contacts?detail=${task.contact!.id}`)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-surface-secondary/50 transition-colors text-sm text-text-primary group"
                >
                  <User size={14} className="text-primary" />
                  <span className="flex-1 text-right">{task.contact.name}</span>
                  <ExternalLink
                    size={12}
                    className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              {task.deal && (
                <button
                  onClick={() => navigate(`/deals`)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-surface-secondary/50 transition-colors text-sm text-text-primary group"
                >
                  <Handshake size={14} className="text-success" />
                  <span className="flex-1 text-right">{task.deal.title}</span>
                  <ExternalLink
                    size={12}
                    className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              {task.ticket && (
                <button
                  onClick={() => navigate(`/tickets`)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-surface-secondary/50 transition-colors text-sm text-text-primary group"
                >
                  <Ticket size={14} className="text-warning" />
                  <span className="flex-1 text-right">
                    {task.ticket.subject}
                  </span>
                  <ExternalLink
                    size={12}
                    className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              {!task.contact && !task.deal && !task.ticket && (
                <p className="text-xs text-text-tertiary px-3 py-2">
                  אין קישורים
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border-light my-3" />

          {/* Metadata */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">נוצר על ידי</span>
              <span className="text-text-secondary font-medium">
                {task.createdBy}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">תאריך יצירה</span>
              <span className="text-text-secondary font-medium">
                {new Date(task.createdAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {task.completedAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">הושלם ב</span>
                <span className="text-success font-medium">
                  {new Date(task.completedAt).toLocaleDateString("he-IL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Activity Tab */
        <div className="space-y-1">
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-8">
              אין פעילות רשומה
            </p>
          ) : (
            activities.map((a) => {
              const color = ACTIVITY_COLORS[a.type] || "#C4C4C4";
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-2.5 border-r-[3px] pr-3 rounded-lg hover:bg-surface-secondary/50 transition-all"
                  style={{ borderRightColor: color }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-white"
                    style={{ backgroundColor: color }}
                  >
                    {ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.SYSTEM}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary block truncate">
                      {a.subject ||
                        activityTypes[a.type]?.label ||
                        a.type}
                    </span>
                    {a.body && (
                      <p className="text-xs text-text-tertiary truncate">
                        {a.body}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-text-tertiary flex-shrink-0">
                    {formatRelativeTime(a.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-text-primary mb-2">מחיקת משימה</h3>
            <p className="text-sm text-text-secondary mb-4">
              האם אתה בטוח שברצונך למחוק את המשימה &quot;{task.title}&quot;?
              פעולה זו לא ניתנת לביטול.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
              >
                ביטול
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? "מוחק..." : "מחק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return "היום";
    if (futureDays === 1) return "מחר";
    return `בעוד ${futureDays} ימים`;
  }

  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}
