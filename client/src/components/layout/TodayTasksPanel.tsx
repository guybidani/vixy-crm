import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CheckCircle2,
  Circle,
  Calendar,
  User,
  Phone,
  Mail,
  MessageCircle,
  CheckSquare,
  Plus,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { listTasks, createTask, updateTask, type Task } from "../../api/tasks";

interface TodayTasksPanelProps {
  onClose: () => void;
}

const TASK_TYPE_ICONS: Record<string, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  MEETING: Calendar,
  FOLLOW_UP: User,
  TASK: CheckSquare,
};

const TASK_TYPE_LABELS: Record<string, string> = {
  CALL: "שיחה",
  EMAIL: "אימייל",
  WHATSAPP: "וואטסאפ",
  MEETING: "פגישה",
  FOLLOW_UP: "מעקב",
  TASK: "משימה",
};

const TASK_TYPE_COLORS: Record<string, string> = {
  CALL: "#0073EA",
  EMAIL: "#FDAB3D",
  WHATSAPP: "#00C875",
  MEETING: "#A25DDC",
  FOLLOW_UP: "#FF7575",
  TASK: "#676879",
};

function formatHebrewDate(d: Date): string {
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

function isOverdue(task: Task): boolean {
  if (task.status === "DONE" || task.status === "CANCELLED") return false;
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function isToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

// ── Quick Add Form ──────────────────────────────────────────────────────────

interface QuickAddFormProps {
  onClose: () => void;
  onCreated: () => void;
}

function QuickAddForm({ onClose, onCreated }: QuickAddFormProps) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<string>("TASK");
  const [dueTime, setDueTime] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const qc = useQueryClient();
  const createMut = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      return createTask({
        title: title.trim(),
        taskType,
        dueDate: today,
        dueTime: dueTime || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("משימה נוצרה!");
      onCreated();
    },
    onError: () => {
      toast.error("שגיאה ביצירת המשימה");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMut.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#0073EA]/30 rounded-xl bg-[#F0F6FF] p-3 space-y-2.5"
    >
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0073EA] flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת המשימה..."
          className="flex-1 bg-transparent text-[13px] text-[#323338] placeholder:text-[#9699A6] outline-none font-medium"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Task type selector */}
        <div className="flex gap-1">
          {(["TASK", "CALL", "EMAIL", "MEETING", "WHATSAPP"] as const).map((t) => {
            const Icon = TASK_TYPE_ICONS[t] || CheckSquare;
            const active = taskType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTaskType(t)}
                title={TASK_TYPE_LABELS[t]}
                className={`p-1.5 rounded-md transition-all ${
                  active
                    ? "bg-[#0073EA] text-white"
                    : "bg-white text-[#9699A6] hover:text-[#0073EA] hover:bg-white border border-[#E6E9EF]"
                }`}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>

        {/* Time */}
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          className="text-[12px] text-[#676879] bg-white border border-[#E6E9EF] rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[#0073EA]/30"
        />

        <div className="flex-1" />

        <button
          type="button"
          onClick={onClose}
          className="text-[#9699A6] hover:text-[#676879] p-1 transition-colors"
          aria-label="ביטול"
        >
          <X size={14} />
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createMut.isPending}
          className="px-3 py-1 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[12px] font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMut.isPending ? "..." : "הוסף"}
        </button>
      </div>
    </form>
  );
}

// ── Task Row ────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  isCompleting: boolean;
  onComplete: () => void;
  onNavigate: () => void;
  overdue?: boolean;
}

function TaskRow({ task, isCompleting, onComplete, onNavigate, overdue }: TaskRowProps) {
  const TypeIcon = TASK_TYPE_ICONS[task.taskType] || CheckSquare;
  const isDone = task.status === "DONE";
  const typeColor = TASK_TYPE_COLORS[task.taskType] || "#676879";

  return (
    <div
      className={`group flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
        isDone
          ? "bg-[#F8F9FB] border-transparent opacity-60"
          : overdue
          ? "bg-[#FFF5F5] border-[#FDECEF] hover:border-[#D83A52]/30 hover:shadow-sm"
          : "bg-white border-[#E6E9EF] hover:border-[#0073EA]/25 hover:shadow-sm"
      }`}
      onClick={onNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate(); }}
      aria-label={`פתח משימה: ${task.title}`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        disabled={isCompleting || isDone}
        className={`mt-0.5 flex-shrink-0 transition-colors ${
          isDone ? "text-[#00C875]" : "text-[#9699A6] hover:text-[#00C875]"
        }`}
        aria-label="סמן כהושלם"
      >
        {isCompleting || isDone ? (
          <CheckCircle2 size={18} className="text-[#00C875]" />
        ) : (
          <Circle size={18} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p
          className={`text-[13px] font-medium leading-snug ${
            isDone ? "line-through text-[#9699A6]" : "text-[#323338] group-hover:text-[#0073EA]"
          } transition-colors`}
        >
          {task.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Type chip */}
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: typeColor + "18", color: typeColor }}
          >
            <TypeIcon size={10} />
            {TASK_TYPE_LABELS[task.taskType] || task.taskType}
          </span>

          {/* Contact */}
          {task.contact && (
            <span className="flex items-center gap-1 text-[11px] text-[#676879]">
              <User size={10} />
              {task.contact.name}
            </span>
          )}

          {/* Priority */}
          {(task.priority === "HIGH" || task.priority === "URGENT") && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                task.priority === "URGENT"
                  ? "bg-[#FDECEF] text-[#D83A52]"
                  : "bg-[#FFF3CD] text-[#FDAB3D]"
              }`}
            >
              {task.priority === "URGENT" ? "דחוף" : "גבוה"}
            </span>
          )}
        </div>
      </div>

      {/* Right: time + overdue badge */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {task.dueTime && (
          <span className="text-[11px] text-[#9699A6] font-medium">
            {formatTime(task.dueTime)}
          </span>
        )}
        {overdue && !isDone && (
          <span className="flex items-center gap-0.5 text-[10px] text-[#D83A52] font-semibold">
            <AlertCircle size={9} />
            איחור
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────

function SectionLabel({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="h-px flex-1" style={{ backgroundColor: color + "30" }} />
      <span
        className="text-[10px] font-bold uppercase tracking-widest px-2"
        style={{ color }}
      >
        {label} ({count})
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: color + "30" }} />
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export default function TodayTasksPanel({ onClose }: TodayTasksPanelProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  function handleNavigateToTask(taskId: string) {
    onClose();
    navigate(`/tasks?selected=${taskId}`);
  }

  const today = new Date();
  const todayLabel = formatHebrewDate(today);
  const todayStr = today.toISOString().slice(0, 10);

  // Fetch all non-done tasks (we'll classify overdue vs today)
  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ["tasks", "panel-pending"],
    queryFn: () =>
      listTasks({ limit: 200, myOnly: true, sortBy: "dueDate", sortDir: "asc" }),
    select: (d) =>
      (d?.data || []).filter(
        (t) =>
          t.status !== "DONE" &&
          t.status !== "CANCELLED" &&
          t.dueDate &&
          t.dueDate <= todayStr,
      ),
  });

  // Fetch completed tasks today
  const { data: doneData, isLoading: loadingDone } = useQuery({
    queryKey: ["tasks", "panel-done-today"],
    queryFn: () =>
      listTasks({ limit: 200, myOnly: true, status: "DONE", dueTodayOnly: true }),
    select: (d) => d?.data || [],
  });

  const pendingTasks: Task[] = pendingData || [];
  const doneTasks: Task[] = doneData || [];

  const overdueTasks = pendingTasks.filter(isOverdue);
  const todayTasks = pendingTasks.filter(isToday);

  // Sort today tasks by time
  const todayTasksSorted = [...todayTasks].sort((a, b) => {
    if (!a.dueTime && !b.dueTime) return 0;
    if (!a.dueTime) return 1;
    if (!b.dueTime) return -1;
    return a.dueTime.localeCompare(b.dueTime);
  });

  const totalUrgent = overdueTasks.length + todayTasks.length;
  const isLoading = loadingPending || loadingDone;

  const completeMut = useMutation({
    mutationFn: (id: string) => updateTask(id, { status: "DONE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("משימה הושלמה!");
      setCompletingId(null);
    },
    onError: () => {
      toast.error("שגיאה בעדכון המשימה");
      setCompletingId(null);
    },
  });

  function handleComplete(id: string) {
    setCompletingId(id);
    completeMut.mutate(id);
  }

  const isEmpty = pendingTasks.length === 0 && doneTasks.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        dir="rtl"
        className="fixed top-0 right-0 h-full w-[440px] max-w-full bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-250"
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E6E9EF] flex-shrink-0 bg-gradient-to-b from-white to-[#FAFBFC]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-[4px] bg-[#0073EA]/10 flex items-center justify-center">
                  <Clock size={15} className="text-[#0073EA]" />
                </div>
                <h2 className="text-[15px] font-bold text-[#323338]">
                  העבודה שלי היום
                </h2>
              </div>
              <p className="text-[12px] text-[#676879] mr-9">{todayLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9699A6] hover:text-[#323338] hover:bg-[#F5F6F8] rounded-[4px] transition-colors mt-0.5"
              aria-label="סגור"
            >
              <X size={17} />
            </button>
          </div>

          {/* ── Summary chips ── */}
          {!isLoading && (
            <div className="flex items-center gap-2 mt-4">
              {/* Pending */}
              <div className="flex-1 flex flex-col items-center py-2 px-3 bg-[#F0F6FF] rounded-xl border border-[#0073EA]/15">
                <span className="text-[20px] font-bold text-[#0073EA] leading-none">
                  {pendingTasks.length}
                </span>
                <span className="text-[10px] text-[#0073EA] font-medium mt-0.5">
                  ממתינות
                </span>
              </div>

              {/* Done */}
              <div className="flex-1 flex flex-col items-center py-2 px-3 bg-[#F0FFF7] rounded-xl border border-[#00C875]/15">
                <span className="text-[20px] font-bold text-[#00C875] leading-none">
                  {doneTasks.length}
                </span>
                <span className="text-[10px] text-[#00C875] font-medium mt-0.5">
                  הושלמו
                </span>
              </div>

              {/* Overdue */}
              <div
                className={`flex-1 flex flex-col items-center py-2 px-3 rounded-xl border ${
                  overdueTasks.length > 0
                    ? "bg-[#FFF5F5] border-[#D83A52]/20"
                    : "bg-[#F5F6F8] border-transparent"
                }`}
              >
                <span
                  className={`text-[20px] font-bold leading-none ${
                    overdueTasks.length > 0 ? "text-[#D83A52]" : "text-[#9699A6]"
                  }`}
                >
                  {overdueTasks.length}
                </span>
                <span
                  className={`text-[10px] font-medium mt-0.5 ${
                    overdueTasks.length > 0 ? "text-[#D83A52]" : "text-[#9699A6]"
                  }`}
                >
                  באיחור
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-[#0073EA] border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-[#9699A6]">טוען משימות...</p>
            </div>
          ) : isEmpty ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-[15px] font-bold text-[#323338] mb-2">
                אין משימות להיום
              </p>
              <p className="text-[13px] text-[#9699A6] leading-relaxed">
                כל המשימות הושלמו.
                <br />
                אפשר להוסיף משימה חדשה למטה.
              </p>
            </div>
          ) : (
            <>
              {/* ── Overdue Section ── */}
              {overdueTasks.length > 0 && (
                <div>
                  <SectionLabel
                    label="באיחור"
                    count={overdueTasks.length}
                    color="#D83A52"
                  />
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isCompleting={completingId === task.id}
                        onComplete={() => handleComplete(task.id)}
                        onNavigate={() => handleNavigateToTask(task.id)}
                        overdue
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Today Section ── */}
              {todayTasksSorted.length > 0 && (
                <div>
                  <SectionLabel
                    label="היום"
                    count={todayTasksSorted.length}
                    color="#0073EA"
                  />
                  <div className="space-y-2">
                    {todayTasksSorted.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isCompleting={completingId === task.id}
                        onComplete={() => handleComplete(task.id)}
                        onNavigate={() => handleNavigateToTask(task.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Completed Section (collapsible) ── */}
              {doneTasks.length > 0 && (
                <CompletedSection tasks={doneTasks} onNavigate={handleNavigateToTask} />
              )}
            </>
          )}
        </div>

        {/* ── Footer / Quick Add ── */}
        <div className="px-4 pb-4 pt-2 border-t border-[#E6E9EF] flex-shrink-0 bg-white">
          {showQuickAdd ? (
            <QuickAddForm
              onClose={() => setShowQuickAdd(false)}
              onCreated={() => setShowQuickAdd(false)}
            />
          ) : (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 border border-dashed border-[#C4C7D0] rounded-xl text-[13px] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA] hover:bg-[#F0F6FF] transition-all group"
            >
              <Plus
                size={15}
                className="text-[#9699A6] group-hover:text-[#0073EA] transition-colors"
              />
              <span className="font-medium">+ משימה חדשה</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Completed Section (collapsible) ────────────────────────────────────────

function CompletedSection({ tasks, onNavigate }: { tasks: Task[]; onNavigate: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 w-full group mb-2"
      >
        <div className="h-px flex-1 bg-[#00C875]/20" />
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#00C875] px-2">
          <ChevronRight
            size={12}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          />
          הושלמו ({tasks.length})
        </span>
        <div className="h-px flex-1 bg-[#00C875]/20" />
      </button>

      {open && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isCompleting={false}
              onComplete={() => {}}
              onNavigate={() => onNavigate(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
