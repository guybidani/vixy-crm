import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../../lib/utils";
import SnoozeDropdown from "../shared/SnoozeDropdown";
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
  Send,
  Headphones,
  Layers,
} from "lucide-react";

const TASK_TYPE_OPTIONS = [
  { value: "TASK", label: "משימה", icon: "📋", color: "#6161FF" },
  { value: "CALL", label: "שיחה", icon: "📞", color: "#00CA72" },
  { value: "EMAIL", label: "אימייל", icon: "📧", color: "#579BFC" },
  { value: "MEETING", label: "פגישה", icon: "🤝", color: "#A25DDC" },
  { value: "WHATSAPP", label: "וואטסאפ", icon: "💬", color: "#25D366" },
  { value: "FOLLOW_UP", label: "מעקב", icon: "🔄", color: "#FDAB3D" },
];

const TASK_CONTEXT_OPTIONS = [
  { value: "SALES", label: "מכירות", icon: TrendingUp, color: "#00CA72" },
  { value: "SERVICE", label: "שירות", icon: Headphones, color: "#FDAB3D" },
  { value: "GENERAL", label: "כללי", icon: Layers, color: "#C3C6D4" },
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
  listTaskComments,
  createTaskComment,
  deleteTaskComment,
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
  const { currentWorkspaceId, workspaces } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "activity" | "comments">("info");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [editingOutcome, setEditingOutcome] = useState(false);
  const [outcomeValue, setOutcomeValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const currentMemberId = workspaces.find((w) => w.id === currentWorkspaceId)?.memberId;

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

  // Activities for this task — fetch by whatever entity is linked (contact, deal, or ticket)
  const activityEntityId = task?.contact?.id || task?.deal?.id || task?.ticket?.id;
  const activityParams = task?.contact?.id
    ? { contactId: task.contact.id, limit: 20 }
    : task?.deal?.id
      ? { dealId: task.deal.id, limit: 20 }
      : task?.ticket?.id
        ? { ticketId: task.ticket.id, limit: 20 }
        : undefined;
  const { data: activities } = useQuery({
    queryKey: ["activities", activityParams],
    queryFn: () => listActivities(activityParams!),
    enabled: activeTab === "activity" && !!activityEntityId,
  });

  // Comments
  const { data: comments } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => listTaskComments(taskId),
    enabled: !!taskId,
  });

  const createCommentMutation = useMutation({
    mutationFn: (body: string) => createTaskComment(taskId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      setCommentBody("");
    },
    onError: () => {
      toast.error("שגיאה בהוספת תגובה");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      toast.success("תגובה נמחקה");
    },
    onError: () => {
      toast.error("שגיאה במחיקת תגובה");
    },
  });

  const handleSubmitComment = () => {
    const trimmed = commentBody.trim();
    if (!trimmed) return;
    createCommentMutation.mutate(trimmed);
  };

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
        <div className="w-5 h-5 border-2 border-[#0073EA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#676879]">משימה לא נמצאה</p>
      </div>
    );
  }

  const isDone = task.status === "DONE";
  const isCancelled = task.status === "CANCELLED";
  const isOverdue =
    task.dueDate && !isDone && !isCancelled && (() => {
      const due = new Date(task.dueDate!); due.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return due < today;
    })();
  const overdueDays = isOverdue && task.dueDate ? (() => {
    const due = new Date(task.dueDate!); due.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  })() : 0;
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
                  ? "text-[#E44258]"
                  : "text-[#0073EA]"
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              className="text-lg font-bold text-[#323338] bg-white border border-[#0073EA] rounded px-2 py-0.5 outline-none w-full"
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
              className={`text-lg font-bold cursor-text hover:bg-[#F5F6F8] rounded px-1 -mx-1 transition-colors ${
                isDone
                  ? "line-through text-[#9699A6]"
                  : "text-[#323338]"
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
            {(() => {
              const tc = TASK_CONTEXT_OPTIONS.find(o => o.value === (task.taskContext || "GENERAL"));
              return tc && tc.value !== "GENERAL" ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tc.color }}>
                  {tc.label}
                </span>
              ) : null;
            })()}
            {task.dueTime && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F6F8] text-[#676879] flex items-center gap-0.5">
                <Clock size={9} /> {task.dueTime}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E44258]/10 text-[#E44258] flex items-center gap-0.5">
                <AlertTriangle size={9} />
                באיחור!
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isDone && (
            <SnoozeDropdown taskId={taskId} variant="button" />
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-[4px] text-[#9699A6] hover:text-[#E44258] hover:bg-[#E44258]/10 transition-colors"
            title="מחיקה"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-[4px] text-[#9699A6] hover:text-[#323338] hover:bg-[#F5F6F8] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#E6E9EF]">
        {(
          [
            { key: "info", label: "פרטים" },
            { key: "comments", label: `תגובות${comments && comments.length > 0 ? ` (${comments.length})` : ""}` },
            { key: "activity", label: "פעילות" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#0073EA] text-[#0073EA]"
                : "border-transparent text-[#9699A6] hover:text-[#676879]"
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
            <label className="text-xs font-semibold text-[#9699A6] uppercase mb-1.5 block">
              תיאור
            </label>
            {editingDescription ? (
              <textarea
                autoFocus
                className="w-full px-3 py-2 border border-[#0073EA] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 resize-none min-h-[80px]"
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
                className="text-[13px] text-[#676879] cursor-text rounded-[4px] px-3 py-2 hover:bg-[#F5F6F8] transition-colors min-h-[40px] whitespace-pre-wrap"
                onClick={() => {
                  setDescriptionValue(task.description || "");
                  setEditingDescription(true);
                }}
              >
                {task.description || (
                  <span className="text-[#9699A6]">
                    לחץ להוספת תיאור...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-[#9699A6] uppercase">
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
            <label className="text-xs font-semibold text-[#9699A6] uppercase flex items-center gap-1.5">
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

          {/* Task Context */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-[#9699A6] uppercase flex items-center gap-1.5">
              <Layers size={13} />
              הקשר
            </label>
            <div className="flex flex-wrap gap-1">
              {TASK_CONTEXT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = (task.taskContext || "GENERAL") === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateMutation.mutate({ taskContext: opt.value })}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all"
                    style={
                      isActive
                        ? { backgroundColor: opt.color, color: "#fff", borderColor: opt.color }
                        : { backgroundColor: "transparent", color: opt.color, borderColor: opt.color }
                    }
                  >
                    <Icon size={11} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date + Time */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-[#9699A6] uppercase flex items-center gap-1.5">
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
                className="text-xs border border-[#E6E9EF] rounded px-2 py-1 focus:outline-none focus:border-[#0073EA] bg-white"
                title="שעת יעד"
              />
              {isOverdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E44258]/10 text-[#E44258] flex items-center gap-1">
                  <AlertTriangle size={10} />
                  {overdueDays} ימים באיחור
                </span>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold text-[#9699A6] uppercase flex items-center gap-1.5">
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
              <label className="text-xs font-semibold text-[#9699A6] uppercase mb-1.5 block flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-success" />
                תוצאה / סיכום
              </label>
              {editingOutcome ? (
                <textarea
                  autoFocus
                  className="w-full px-3 py-2 border border-success rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-success/30 resize-none min-h-[70px] bg-success/5"
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
                  className="text-[13px] text-[#676879] cursor-text rounded-[4px] px-3 py-2 hover:bg-success/5 transition-colors min-h-[36px] border border-dashed border-success/30"
                  onClick={() => {
                    setOutcomeValue(task.outcomeNote || "");
                    setEditingOutcome(true);
                  }}
                >
                  {task.outcomeNote || (
                    <span className="text-[#9699A6]">הוסף סיכום מה התרחש...</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#E6E9EF] my-3" />

          {/* Related entities */}
          <div>
            <label className="text-xs font-semibold text-[#9699A6] uppercase mb-2 block">
              קישורים
            </label>
            <div className="space-y-1.5">
              {task.contact && (
                <button
                  onClick={() => navigate(`/contacts/${task.contact!.id}`)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[13px] text-[#323338] group"
                >
                  <User size={14} className="text-[#0073EA]" />
                  <span className="flex-1 text-right">{task.contact.name}</span>
                  <ExternalLink
                    size={12}
                    className="text-[#9699A6] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              {task.deal && (
                <button
                  onClick={() => navigate(`/deals?open=${task.deal!.id}`)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[13px] text-[#323338] group"
                >
                  <Handshake size={14} className="text-success" />
                  <span className="flex-1 text-right">{task.deal.title}</span>
                  <ExternalLink
                    size={12}
                    className="text-[#9699A6] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              {task.ticket && (
                <button
                  onClick={() => navigate(`/tickets/${task.ticket!.id}`)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[13px] text-[#323338] group"
                >
                  <Ticket size={14} className="text-warning" />
                  <span className="flex-1 text-right">
                    {task.ticket.subject}
                  </span>
                  <ExternalLink
                    size={12}
                    className="text-[#9699A6] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
              {!task.contact && !task.deal && !task.ticket && (
                <p className="text-xs text-[#9699A6] px-3 py-2">
                  אין קישורים
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E6E9EF] my-3" />

          {/* Metadata */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9699A6]">נוצר על ידי</span>
              <span className="text-[#676879] font-medium">
                {task.createdBy}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9699A6]">תאריך יצירה</span>
              <span className="text-[#676879] font-medium">
                {new Date(task.createdAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {task.completedAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9699A6]">הושלם ב</span>
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
      ) : activeTab === "comments" ? (
        /* Comments Tab */
        <div className="flex flex-col gap-4">
          {/* Comment list */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {!comments || comments.length === 0 ? (
              <p className="text-sm text-[#9699A6] text-center py-8">
                אין תגובות עדיין
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0073EA]/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#0073EA]">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#323338]">
                        {comment.authorName}
                      </span>
                      <span className="text-[10px] text-[#9699A6]">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                      {comment.authorId === currentMemberId && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                          className="p-1 rounded text-[#9699A6] hover:text-[#E44258] hover:bg-[#E44258]/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="מחק תגובה"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-[#676879] whitespace-pre-wrap mt-0.5">
                      {comment.body}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="border-t border-[#E6E9EF] pt-3">
            <div className="flex gap-2">
              <textarea
                className="flex-1 px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none min-h-[60px] placeholder:text-[#9699A6]"
                placeholder="כתוב תגובה..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[#9699A6]">
                Ctrl+Enter לשליחה
              </span>
              <button
                onClick={handleSubmitComment}
                disabled={!commentBody.trim() || createCommentMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0073EA] hover:bg-[#0060C2]/90 text-white text-[12px] font-semibold rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={12} />
                הוסף תגובה
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Activity Tab */
        <div className="space-y-1">
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-[#9699A6] text-center py-8">
              אין פעילות רשומה
            </p>
          ) : (
            activities.map((a) => {
              const color = ACTIVITY_COLORS[a.type] || "#C4C4C4";
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-2.5 border-r-[3px] pr-3 rounded-[4px] hover:bg-[#F5F6F8] transition-all"
                  style={{ borderRightColor: color }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-white"
                    style={{ backgroundColor: color }}
                  >
                    {ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.SYSTEM}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#323338] block truncate">
                      {a.subject ||
                        activityTypes[a.type]?.label ||
                        a.type}
                    </span>
                    {a.body && (
                      <p className="text-xs text-[#9699A6] truncate">
                        {a.body}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#9699A6] flex-shrink-0">
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
        <div className="fixed inset-0 bg-black/20  z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-[#323338] mb-2">מחיקת משימה</h3>
            <p className="text-sm text-[#676879] mb-4">
              האם אתה בטוח שברצונך למחוק את המשימה &quot;{task.title}&quot;?
              פעולה זו לא ניתנת לביטול.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
              >
                ביטול
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-[#E44258] hover:bg-[#E44258]/90 text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
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

