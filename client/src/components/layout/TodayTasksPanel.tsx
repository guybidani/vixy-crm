import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle2, Circle, Calendar, User, Phone, Mail, MessageCircle, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";
import { listTasks, updateTask } from "../../api/tasks";

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

export default function TodayTasksPanel({ onClose }: TodayTasksPanelProps) {
  const qc = useQueryClient();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const today = new Date();
  const todayLabel = today.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", { dueTodayOnly: true }],
    queryFn: () => listTasks({ dueTodayOnly: true, limit: 100, status: "TODO" }),
  });

  const tasks = data?.data || [];

  const completeMut = useMutation({
    mutationFn: (id: string) => updateTask(id, { status: "DONE" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("משימה הושלמה!");
      setCompletingId(null);
    },
    onError: () => {
      setCompletingId(null);
    },
  });

  function handleComplete(id: string) {
    setCompletingId(id);
    completeMut.mutate(id);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#E6E9EF] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#323338]">משימות להיום</h2>
              <p className="text-[12px] text-[#676879] mt-0.5">{todayLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[#676879] text-sm">טוען...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-[#F5F6F8] rounded-2xl flex items-center justify-center mb-3">
                <CheckCircle2 size={28} className="text-[#00C875]" />
              </div>
              <p className="text-[14px] font-semibold text-[#323338] mb-1">
                אין משימות להיום
              </p>
              <p className="text-[12px] text-[#9699A6]">
                כל המשימות הושלמו או אין משימות מתוזמנות להיום
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-[#9699A6] font-medium uppercase tracking-wide mb-3">
                {tasks.length} משימות ממתינות
              </p>
              {tasks.map((task) => {
                const TypeIcon = TASK_TYPE_ICONS[task.taskType] || CheckSquare;
                const isDone = completingId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`bg-[#F8F9FB] rounded-lg p-3 border border-[#E6E9EF] transition-all ${
                      isDone ? "opacity-50" : "hover:border-[#0073EA]/30 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Done toggle */}
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={isDone}
                        className="mt-0.5 flex-shrink-0 text-[#9699A6] hover:text-[#00C875] transition-colors"
                        aria-label="סמן כהושלם"
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} className="text-[#00C875]" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Title + type */}
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon size={13} className="text-[#0073EA] flex-shrink-0" />
                          <span className="text-[11px] text-[#0073EA] font-medium">
                            {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                          </span>
                          {task.priority === "HIGH" || task.priority === "URGENT" ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FDECEF] text-[#D83A52] font-medium">
                              {task.priority === "URGENT" ? "דחוף" : "גבוה"}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[13px] font-medium text-[#323338] truncate">
                          {task.title}
                        </p>
                        {task.contact && (
                          <p className="text-[12px] text-[#676879] mt-0.5 flex items-center gap-1">
                            <User size={11} />
                            {task.contact.name}
                          </p>
                        )}
                        {task.dueTime && (
                          <p className="text-[11px] text-[#9699A6] mt-0.5">
                            {task.dueTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
