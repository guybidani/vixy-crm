import { useState, useMemo, useEffect, useRef, type MouseEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  Calendar,
  User,
  SortAsc,
  AlertTriangle,
  Search,
  ChevronDown,
  Repeat,
  TrendingUp,
  Headphones,
  Layers,
  Phone,
  Mail,
  MessageCircle,
  Users,
  RefreshCw,
  ClipboardList,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlarmClock,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ExportButton from "../components/shared/ExportButton";
import TaskDetailPanel from "../components/tasks/TaskDetailPanel";
import TaskCreateModal from "../components/tasks/TaskCreateModal";
import SnoozeDropdown from "../components/shared/SnoozeDropdown";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  bulkDeleteTasks,
  bulkUpdateTasks,
  getTasksBoard,
  type Task,
} from "../api/tasks";
import BulkActionBar from "../components/shared/BulkActionBar";
import { getWorkspaceMembers } from "../api/auth";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, typeof Circle> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
  CANCELLED: Ban,
};

const TASK_TYPE_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string; bg: string }> = {
  CALL: { label: "שיחה", icon: Phone, color: "#579BFC", bg: "#EBF4FF" },
  EMAIL: { label: "מייל", icon: Mail, color: "#FDAB3D", bg: "#FFF5E0" },
  MEETING: { label: "פגישה", icon: Users, color: "#9B59B6", bg: "#F5EEFF" },
  WHATSAPP: { label: "וואטסאפ", icon: MessageCircle, color: "#00CA72", bg: "#E0FAF0" },
  FOLLOW_UP: { label: "מעקב", icon: RefreshCw, color: "#FF7575", bg: "#FFF0F0" },
  TASK: { label: "משימה", icon: ClipboardList, color: "#C3C6D4", bg: "#F4F5F8" },
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#FB275D",
  HIGH: "#FDAB3D",
  MEDIUM: "#579BFC",
  LOW: "#C3C6D4",
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "דחוף",
  HIGH: "גבוה",
  MEDIUM: "בינוני",
  LOW: "נמוך",
};

const TASK_CONTEXT_OPTIONS = [
  { key: "", label: "הכל", color: "#6161FF", icon: null },
  { key: "SALES", label: "מכירות", color: "#00CA72", icon: TrendingUp },
  { key: "SERVICE", label: "שירות", color: "#FDAB3D", icon: Headphones },
  { key: "GENERAL", label: "כללי", color: "#C3C6D4", icon: Layers },
];

const TASK_CONTEXT_BADGE: Record<string, { label: string; color: string }> = {
  SALES: { label: "מכירות", color: "#00CA72" },
  SERVICE: { label: "שירות", color: "#FDAB3D" },
  GENERAL: { label: "כללי", color: "#C3C6D4" },
};

// ─── Date grouping logic ──────────────────────────────────────────────────────

type DateGroup = "overdue" | "today" | "tomorrow" | "this_week" | "next_week" | "later" | "no_date";

interface DateGroupConfig {
  key: DateGroup;
  label: string;
  headerColor: string;
  headerTextColor: string;
  emptyLabel: string;
}

const DATE_GROUP_CONFIG: DateGroupConfig[] = [
  { key: "overdue", label: "באיחור", headerColor: "#FFF0F0", headerTextColor: "#D63031", emptyLabel: "אין משימות באיחור", },
  { key: "today", label: "היום", headerColor: "#FFF8E6", headerTextColor: "#E17055", emptyLabel: "אין משימות להיום", },
  { key: "tomorrow", label: "מחר", headerColor: "#EBF4FF", headerTextColor: "#0984E3", emptyLabel: "אין משימות למחר", },
  { key: "this_week", label: "השבוע", headerColor: "#F0FFF8", headerTextColor: "#00B894", emptyLabel: "אין משימות לשבוע זה", },
  { key: "next_week", label: "שבוע הבא", headerColor: "#F5EEFF", headerTextColor: "#6C5CE7", emptyLabel: "אין משימות לשבוע הבא", },
  { key: "later", label: "מאוחר יותר", headerColor: "#F4F5F8", headerTextColor: "#636E72", emptyLabel: "אין משימות", },
  { key: "no_date", label: "ללא תאריך", headerColor: "#F4F5F8", headerTextColor: "#B2BEC3", emptyLabel: "אין משימות ללא תאריך", },
];

function getDateGroup(task: Task): DateGroup {
  if (!task.dueDate) return "no_date";
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0 && task.status !== "DONE" && task.status !== "CANCELLED") return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";

  // end of this week (Sunday-Saturday)
  const dayOfWeek = today.getDay(); // 0=Sunday
  const daysUntilSaturday = 6 - dayOfWeek;
  if (diff <= daysUntilSaturday) return "this_week";

  const daysUntilNextSaturday = daysUntilSaturday + 7;
  if (diff <= daysUntilNextSaturday) return "next_week";

  return "later";
}

function groupTasksByDate(tasks: Task[]): Record<DateGroup, Task[]> {
  const groups: Record<DateGroup, Task[]> = {
    overdue: [], today: [], tomorrow: [], this_week: [], next_week: [], later: [], no_date: [],
  };
  for (const task of tasks) {
    groups[getDateGroup(task)].push(task);
  }
  return groups;
}

// ─── Date filter ─────────────────────────────────────────────────────────────

type DateFilter = "all" | "today" | "week" | "overdue";

// ─── TypeChip ────────────────────────────────────────────────────────────────

function TypeChip({ taskType }: { taskType: string }) {
  const cfg = TASK_TYPE_CONFIG[taskType] ?? TASK_TYPE_CONFIG.TASK;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <Icon size={10} />
      <span>{cfg.label}</span>
    </span>
  );
}

// ─── ContactAvatar ────────────────────────────────────────────────────────────

function ContactAvatar({ name, id, onClick }: { name: string; id?: string; onClick?: () => void }) {
  const navigate = useNavigate();
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (id) {
      navigate(`/contacts/${id}`);
    }
  };
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 group/contact"
      title={name}
    >
      <div className="w-6 h-6 rounded-full bg-[#0073EA]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-bold text-[#0073EA]">{initials}</span>
      </div>
      <span className="text-xs text-[#676879] group-hover/contact:text-[#0073EA] transition-colors hidden sm:inline truncate max-w-[90px]">
        {name}
      </span>
    </button>
  );
}

// ─── PriorityBadge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] ?? "#C3C6D4";
  const label = PRIORITY_LABELS[priority] ?? priority;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 text-white"
      style={{ backgroundColor: color }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/50 inline-block" />
      {label}
    </span>
  );
}

// ─── DueDateCell ─────────────────────────────────────────────────────────────

function DueDateCell({ dueDate, dueTime, status }: { dueDate: string | null; dueTime: string | null; status: string }) {
  if (!dueDate) return <span className="text-[11px] text-[#9699A6]">—</span>;

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diff < 0 && status !== "DONE" && status !== "CANCELLED";
  const isToday = diff === 0;

  let label: string;
  if (diff === 0) label = "היום";
  else if (diff === 1) label = "מחר";
  else if (diff === -1) label = "אתמול";
  else label = due.toLocaleDateString("he-IL", { day: "numeric", month: "short" });

  return (
    <span
      className={`flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 flex-shrink-0 ${
        isOverdue
          ? "bg-[#E44258]/10 text-[#E44258] font-bold"
          : isToday
          ? "bg-warning/10 text-warning font-bold"
          : "text-[#676879]"
      }`}
    >
      {isOverdue ? <AlertTriangle size={10} /> : isToday ? <Clock size={10} /> : <Calendar size={10} />}
      <span>{label}</span>
      {dueTime && <span className="opacity-70">{dueTime.slice(0, 5)}</span>}
    </span>
  );
}

// ─── TaskDotMenu ─────────────────────────────────────────────────────────────

function TaskDotMenu({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded hover:bg-[#F5F6F8] opacity-0 group-hover/row:opacity-100 transition-opacity text-[#9699A6] hover:text-[#323338]"
        title="פעולות"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-modal border border-[#E6E9EF] z-30 py-1 min-w-[140px]">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }}
            className="w-full text-right px-3 py-2 text-[13px] hover:bg-[#F5F6F8] flex items-center gap-2 transition-colors text-[#323338]"
          >
            <Pencil size={13} className="text-[#9699A6]" />
            עריכה
          </button>
          <SnoozeDropdown taskId={task.id} onSnoozed={() => setOpen(false)} />
          <div className="border-t border-[#E6E9EF] my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
            className="w-full text-right px-3 py-2 text-[13px] hover:bg-[#E44258]/5 flex items-center gap-2 transition-colors text-[#E44258]"
          >
            <Trash2 size={13} />
            מחיקה
          </button>
        </div>
      )}
    </div>
  );
}

// ─── InlineTaskCreate ─────────────────────────────────────────────────────────

function InlineTaskCreate({ dueDate }: { dueDate?: string }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const mutation = useMutation({
    mutationFn: () => createTask({ title, dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      setTitle("");
      setIsAdding(false);
      toast.success("משימה נוצרה");
    },
    onError: () => toast.error("שגיאה ביצירת משימה"),
  });

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full px-4 py-2 text-[13px] text-[#9699A6] hover:text-[#0073EA] hover:bg-[#F5F6FF] transition-colors flex items-center gap-2 border-t border-[#E6E9EF]"
      >
        <Plus size={14} />
        <span>+ משימה חדשה</span>
      </button>
    );
  }
  return (
    <div className="px-4 py-2.5 flex items-center gap-2 border-t border-[#E6E9EF] bg-[#F5F6FF]">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) mutation.mutate();
          if (e.key === "Escape") { setIsAdding(false); setTitle(""); }
        }}
        placeholder="כותרת משימה חדשה..."
        dir="rtl"
        className="flex-1 px-3 py-1.5 text-[13px] border border-[#E6E9EF] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
      />
      <button
        onClick={() => { if (title.trim()) mutation.mutate(); }}
        disabled={!title.trim() || mutation.isPending}
        className="px-3 py-1.5 bg-[#0073EA] text-white text-[12px] font-semibold rounded-[4px] hover:bg-[#0060C2] disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? "..." : "הוסף"}
      </button>
      <button onClick={() => { setIsAdding(false); setTitle(""); }} className="p-1 rounded text-[#9699A6] hover:text-[#323338]">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── TaskRow (Monday.com style) ───────────────────────────────────────────────

function TaskRow({
  task,
  onComplete,
  onDelete,
  onEdit,
  inlineUpdate,
  memberOptions,
  onClick,
  selected,
  onToggleSelect,
  showCheckbox,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  inlineUpdate: (id: string, data: Record<string, unknown>) => void;
  memberOptions: { id: string; name: string }[];
  onClick?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}) {
  const isDone = task.status === "DONE";
  const StatusIcon = STATUS_ICONS[task.status] || Circle;

  return (
    <div
      className={`group/row flex items-center gap-3 px-3 py-2.5 border-b border-[#E6E9EF] last:border-0 transition-colors cursor-pointer
        ${isDone ? "opacity-60" : ""}
        ${selected ? "bg-[#0073EA]/5" : "hover:bg-[#F5F6FF]"}
      `}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Checkbox */}
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA]/20 flex-shrink-0 cursor-pointer transition-opacity ${
            showCheckbox || selected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Complete toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="flex-shrink-0 transition-colors"
        title={isDone ? "סמן כלא הושלם" : "סמן כהושלם"}
      >
        <StatusIcon
          size={18}
          className={
            isDone
              ? "text-success"
              : task.status === "IN_PROGRESS"
              ? "text-warning"
              : "text-[#9699A6] hover:text-success"
          }
        />
      </button>

      {/* Type chip */}
      <TypeChip taskType={task.taskType} />

      {/* Title */}
      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <MondayTextCell
          value={task.title}
          onChange={(val) => inlineUpdate(task.id, { title: val })}
          placeholder="כותרת משימה"
          className={isDone ? "line-through text-[#9699A6]" : "font-semibold text-[#323338]"}
        />
        {task.description && (
          <p className="text-xs text-[#9699A6] mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      {/* Right side metadata */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Contact */}
        {task.contact && (
          <ContactAvatar name={task.contact.name} id={task.contact.id} />
        )}

        {/* Due date */}
        <DueDateCell dueDate={task.dueDate} dueTime={task.dueTime} status={task.status} />

        {/* Priority badge */}
        <PriorityBadge priority={task.priority} />

        {/* Context badge */}
        {task.taskContext && task.taskContext !== "GENERAL" && (() => {
          const ctx = TASK_CONTEXT_BADGE[task.taskContext];
          return ctx ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0 hidden lg:inline"
              style={{ backgroundColor: ctx.color }}
            >
              {ctx.label}
            </span>
          ) : null;
        })()}

        {/* Recurring icon */}
        {task.isRecurring && (
          <span className="text-[#0073EA]/70 flex-shrink-0" title="משימה חוזרת">
            <Repeat size={11} />
          </span>
        )}

        {/* Assignee */}
        <MondayPersonCell
          value={task.assignee ? { id: task.assignee.id, name: task.assignee.name } : null}
          onChange={(id) => inlineUpdate(task.id, { assigneeId: id! })}
          options={memberOptions}
          placeholder="נציג"
        />

        {/* Dot menu */}
        <TaskDotMenu task={task} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ─── DateGroup section ────────────────────────────────────────────────────────

function DateGroupSection({
  config,
  tasks,
  onComplete,
  onDelete,
  onEdit,
  inlineUpdate,
  memberOptions,
  onTaskClick,
  selectedIds,
  onToggleSelect,
  showCheckboxes,
  defaultOpen,
}: {
  config: DateGroupConfig;
  tasks: Task[];
  onComplete: (task: Task) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  inlineUpdate: (id: string, data: Record<string, unknown>) => void;
  memberOptions: { id: string; name: string }[];
  onTaskClick: (task: Task) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  showCheckboxes: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  // Due date for inline create
  const inlineCreateDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (config.key === "today") return today.toISOString().split("T")[0];
    if (config.key === "tomorrow") {
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      return t.toISOString().split("T")[0];
    }
    return undefined;
  }, [config.key]);

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden border border-[#E6E9EF]">
      {/* Group header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:opacity-90"
        style={{ backgroundColor: config.headerColor }}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          size={14}
          className="transition-transform flex-shrink-0"
          style={{
            color: config.headerTextColor,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        />
        <span className="font-bold text-[13px]" style={{ color: config.headerTextColor }}>
          {config.label}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: config.headerTextColor + "20", color: config.headerTextColor }}
        >
          {tasks.length}
        </span>
        {config.key === "overdue" && tasks.length > 0 && (
          <AlertTriangle size={12} style={{ color: config.headerTextColor }} />
        )}
      </button>

      {/* Tasks */}
      {open && (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-[#F5F6F8]/40 border-b border-[#E6E9EF] text-[11px] font-semibold text-[#9699A6]">
            <div className="w-4 h-4 flex-shrink-0" />
            <div className="w-5 h-5 flex-shrink-0" />
            <div className="w-20 flex-shrink-0" />
            <div className="flex-1">כותרת</div>
            <div className="w-28 text-right">איש קשר</div>
            <div className="w-20 text-right">תאריך</div>
            <div className="w-16 text-right">עדיפות</div>
            <div className="w-20 text-right">נציג</div>
            <div className="w-6 flex-shrink-0" />
          </div>

          {tasks.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-[#9699A6]">{config.emptyLabel}</div>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={() => onComplete(task)}
                onDelete={() => onDelete(task.id)}
                onEdit={() => onEdit(task)}
                inlineUpdate={inlineUpdate}
                memberOptions={memberOptions}
                onClick={() => onTaskClick(task)}
                selected={selectedIds.has(task.id)}
                onToggleSelect={() => onToggleSelect(task.id)}
                showCheckbox={showCheckboxes}
              />
            ))
          )}

          <InlineTaskCreate dueDate={inlineCreateDate} />
        </div>
      )}
    </div>
  );
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        active
          ? "text-white shadow-sm"
          : "bg-white border border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
      }`}
      style={active ? { backgroundColor: color || "#6161FF" } : undefined}
    >
      {label}
    </button>
  );
}

// ─── Priority filter dropdown ─────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { key: "", label: "כל העדיפויות" },
  { key: "URGENT", label: "דחוף" },
  { key: "HIGH", label: "גבוה" },
  { key: "MEDIUM", label: "בינוני" },
  { key: "LOW", label: "נמוך" },
];

function PriorityFilterDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const active = PRIORITY_OPTIONS.find((o) => o.key === value);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
          value
            ? "bg-[#0073EA] text-white border-[#0073EA] shadow-sm"
            : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
        }`}
      >
        {value && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PRIORITY_COLORS[value] || "#C3C6D4" }} />}
        {active?.label ?? "כל העדיפויות"}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-[#E6E9EF] rounded-[4px] shadow-modal z-20 py-1 min-w-[130px]">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full text-right px-3 py-1.5 text-[12px] hover:bg-[#0073EA]/5 flex items-center gap-2 transition-colors ${
                value === opt.key ? "text-[#0073EA] font-semibold" : "text-[#323338]"
              }`}
            >
              {opt.key && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLORS[opt.key] || "#C3C6D4" }} />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Kanban card ──────────────────────────────────────────────────────────────

function TaskKanbanCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const { priorities } = useWorkspaceOptions();
  const isDone = task.status === "DONE";
  const priorityInfo = priorities[task.priority];
  const borderColor = PRIORITY_COLORS[task.priority] || "#C3C6D4";
  const isTaskOverdue =
    task.dueDate &&
    !isDone &&
    task.status !== "CANCELLED" &&
    (() => {
      const due = new Date(task.dueDate!);
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    })();
  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${isTaskOverdue ? "border-r-[3px] border-r-[#E44258]" : ""} ${isDragging ? "shadow-lg opacity-90 -translate-y-0.5" : isDone ? "opacity-70 hover:shadow-md" : "hover:shadow-md hover:-translate-y-0.5"}`}
      style={{ borderLeftColor: isDragging ? "#6161FF" : isTaskOverdue ? "#FF4D4F" : borderColor }}
    >
      <span className={`font-semibold text-[13px] block mb-1.5 ${isDone ? "line-through text-[#9699A6]" : "text-[#323338]"}`}>{task.title}</span>
      {task.description && <p className="text-xs text-[#9699A6] truncate mb-2">{task.description}</p>}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}>
          {priorityInfo?.label || task.priority}
        </span>
        <TypeChip taskType={task.taskType} />
        {task.taskContext && task.taskContext !== "GENERAL" && (() => {
          const ctx = TASK_CONTEXT_BADGE[task.taskContext];
          return ctx ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: ctx.color }}>
              {ctx.label}
            </span>
          ) : null;
        })()}
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E6E9EF]">
        <div className="flex items-center gap-1">
          {task.contact && <span className="text-[11px] text-[#676879] truncate max-w-[80px]">{task.contact.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {task.isRecurring && (
            <span className="text-[#0073EA]/70" title="משימה חוזרת">
              <Repeat size={11} />
            </span>
          )}
          <DueDateCell dueDate={task.dueDate} dueTime={task.dueTime} status={task.status} />
          {task.assignee ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-[#0073EA]" title={task.assignee.name}>
              <span className="text-white text-[9px] font-bold">{task.assignee.name[0]}</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-border" title="לא הוקצה">
              <User size={10} className="text-[#9699A6]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "DONE" || t.status === "CANCELLED") return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;
  const dueToday = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }).length;
  const completed = tasks.filter((t) => t.status === "DONE").length;
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-white rounded-xl border border-[#E6E9EF] shadow-[0_1px_6px_rgba(0,0,0,0.08)] text-[13px] flex-wrap">
      <span className="text-[#676879]">
        <span className="font-semibold text-[#323338]">{tasks.length}</span> משימות
      </span>
      <span className="text-border select-none hidden sm:inline">|</span>
      <span className="text-[#676879]">
        באיחור: <span className={`font-semibold ${overdue > 0 ? "text-[#E44258]" : "text-[#9699A6]"}`}>{overdue}</span>
      </span>
      <span className="text-border select-none hidden sm:inline">|</span>
      <span className="text-[#676879]">
        היום: <span className={`font-semibold ${dueToday > 0 ? "text-warning" : "text-[#9699A6]"}`}>{dueToday}</span>
      </span>
      <span className="text-border select-none hidden sm:inline">|</span>
      <span className="text-[#676879]">
        הושלמו: <span className={`font-semibold ${completed > 0 ? "text-success" : "text-[#9699A6]"}`}>{completed}</span>
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { taskStatuses, priorities } = useWorkspaceOptions();
  const { currentWorkspaceId, workspaces } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState("");
  const [contextFilter, setContextFilter] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCreate, setShowCreate] = useState(() => searchParams.get("new") === "1");

  // Clear the ?new=1 param once we've opened the modal
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreate(true);
      setSearchParams((prev) => { prev.delete("new"); return prev; }, { replace: true });
    }
    // Clear the ?selected= param once we've opened the task panel
    const selectedId = searchParams.get("selected");
    if (selectedId) {
      setSelectedTaskId(selectedId);
      setSearchParams((prev) => { prev.delete("selected"); return prev; }, { replace: true });
    }
  }, []);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [searchRaw, setSearchRaw] = useState("");
  const searchQuery = useDebounce(searchRaw, 300);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get("selected") || null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkPriorityMenu, setShowBulkPriorityMenu] = useState(false);
  const bulkPriorityRef = useRef<HTMLDivElement>(null);

  void priorities;

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedTaskIds(new Set());

  const currentMemberId = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId)?.memberId ?? null,
    [workspaces, currentWorkspaceId],
  );

  const inlineUpdate = useInlineUpdate(updateTask, [["tasks"], ["tasks-board"]]);
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });
  const memberOptions = (members || []).map((m) => ({ id: m.memberId, name: m.name }));

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", { taskTypeFilter, contextFilter, sortBy, sortDir, myTasksOnly }],
    queryFn: () =>
      listTasks({
        taskType: taskTypeFilter || undefined,
        taskContext: contextFilter || undefined,
        limit: 500,
        sortBy,
        sortDir,
        myOnly: myTasksOnly,
      }),
    enabled: viewMode === "table",
  });

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["tasks-board"],
    queryFn: getTasksBoard,
    enabled: viewMode === "kanban",
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
    },
  });

  const tasks = useMemo(() => {
    let list = data?.data || [];
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (searchQuery.trim()) list = list.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateFilter === "today") {
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      });
    } else if (dateFilter === "week") {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due >= today && due <= weekEnd;
      });
    } else if (dateFilter === "overdue") {
      list = list.filter((t) => {
        if (!t.dueDate || t.status === "DONE" || t.status === "CANCELLED") return false;
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
      });
    }

    return list;
  }, [data, priorityFilter, searchQuery, dateFilter]);

  const groupedTasks = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const kanbanColumns: KanbanCol<Task>[] = useMemo(
    () =>
      Object.entries(taskStatuses).map(([key, info]) => {
        let items = boardData?.statuses[key] || [];
        if (priorityFilter) items = items.filter((t) => t.priority === priorityFilter);
        if (contextFilter) items = items.filter((t) => t.taskContext === contextFilter);
        if (myTasksOnly && currentMemberId) items = items.filter((t) => t.assignee?.id === currentMemberId);
        if (searchQuery.trim()) items = items.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return { key, label: info.label, color: info.color, items };
      }),
    [taskStatuses, boardData, priorityFilter, contextFilter, myTasksOnly, currentMemberId, searchQuery],
  );

  function handleKanbanDragEnd(itemId: string, _fromColumn: string, toColumn: string) {
    toggleMutation.mutate({ id: itemId, status: toColumn });
    toast.success(`משימה הועברה ל${taskStatuses[toColumn]?.label}`);
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      toast.success("משימה נמחקה");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTasks(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      toast.success(`${result.deleted} משימות נמחקו`);
      clearSelection();
    },
    onError: () => toast.error("שגיאה במחיקת משימות"),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data: updateData }: { ids: string[]; data: { status?: string; priority?: string; assigneeId?: string; dueDate?: string } }) =>
      bulkUpdateTasks(ids, updateData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      toast.success(`${result.updated} משימות עודכנו`);
      clearSelection();
    },
    onError: () => toast.error("שגיאה בעדכון משימות"),
  });

  const handleBulkDelete = () => setShowBulkDeleteConfirm(true);
  const handleBulkMarkDone = () => bulkUpdateMutation.mutate({ ids: Array.from(selectedTaskIds), data: { status: "DONE" } });
  const handleBulkPriority = (priority: string) => {
    bulkUpdateMutation.mutate({ ids: Array.from(selectedTaskIds), data: { priority } });
    setShowBulkPriorityMenu(false);
  };

  useEffect(() => {
    if (!showBulkPriorityMenu) return;
    function handler(e: MouseEvent) {
      if (bulkPriorityRef.current && !bulkPriorityRef.current.contains(e.target as Node)) setShowBulkPriorityMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBulkPriorityMenu]);

  const sortOptions = [
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "dueDate", label: "תאריך יעד" },
    { key: "priority", label: "עדיפות" },
    { key: "title", label: "כותרת" },
  ];

  const DATE_FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "today", label: "היום" },
    { key: "week", label: "השבוע" },
    { key: "overdue", label: "באיחור" },
  ];

  const allTasks = data?.data || [];

  return (
    <div className="flex h-full">
      <div className={`flex-1 min-w-0 ${selectedTaskId ? "ml-[400px]" : ""}`}>
        <PageShell
          boardStyle
          emoji="✅"
          title="המשימות שלי"
          subtitle={`${allTasks.length} משימות`}
          views={[
            { key: "table", label: "טבלה" },
            { key: "kanban", label: "לוח" },
          ]}
          activeView={viewMode}
          onViewChange={(key) => setViewMode(key as "kanban" | "table")}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMyTasksOnly(!myTasksOnly); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-[4px] transition-all ${
                  myTasksOnly
                    ? "bg-[#0073EA] text-white shadow-sm"
                    : "bg-white border border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
                }`}
              >
                <User size={14} />
                שלי בלבד
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-[4px] bg-white border border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA] transition-all"
                >
                  <SortAsc size={14} />
                  מיון
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#E6E9EF] z-20 py-1 min-w-[160px]">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            if (sortBy === opt.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                            else { setSortBy(opt.key); setSortDir(opt.key === "dueDate" ? "asc" : "desc"); }
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-right px-3 py-2 text-[13px] hover:bg-[#F5F6F8]/50 transition-colors ${sortBy === opt.key ? "text-[#0073EA] font-semibold" : "text-[#676879]"}`}
                        >
                          {opt.label}
                          {sortBy === opt.key && <span className="text-[10px] mr-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <ExportButton entity="tasks" filters={{}} />
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
              >
                <Plus size={15} strokeWidth={2.5} />
                משימה חדשה
              </button>
            </div>
          }
        >
          {/* Stats */}
          <StatsBar tasks={allTasks} />

          {/* Date filter tabs + search row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date filter tabs */}
            <div className="flex items-center gap-1 bg-white border border-[#E6E9EF] rounded-[4px] p-1">
              {DATE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDateFilter(opt.key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    dateFilter === opt.key
                      ? opt.key === "overdue"
                        ? "bg-danger text-white shadow-sm"
                        : "bg-[#0073EA] text-white shadow-sm"
                      : "text-[#676879] hover:text-[#323338]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none" />
              <input
                type="text"
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
                placeholder="חפש משימה..."
                dir="rtl"
                className="w-full pr-9 pl-8 py-1.5 text-[13px] border border-[#E6E9EF] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] placeholder:text-[#9699A6]"
              />
              {searchRaw && (
                <button onClick={() => setSearchRaw("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9699A6] hover:text-[#E44258] transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>

            <span className="text-border text-xs select-none hidden sm:inline">|</span>
            <PriorityFilterDropdown value={priorityFilter} onChange={setPriorityFilter} />
          </div>

          {/* Context + type filters */}
          <div className="flex flex-wrap items-center gap-2">
            {TASK_CONTEXT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = contextFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setContextFilter(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? "text-white shadow-sm"
                      : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
                  }`}
                  style={isActive ? { backgroundColor: opt.color, borderColor: opt.color } : undefined}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  {Icon && <Icon size={12} />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
            <span className="text-border text-xs select-none">|</span>
            {Object.entries(TASK_TYPE_CONFIG).map(([value, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={value}
                  onClick={() => setTaskTypeFilter(taskTypeFilter === value ? "" : value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    taskTypeFilter === value
                      ? "text-white shadow-sm"
                      : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
                  }`}
                  style={taskTypeFilter === value ? { backgroundColor: cfg.color, borderColor: cfg.color } : undefined}
                >
                  <Icon size={11} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          {viewMode === "kanban" ? (
            <KanbanBoard<Task>
              columns={kanbanColumns}
              renderCard={(task, isDragging) => <TaskKanbanCard task={task} isDragging={isDragging} />}
              onDragEnd={handleKanbanDragEnd}
              onCardClick={(task) => setSelectedTaskId(task.id)}
              loading={boardLoading}
              emptyText="אין משימות"
            />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} className="text-[#9699A6]" />}
              title="אין משימות"
              description="צרו משימה חדשה כדי להתחיל לעקוב אחרי המשימות שלכם."
              action={
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
                >
                  צור משימה ראשונה
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {DATE_GROUP_CONFIG.map((cfg) => {
                const groupTasks = groupedTasks[cfg.key];
                // Always show overdue/today, hide empty others unless they have tasks
                if (groupTasks.length === 0 && cfg.key !== "overdue" && cfg.key !== "today") return null;
                return (
                  <DateGroupSection
                    key={cfg.key}
                    config={cfg}
                    tasks={groupTasks}
                    onComplete={(task) => {
                      const newStatus = task.status === "DONE" ? "TODO" : "DONE";
                      toggleMutation.mutate({ id: task.id, status: newStatus });
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onEdit={(task) => setSelectedTaskId(task.id)}
                    inlineUpdate={inlineUpdate}
                    memberOptions={memberOptions}
                    onTaskClick={(task) => setSelectedTaskId(task.id)}
                    selectedIds={selectedTaskIds}
                    onToggleSelect={toggleTaskSelection}
                    showCheckboxes={selectedTaskIds.size > 0}
                    defaultOpen={cfg.key === "overdue" || cfg.key === "today" || cfg.key === "tomorrow"}
                  />
                );
              })}
            </div>
          )}

          <TaskCreateModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
            }}
          />
        </PageShell>
      </div>

      {selectedTaskId && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30 md:hidden"
            onClick={() => setSelectedTaskId(null)}
            aria-hidden="true"
          />
          <div className="fixed top-0 left-0 h-full w-full md:w-[400px] bg-white/95 backdrop-blur-md shadow-[-4px_0_24px_rgba(0,0,0,0.08)] border-r border-[#E6E9EF] z-40 overflow-y-auto animate-slide-in-left max-h-screen">
            <div className="p-5">
              <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
            </div>
          </div>
        </>
      )}

      <BulkActionBar
        selectedCount={selectedTaskIds.size}
        onClear={clearSelection}
        onDelete={handleBulkDelete}
        deleting={bulkDeleteMutation.isPending}
      >
        <button
          onClick={handleBulkMarkDone}
          disabled={bulkUpdateMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:bg-white/10 rounded-[4px] transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          סמן כמושלם
        </button>
        <div ref={bulkPriorityRef} className="relative">
          <button
            onClick={() => setShowBulkPriorityMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] hover:bg-white/10 rounded-[4px] transition-colors"
          >
            <ChevronDown size={14} />
            שנה עדיפות
          </button>
          {showBulkPriorityMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-[#404046] rounded-[4px] shadow-lg border border-white/10 py-1 min-w-[130px] z-50">
              {[
                { key: "URGENT", label: "דחוף", color: "#FB275D" },
                { key: "HIGH", label: "גבוה", color: "#FDAB3D" },
                { key: "MEDIUM", label: "בינוני", color: "#579BFC" },
                { key: "LOW", label: "נמוך", color: "#C3C6D4" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleBulkPriority(opt.key)}
                  className="w-full text-right px-3 py-1.5 text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </BulkActionBar>

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onConfirm={() => {
          setShowBulkDeleteConfirm(false);
          bulkDeleteMutation.mutate(Array.from(selectedTaskIds));
        }}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        title="מחיקת משימות"
        message={`האם אתה בטוח שברצונך למחוק ${selectedTaskIds.size} משימות?`}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </div>
  );
}
