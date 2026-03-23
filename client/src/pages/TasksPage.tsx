import { useState, useMemo, useEffect, useRef } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import StatusDropdown from "../components/shared/StatusDropdown";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ViewToggle from "../components/shared/ViewToggle";
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

const STATUS_ICONS: Record<string, typeof Circle> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
  CANCELLED: Ban,
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

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#FB275D",
  HIGH: "#FDAB3D",
  MEDIUM: "#579BFC",
  LOW: "#C3C6D4",
};

// --- Due date helpers ---

interface DueDateInfo {
  label: string;
  colorClass: string;
  icon: "calendar" | "clock" | "warning";
  bgClass: string;
}

function getDueDateInfo(dueDate: string | null, status: string): DueDateInfo {
  if (!dueDate) {
    return { label: "אין תאריך יעד", colorClass: "text-text-tertiary", icon: "calendar", bgClass: "" };
  }
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0 && status !== "DONE" && status !== "CANCELLED") {
    return { label: "באיחור", colorClass: "text-danger font-bold", icon: "warning", bgClass: "bg-danger/5" };
  }
  if (diff === 0) {
    return { label: "היום", colorClass: "text-warning font-bold", icon: "clock", bgClass: "bg-warning/5" };
  }
  if (diff === 1) {
    return { label: "מחר", colorClass: "text-blue-500 font-bold", icon: "calendar", bgClass: "bg-blue-50" };
  }
  if (diff <= 3) {
    return { label: due.toLocaleDateString("he-IL", { day: "numeric", month: "short" }), colorClass: "text-orange-500", icon: "calendar", bgClass: "" };
  }
  return { label: due.toLocaleDateString("he-IL", { day: "numeric", month: "short" }), colorClass: "text-text-tertiary", icon: "calendar", bgClass: "" };
}

function DueDateBadge({
  dueDate,
  status,
  compact = false,
}: {
  dueDate: string | null;
  status: string;
  compact?: boolean;
}) {
  const info = getDueDateInfo(dueDate, status);
  const iconSize = compact ? 10 : 12;
  const IconEl =
    info.icon === "warning" ? (
      <AlertTriangle size={iconSize} />
    ) : info.icon === "clock" ? (
      <Clock size={iconSize} />
    ) : (
      <Calendar size={iconSize} />
    );
  if (!dueDate) {
    if (compact) return null;
    return (
      <span className={`flex items-center gap-1 text-[11px] ${info.colorClass}`}>
        <Calendar size={iconSize} />
        <span>{info.label}</span>
      </span>
    );
  }
  return (
    <span
      className={`flex items-center gap-1 text-[11px] rounded px-1 py-0.5 ${info.colorClass} ${info.bgClass}`}
    >
      {IconEl}
      <span>{info.label}</span>
    </span>
  );
}

// --- Stats bar ---

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
    <div className="flex items-center gap-4 px-4 py-2.5 bg-white rounded-xl border border-border shadow-card text-sm flex-wrap">
      <span className="text-text-secondary">
        <span className="font-semibold text-text-primary">{tasks.length}</span>{" "}משימות
      </span>
      <span className="text-border select-none hidden sm:inline">|</span>
      <span className="text-text-secondary">
        באיחור:{" "}
        <span className={`font-semibold ${overdue > 0 ? "text-danger" : "text-text-tertiary"}`}>{overdue}</span>
      </span>
      <span className="text-border select-none hidden sm:inline">|</span>
      <span className="text-text-secondary">
        היום:{" "}
        <span className={`font-semibold ${dueToday > 0 ? "text-warning" : "text-text-tertiary"}`}>{dueToday}</span>
      </span>
      <span className="text-border select-none hidden sm:inline">|</span>
      <span className="text-text-secondary">
        הושלמו:{" "}
        <span className={`font-semibold ${completed > 0 ? "text-success" : "text-text-tertiary"}`}>{completed}</span>
      </span>
    </div>
  );
}

// --- Debounce hook ---

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// --- Priority filter dropdown ---

const PRIORITY_OPTIONS = [
  { key: "", label: "כל העדיפויות" },
  { key: "URGENT", label: "דחוף" },
  { key: "HIGH", label: "גבוה" },
  { key: "MEDIUM", label: "בינוני" },
  { key: "LOW", label: "נמוך" },
];

function PriorityFilterDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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
          value ? "bg-primary text-white border-primary shadow-sm" : "bg-white border-border text-text-secondary hover:border-primary hover:text-primary"
        }`}
      >
        {value && (
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: PRIORITY_COLORS[value] || "#C3C6D4" }}
          />
        )}
        {active?.label ?? "כל העדיפויות"}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-modal z-20 py-1 min-w-[130px]">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full text-right px-3 py-1.5 text-xs hover:bg-primary/5 flex items-center gap-2 transition-colors ${
                value === opt.key ? "text-primary font-semibold" : "text-text-primary"
              }`}
            >
              {opt.key && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_COLORS[opt.key] || "#C3C6D4" }}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main page ---

export default function TasksPage() {
  const { taskStatuses, priorities } = useWorkspaceOptions();
  const { currentWorkspaceId, workspaces } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState("");
  const [contextFilter, setContextFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCreate, setShowCreate] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [searchRaw, setSearchRaw] = useState("");
  const searchQuery = useDebounce(searchRaw, 300);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkPriorityMenu, setShowBulkPriorityMenu] = useState(false);
  const bulkPriorityRef = useRef<HTMLDivElement>(null);

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
    queryKey: ["tasks", { statusFilter, taskTypeFilter, contextFilter, page, sortBy, sortDir, myTasksOnly }],
    queryFn: () =>
      listTasks({
        status: statusFilter || undefined,
        taskType: taskTypeFilter || undefined,
        taskContext: contextFilter || undefined,
        page,
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
    return list;
  }, [data, priorityFilter, searchQuery]);

  const kanbanColumns: KanbanCol<Task>[] = useMemo(
    () => Object.entries(taskStatuses).map(([key, info]) => {
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

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkMarkDone = () => {
    bulkUpdateMutation.mutate({ ids: Array.from(selectedTaskIds), data: { status: "DONE" } });
  };

  const handleBulkPriority = (priority: string) => {
    bulkUpdateMutation.mutate({ ids: Array.from(selectedTaskIds), data: { priority } });
    setShowBulkPriorityMenu(false);
  };

  // Close bulk priority menu on outside click
  useEffect(() => {
    if (!showBulkPriorityMenu) return;
    function handler(e: MouseEvent) {
      if (bulkPriorityRef.current && !bulkPriorityRef.current.contains(e.target as Node)) setShowBulkPriorityMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBulkPriorityMenu]);

  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");
  const allTasks = data?.data || [];

  const sortOptions = [
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "dueDate", label: "תאריך יעד" },
    { key: "priority", label: "עדיפות" },
    { key: "title", label: "כותרת" },
  ];

  void priorities;

  return (
    <div className="flex h-full">
      <div className={`flex-1 min-w-0 ${selectedTaskId ? "ml-[400px]" : ""}`}>
        <PageShell
          title="משימות"
          subtitle={`${data?.pagination.total || 0} משימות`}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMyTasksOnly(!myTasksOnly); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                  myTasksOnly ? "bg-primary text-white shadow-sm" : "bg-white border border-border text-text-secondary hover:border-primary hover:text-primary"
                }`}
              >
                <User size={14} />
                המשימות שלי
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-border text-text-secondary hover:border-primary hover:text-primary transition-all"
                >
                  <SortAsc size={14} />
                  מיון
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border-light z-20 py-1 min-w-[160px]">
                      {sortOptions.map((opt) => (
                        <button key={opt.key}
                          onClick={() => {
                            if (sortBy === opt.key) { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
                            else { setSortBy(opt.key); setSortDir(opt.key === "dueDate" ? "asc" : "desc"); }
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-surface-secondary/50 transition-colors ${sortBy === opt.key ? "text-primary font-semibold" : "text-text-secondary"}`}
                        >
                          {opt.label}
                          {sortBy === opt.key && <span className="text-[10px] mr-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              <ExportButton entity="tasks" filters={{ status: statusFilter }} />
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
              >
                <Plus size={16} />
                משימה חדשה
              </button>
            </div>
          }
        >
          <StatsBar tasks={allTasks} />
          {/* Context filter tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {TASK_CONTEXT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = contextFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => { setContextFilter(opt.key); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? "text-white shadow-sm"
                      : "bg-white border-border text-text-secondary hover:border-primary hover:text-primary"
                  }`}
                  style={isActive ? { backgroundColor: opt.color, borderColor: opt.color } : undefined}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  {Icon && <Icon size={12} />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="הכל" active={!statusFilter} onClick={() => { setStatusFilter(""); setPage(1); }} />
            {Object.entries(taskStatuses).map(([key, val]) => (
              <FilterChip key={key} label={val.label} color={val.color} active={statusFilter === key} onClick={() => { setStatusFilter(key); setPage(1); }} />
            ))}
            <span className="text-border text-xs select-none">|</span>
            <PriorityFilterDropdown value={priorityFilter} onChange={setPriorityFilter} />
            <span className="text-border text-xs select-none">|</span>
            {[
              { value: "", label: "כל הסוגים", icon: "" },
              { value: "CALL", label: "שיחה", icon: "📞" },
              { value: "EMAIL", label: "אימייל", icon: "📧" },
              { value: "MEETING", label: "פגישה", icon: "🤝" },
              { value: "WHATSAPP", label: "וואטסאפ", icon: "💬" },
              { value: "FOLLOW_UP", label: "מעקב", icon: "🔄" },
              { value: "TASK", label: "משימה", icon: "📋" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTaskTypeFilter(opt.value); setPage(1); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  taskTypeFilter === opt.value
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white border-border text-text-secondary hover:border-primary hover:text-primary"
                }`}
              >
                {opt.icon && <span>{opt.icon}</span>}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchRaw}
              onChange={(e) => setSearchRaw(e.target.value)}
              placeholder="חפש משימה..."
              dir="rtl"
              className="w-full sm:w-72 pr-9 pl-9 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-text-tertiary"
            />
            {searchRaw && (
              <button onClick={() => setSearchRaw("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-danger transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          {viewMode === "kanban" ? (
            <KanbanBoard<Task>
              columns={kanbanColumns}
              renderCard={(task, isDragging) => <TaskKanbanCard task={task} isDragging={isDragging} />}
              onDragEnd={handleKanbanDragEnd}
              onCardClick={(task) => setSelectedTaskId(task.id)}
              loading={boardLoading}
              emptyText="אין משימות"
            />
          ) : (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={28} className="text-text-tertiary" />}
                  title="אין משימות"
                  description="צרו משימה חדשה כדי להתחיל לעקוב אחרי המשימות שלכם."
                  action={
                    <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors">
                      צור משימה ראשונה
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {!statusFilter ? (
                    <>
                      {todoTasks.length > 0 && (
                        <TaskGroup title="לביצוע" color={taskStatuses.TODO?.color || "#579BFC"} tasks={todoTasks}
                          onToggle={(task) => toggleMutation.mutate({ id: task.id, status: "IN_PROGRESS" })}
                          onComplete={(task) => toggleMutation.mutate({ id: task.id, status: "DONE" })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onStatusChange={(id, status) => toggleMutation.mutate({ id, status })}
                          onPriorityChange={(id, priority) => updateTask(id, { priority }).then(() => queryClient.invalidateQueries({ queryKey: ["tasks"] }))}
                          inlineUpdate={inlineUpdate} memberOptions={memberOptions}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                          selectedIds={selectedTaskIds} onToggleSelect={toggleTaskSelection} />
                      )}
                      {inProgressTasks.length > 0 && (
                        <TaskGroup title="בתהליך" color={taskStatuses.IN_PROGRESS?.color || "#579BFC"} tasks={inProgressTasks}
                          onToggle={(task) => toggleMutation.mutate({ id: task.id, status: "TODO" })}
                          onComplete={(task) => toggleMutation.mutate({ id: task.id, status: "DONE" })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onStatusChange={(id, status) => toggleMutation.mutate({ id, status })}
                          onPriorityChange={(id, priority) => updateTask(id, { priority }).then(() => queryClient.invalidateQueries({ queryKey: ["tasks"] }))}
                          inlineUpdate={inlineUpdate} memberOptions={memberOptions}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                          selectedIds={selectedTaskIds} onToggleSelect={toggleTaskSelection} />
                      )}
                      {doneTasks.length > 0 && (
                        <TaskGroup title="הושלם" color={taskStatuses.DONE?.color || "#00CA72"} tasks={doneTasks}
                          onToggle={(task) => toggleMutation.mutate({ id: task.id, status: "TODO" })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onStatusChange={(id, status) => toggleMutation.mutate({ id, status })}
                          onPriorityChange={(id, priority) => updateTask(id, { priority }).then(() => queryClient.invalidateQueries({ queryKey: ["tasks"] }))}
                          inlineUpdate={inlineUpdate} memberOptions={memberOptions}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                          selectedIds={selectedTaskIds} onToggleSelect={toggleTaskSelection} />
                      )}
                    </>
                  ) : (
                    <TaskGroup
                      title={taskStatuses[statusFilter]?.label || "משימות"}
                      color={taskStatuses[statusFilter]?.color || "#579BFC"}
                      tasks={tasks}
                      onToggle={(task) => { const ns = task.status === "DONE" ? "TODO" : "IN_PROGRESS"; toggleMutation.mutate({ id: task.id, status: ns }); }}
                      onComplete={(task) => toggleMutation.mutate({ id: task.id, status: "DONE" })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onStatusChange={(id, status) => toggleMutation.mutate({ id, status })}
                      onPriorityChange={(id, priority) => updateTask(id, { priority }).then(() => queryClient.invalidateQueries({ queryKey: ["tasks"] }))}
                      inlineUpdate={inlineUpdate} memberOptions={memberOptions}
                      onTaskClick={(task) => setSelectedTaskId(task.id)}
                      selectedIds={selectedTaskIds} onToggleSelect={toggleTaskSelection} />
                  )}
                </div>
              )}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm bg-white border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed">
                    הקודם
                  </button>
                  <span className="text-sm text-text-secondary">עמוד {page} מתוך {data.pagination.totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages} className="px-3 py-1.5 text-sm bg-white border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed">
                    הבא
                  </button>
                </div>
              )}
            </>
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
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-30 md:hidden"
            onClick={() => setSelectedTaskId(null)}
            aria-hidden="true"
          />
          <div className="fixed top-0 left-0 h-full w-full md:w-[400px] bg-white/95 backdrop-blur-md shadow-[-4px_0_24px_rgba(0,0,0,0.08)] border-r border-border-light z-40 overflow-y-auto animate-slide-in-left max-h-screen">
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          סמן כמושלם
        </button>
        <div ref={bulkPriorityRef} className="relative">
          <button
            onClick={() => setShowBulkPriorityMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronDown size={14} />
            שנה עדיפות
          </button>
          {showBulkPriorityMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-[#404046] rounded-lg shadow-lg border border-white/10 py-1 min-w-[130px] z-50">
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
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
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

// --- Kanban card ---

function TaskKanbanCard({ task, isDragging }: { task: Task; isDragging?: boolean; }) {
  const { priorities } = useWorkspaceOptions();
  const isDone = task.status === "DONE";
  const priorityInfo = priorities[task.priority];
  const borderColor = PRIORITY_COLORS[task.priority] || "#C3C6D4";
  const isTaskOverdue = task.dueDate && !isDone && task.status !== "CANCELLED" && (() => {
    const due = new Date(task.dueDate!); due.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return due < today;
  })();
  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${isTaskOverdue ? "border-r-[3px] border-r-danger" : ""} ${isDragging ? "shadow-lg opacity-90 -translate-y-0.5" : isDone ? "opacity-70 hover:shadow-md" : "hover:shadow-card-hover hover:-translate-y-0.5"}`}
      style={{ borderLeftColor: isDragging ? "#6161FF" : isTaskOverdue ? "#FF4D4F" : borderColor }}
    >
      <span className={`font-semibold text-sm block mb-1.5 ${isDone ? "line-through text-text-tertiary" : "text-text-primary"}`}>{task.title}</span>
      {task.description && <p className="text-xs text-text-tertiary truncate mb-2">{task.description}</p>}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}>
          {priorityInfo?.label || task.priority}
        </span>
        {task.taskType && task.taskType !== "TASK" && (() => {
          const TASK_ICONS: Record<string, string> = { CALL: "📞", EMAIL: "📧", MEETING: "🤝", WHATSAPP: "💬", FOLLOW_UP: "🔄" };
          const TASK_LABELS: Record<string, string> = { CALL: "שיחה", EMAIL: "אימייל", MEETING: "פגישה", WHATSAPP: "וואטסאפ", FOLLOW_UP: "מעקב" };
          return (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-secondary text-text-secondary">
              {TASK_ICONS[task.taskType]} {TASK_LABELS[task.taskType]}
            </span>
          );
        })()}
        {task.taskContext && task.taskContext !== "GENERAL" && (() => {
          const ctx = TASK_CONTEXT_BADGE[task.taskContext];
          return ctx ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: ctx.color }}
            >
              {ctx.label}
            </span>
          ) : null;
        })()}
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-light">
        <div className="flex items-center gap-1">
          {task.contact && <span className="text-[11px] text-text-secondary truncate max-w-[80px]">{task.contact.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {task.isRecurring && (
            <span
              className="text-primary/70"
              title={`משימה חוזרת - ${
                task.recurrenceType === "DAILY" ? "יומי" :
                task.recurrenceType === "WEEKLY" ? "שבועי" :
                task.recurrenceType === "BIWEEKLY" ? "דו-שבועי" :
                task.recurrenceType === "MONTHLY" ? "חודשי" : ""
              }`}
            >
              <Repeat size={11} />
            </span>
          )}
          <DueDateBadge dueDate={task.dueDate} status={task.status} compact />
          {task.dueDate && <span title="מסונכרן עם Google Calendar" className="cursor-default text-[11px] leading-none">📅</span>}
          {task.assignee ? (
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary" title={task.assignee.name}>
              <span className="text-white text-[9px] font-bold">{task.assignee.name[0]}</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-border" title="לא הוקצה">
              <User size={10} className="text-text-tertiary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Task group ---

function TaskGroup({ title, color, tasks, onToggle, onComplete, onDelete, onStatusChange, onPriorityChange, inlineUpdate, memberOptions, onTaskClick, selectedIds, onToggleSelect }: {
  title: string; color: string; tasks: Task[]; onToggle: (task: Task) => void; onComplete?: (task: Task) => void;
  onDelete: (id: string) => void; onStatusChange: (id: string, status: string) => void; onPriorityChange: (id: string, priority: string) => void;
  inlineUpdate: (id: string, data: any) => void; memberOptions: { id: string; name: string }[]; onTaskClick?: (task: Task) => void;
  selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
}) {
  const hasAnySelected = selectedIds && selectedIds.size > 0;
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: color }}>
        <span className="font-bold text-sm text-white">{title}</span>
        <span className="text-[11px] font-semibold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task}
            onToggle={() => onToggle(task)}
            onComplete={onComplete ? () => onComplete(task) : undefined}
            onDelete={() => onDelete(task.id)}
            onStatusChange={(status) => onStatusChange(task.id, status)}
            onPriorityChange={(priority) => onPriorityChange(task.id, priority)}
            inlineUpdate={inlineUpdate} memberOptions={memberOptions}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
            selected={selectedIds?.has(task.id) ?? false}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(task.id) : undefined}
            showCheckbox={!!hasAnySelected}
          />
        ))}
      </div>
      <InlineTaskCreate />
    </div>
  );
}

function InlineTaskCreate() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const mutation = useMutation({
    mutationFn: () => createTask({ title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      setTitle(""); setIsAdding(false);
      toast.success("משימה נוצרה");
    },
    onError: () => { toast.error("שגיאה ביצירת משימה"); },
  });
  if (!isAdding) {
    return (
      <button onClick={() => setIsAdding(true)} className="w-full px-4 py-2.5 text-sm text-text-tertiary hover:text-primary hover:bg-[#F5F6FF] transition-colors flex items-center gap-2 border-t border-border-light">
        <Plus size={14} />
        הוסף משימה
      </button>
    );
  }
  return (
    <div className="px-4 py-2.5 flex items-center gap-2 border-t border-border-light bg-[#F5F6FF]">
      <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) mutation.mutate(); if (e.key === "Escape") { setIsAdding(false); setTitle(""); } }}
        placeholder="כותרת משימה חדשה..."
        className="flex-1 px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button onClick={() => { if (title.trim()) mutation.mutate(); }} disabled={!title.trim() || mutation.isPending}
        className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors">
        {mutation.isPending ? "..." : "הוסף"}
      </button>
      <button onClick={() => { setIsAdding(false); setTitle(""); }} className="p-1 rounded text-text-tertiary hover:text-text-primary">
        <X size={14} />
      </button>
    </div>
  );
}

// --- Task row ---

function TaskRow({ task, onToggle, onComplete, onDelete, onStatusChange: _onStatusChange, onPriorityChange, inlineUpdate, memberOptions, onClick, selected, onToggleSelect, showCheckbox }: {
  task: Task; onToggle: () => void; onComplete?: () => void; onDelete: () => void;
  onStatusChange: (status: string) => void; onPriorityChange: (priority: string) => void;
  inlineUpdate: (id: string, data: any) => void; memberOptions: { id: string; name: string }[]; onClick?: () => void;
  selected?: boolean; onToggleSelect?: () => void; showCheckbox?: boolean;
}) {
  const { priorities } = useWorkspaceOptions();
  const isDone = task.status === "DONE";
  const isOverdue = task.dueDate && !isDone && task.status !== "CANCELLED" && new Date(task.dueDate) < new Date();
  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border-light last:border-0 hover:bg-[#F5F6FF] transition-colors group ${isOverdue ? "bg-danger/5" : ""} ${selected ? "bg-primary/5" : ""}`}>
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`w-4 h-4 rounded border-border text-primary focus:ring-primary/30 flex-shrink-0 cursor-pointer ${showCheckbox || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
        />
      )}
      <button onClick={(e) => { e.stopPropagation(); (onComplete || onToggle)(); }} className="flex-shrink-0 transition-colors" title={isDone ? "סמן כלא הושלם" : "סמן כהושלם"}>
        <StatusIcon size={20} className={isDone ? "text-success" : task.status === "IN_PROGRESS" ? "text-warning" : "text-text-tertiary hover:text-success"} />
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <MondayTextCell value={task.title} onChange={(val) => inlineUpdate(task.id, { title: val })} placeholder="כותרת משימה" />
        {task.description && <p className="text-xs text-text-tertiary mt-0.5 truncate">{task.description}</p>}
      </div>
      <StatusDropdown value={task.priority} options={priorities} onChange={onPriorityChange} />
      {task.taskContext && task.taskContext !== "GENERAL" && (() => {
        const ctx = TASK_CONTEXT_BADGE[task.taskContext];
        return ctx ? (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
            style={{ backgroundColor: ctx.color }}
          >
            {ctx.label}
          </span>
        ) : null;
      })()}
      <div className="flex items-center gap-3 flex-shrink-0">
        {task.contact && <span className="text-xs text-text-secondary hidden sm:inline">{task.contact.name}</span>}
        {task.isRecurring && (
          <span
            className="flex items-center gap-0.5 text-[11px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded"
            title={`משימה חוזרת - ${
              task.recurrenceType === "DAILY" ? "יומי" :
              task.recurrenceType === "WEEKLY" ? "שבועי" :
              task.recurrenceType === "BIWEEKLY" ? "דו-שבועי" :
              task.recurrenceType === "MONTHLY" ? "חודשי" : ""
            }`}
          >
            <Repeat size={11} />
          </span>
        )}
        <DueDateBadge dueDate={task.dueDate} status={task.status} />
        <MondayPersonCell
          value={task.assignee ? { id: task.assignee.id, name: task.assignee.name } : null}
          onChange={(id) => inlineUpdate(task.id, { assigneeId: id! })}
          options={memberOptions}
          placeholder="נציג"
        />
        {!isDone && <SnoozeDropdown taskId={task.id} />}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity" title="מחק משימה">
          <X size={14} className="text-danger" />
        </button>
      </div>
    </div>
  );
}

// --- Filter chip ---

function FilterChip({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${active ? "text-white shadow-sm" : "bg-white border border-border text-text-secondary hover:border-primary hover:text-primary"}`}
      style={active ? { backgroundColor: color || "#6161FF" } : undefined}
    >
      {label}
    </button>
  );
}

// Old CreateTaskModal removed — now using TaskCreateModal component