import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { listTasks, type Task, type CallResult } from "../../api/tasks";
import { updateTask } from "../../api/tasks";
import TaskOutcomeModal from "../tasks/TaskOutcomeModal";
import SnoozeDropdown from "../shared/SnoozeDropdown";

const TASK_TYPE_ICON: Record<string, React.ReactNode> = {
  CALL: <Phone size={12} />,
  EMAIL: <Mail size={12} />,
  MEETING: <Calendar size={12} />,
  WHATSAPP: <MessageSquare size={12} />,
  FOLLOW_UP: <RotateCcw size={12} />,
  TASK: <Circle size={12} />,
};

const TASK_TYPE_COLOR: Record<string, string> = {
  CALL: "#00CA72",
  EMAIL: "#579BFC",
  MEETING: "#A25DDC",
  WHATSAPP: "#25D366",
  FOLLOW_UP: "#FDAB3D",
  TASK: "#6161FF",
};

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#FF4D4F",
  HIGH: "#FDAB3D",
  MEDIUM: "#6161FF",
  LOW: "#C4C4C4",
};

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === "DONE") return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  // if has dueTime, compare precisely; else compare date only
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(":").map(Number);
    due.setHours(h, m, 0, 0);
    return due < now;
  }
  due.setHours(23, 59, 59, 999);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(task.dueDate); dueDay.setHours(0, 0, 0, 0);
  return dueDay < today;
}

function isDueToday(task: Task) {
  if (!task.dueDate || task.status === "DONE") return false;
  const dueDay = new Date(task.dueDate); dueDay.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dueDay.getTime() === today.getTime() && !isOverdue(task);
}

function isDueTomorrow(task: Task) {
  if (!task.dueDate || task.status === "DONE") return false;
  const dueDay = new Date(task.dueDate); dueDay.setHours(0, 0, 0, 0);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  return dueDay.getTime() === tomorrow.getTime();
}

function formatTime(task: Task) {
  if (task.dueTime) return task.dueTime;
  return null;
}

export default function TodaysTasksWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [outcomeTask, setOutcomeTask] = useState<Task | null>(null);
  const [showTomorrow, setShowTomorrow] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks-today-widget"],
    queryFn: () => listTasks({ myOnly: true, status: "TODO", limit: 50, sortBy: "dueDate", sortDir: "asc" }),
    refetchInterval: 60000,
  });

  const doneMut = useMutation({
    mutationFn: ({ id, callResult, outcomeNote }: { id: string; callResult?: CallResult; outcomeNote?: string }) =>
      updateTask(id, { status: "DONE", callResult: callResult ?? null, outcomeNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-today-widget"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOutcomeTask(null);
    },
    onError: () => toast.error("שגיאה בעדכון המשימה"),
  });

  const tasks = data?.data ?? [];

  // Filter out snoozed tasks
  const now = new Date();
  const activeTasks = tasks.filter(t =>
    !t.snoozedUntil || new Date(t.snoozedUntil) <= now
  );

  const overdue = activeTasks.filter(isOverdue);
  const today = activeTasks.filter(isDueToday);
  const tomorrow = activeTasks.filter(isDueTomorrow);

  const handleMarkDone = (task: Task) => {
    if (task.taskType === "CALL" || task.taskType === "MEETING" || task.taskType === "FOLLOW_UP") {
      setOutcomeTask(task);
    } else {
      doneMut.mutate({ id: task.id });
      toast.success("משימה הושלמה ✓");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5">
        <div className="h-5 w-32 bg-[#F5F6F8] rounded-[4px] animate-pulse mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-11 bg-[#F5F6F8] rounded-[4px] animate-pulse mb-2" />
        ))}
      </div>
    );
  }

  const totalActive = overdue.length + today.length;

  return (
    <>
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow duration-200 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-[#323338] text-[15px]">המשימות שלי</h2>
            <div className="flex items-center gap-1.5">
              {overdue.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E44258]/10 text-[#E44258]">
                  {overdue.length} באיחור
                </span>
              )}
              {today.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                  {today.length} להיום
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/tasks")}
            className="text-[12px] font-medium text-[#0073EA] hover:text-[#0060C2] flex items-center gap-1 transition-colors"
          >
            הצג הכל
            <ArrowLeft size={12} />
          </button>
        </div>

        {totalActive === 0 && tomorrow.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 size={32} className="text-success mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[#323338]">כל הכבוד! עדכנת הכל 🎉</p>
            <p className="text-[12px] text-[#9699A6] mt-1">אין משימות פתוחות להיום</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Overdue section */}
            {overdue.length > 0 && (
              <TaskGroup
                label="באיחור"
                count={overdue.length}
                accent="danger"
                tasks={overdue}
                onDone={handleMarkDone}
                doneMutPending={doneMut.isPending}
              />
            )}

            {/* Today section */}
            {today.length > 0 && (
              <TaskGroup
                label="היום"
                count={today.length}
                accent="warning"
                tasks={today}
                onDone={handleMarkDone}
                doneMutPending={doneMut.isPending}
              />
            )}

            {/* Tomorrow toggle */}
            {tomorrow.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTomorrow(v => !v)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[#676879] hover:text-[#323338] transition-colors py-1"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showTomorrow ? "rotate-180" : ""}`}
                  />
                  מחר ({tomorrow.length})
                </button>
                {showTomorrow && (
                  <TaskGroup
                    label=""
                    count={0}
                    accent="primary"
                    tasks={tomorrow}
                    onDone={handleMarkDone}
                    doneMutPending={doneMut.isPending}
                    hideHeader
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outcome modal */}
      {outcomeTask && (
        <TaskOutcomeModal
          task={outcomeTask}
          onConfirm={(callResult, outcomeNote) => {
            doneMut.mutate({ id: outcomeTask.id, callResult, outcomeNote });
            toast.success("משימה הושלמה ✓");
          }}
          onClose={() => setOutcomeTask(null)}
        />
      )}
    </>
  );
}

interface TaskGroupProps {
  label: string;
  count: number;
  accent: "danger" | "warning" | "primary";
  tasks: Task[];
  onDone: (task: Task) => void;
  doneMutPending: boolean;
  hideHeader?: boolean;
}

function TaskGroup({
  label, count, accent, tasks, onDone, doneMutPending, hideHeader
}: TaskGroupProps) {
  const accentClasses = {
    danger: "text-[#E44258]",
    warning: "text-warning",
    primary: "text-[#0073EA]",
  };

  return (
    <div>
      {!hideHeader && label && (
        <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-1.5 ${accentClasses[accent]}`}>
          <span>{label}</span>
          <span className="opacity-60">({count})</span>
        </div>
      )}
      <div className="space-y-1">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            accent={accent}
            onDone={onDone}
            doneMutPending={doneMutPending}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  accent: "danger" | "warning" | "primary";
  onDone: (task: Task) => void;
  doneMutPending: boolean;
}

function TaskRow({ task, accent, onDone, doneMutPending }: TaskRowProps) {
  const time = formatTime(task);
  const typeColor = TASK_TYPE_COLOR[task.taskType] ?? "#6161FF";
  const priorityColor = PRIORITY_COLOR[task.priority] ?? "#C4C4C4";

  return (
    <div className={`group relative flex items-center gap-2.5 py-2 px-2.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors ${accent === "danger" ? "bg-[#E44258]/5" : ""}`}>
      {/* Left border accent */}
      <div
        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full opacity-60"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Done checkbox */}
      <button
        onClick={() => onDone(task)}
        disabled={doneMutPending}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-[#E6E9EF] hover:border-success hover:bg-success/10 transition-all flex items-center justify-center"
      >
        <Circle size={10} className="text-border group-hover:hidden" />
        <CheckCircle2 size={10} className="text-success hidden group-hover:block" />
      </button>

      {/* Task type icon */}
      <span
        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center"
        style={{ backgroundColor: typeColor + "20", color: typeColor }}
      >
        {TASK_TYPE_ICON[task.taskType]}
      </span>

      {/* Title + contact */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#323338] truncate leading-tight">{task.title}</p>
        {task.contact && (
          <p className="text-[11px] text-[#9699A6] truncate">{task.contact.name}</p>
        )}
      </div>

      {/* Time badge */}
      {time && (
        <span className={`flex-shrink-0 text-[11px] font-semibold ${accent === "danger" ? "text-[#E44258]" : "text-[#676879]"}`}>
          {time}
        </span>
      )}

      {/* Snooze dropdown */}
      <SnoozeDropdown taskId={task.id} />
    </div>
  );
}
