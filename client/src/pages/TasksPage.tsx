import { useState } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import StatusDropdown from "../components/shared/StatusDropdown";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayDateCell from "../components/shared/MondayDateCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ViewToggle from "../components/shared/ViewToggle";
import ExportButton from "../components/shared/ExportButton";
import TaskDetailPanel from "../components/tasks/TaskDetailPanel";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getTasksBoard,
  type Task,
} from "../api/tasks";
import { listContacts } from "../api/contacts";
import { listDeals } from "../api/deals";
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

export default function TasksPage() {
  const { taskStatuses } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const inlineUpdate = useInlineUpdate(updateTask, [
    ["tasks"],
    ["tasks-board"],
  ]);
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });
  const memberOptions = (members || []).map((m) => ({
    id: m.memberId,
    name: m.name,
  }));

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", { statusFilter, page, sortBy, sortDir, myTasksOnly }],
    queryFn: () =>
      listTasks({
        status: statusFilter || undefined,
        page,
        sortBy,
        sortDir,
      }),
    enabled: viewMode === "table",
  });

  // Board data
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["tasks-board"],
    queryFn: getTasksBoard,
    enabled: viewMode === "kanban",
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
    },
  });

  // Kanban columns
  const kanbanColumns: KanbanCol<Task>[] = Object.entries(taskStatuses).map(
    ([key, info]) => ({
      key,
      label: info.label,
      color: info.color,
      items: boardData?.statuses[key] || [],
    }),
  );

  function handleKanbanDragEnd(
    itemId: string,
    _fromColumn: string,
    toColumn: string,
  ) {
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

  const tasks = data?.data || [];

  // Group by status
  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  const sortOptions = [
    { key: "createdAt", label: "תאריך יצירה" },
    { key: "dueDate", label: "תאריך יעד" },
    { key: "priority", label: "עדיפות" },
    { key: "title", label: "כותרת" },
  ];

  return (
    <div className="flex h-full">
      <div className={`flex-1 min-w-0 ${selectedTaskId ? "ml-[400px]" : ""}`}>
        <PageShell
          title="משימות"
          subtitle={`${data?.pagination.total || 0} משימות`}
          actions={
            <div className="flex items-center gap-2">
              {/* My Tasks toggle */}
              <button
                onClick={() => {
                  setMyTasksOnly(!myTasksOnly);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                  myTasksOnly
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white border border-border text-text-secondary hover:border-primary hover:text-primary"
                }`}
              >
                <User size={14} />
                המשימות שלי
              </button>

              {/* Sort dropdown */}
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
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border-light z-20 py-1 min-w-[160px]">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            if (sortBy === opt.key) {
                              setSortDir(sortDir === "asc" ? "desc" : "asc");
                            } else {
                              setSortBy(opt.key);
                              setSortDir(
                                opt.key === "dueDate" ? "asc" : "desc",
                              );
                            }
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-surface-secondary/50 transition-colors ${
                            sortBy === opt.key
                              ? "text-primary font-semibold"
                              : "text-text-secondary"
                          }`}
                        >
                          {opt.label}
                          {sortBy === opt.key && (
                            <span className="text-[10px] mr-1">
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              <ExportButton
                entity="tasks"
                filters={{ status: statusFilter }}
              />
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
          {viewMode === "kanban" ? (
            <KanbanBoard<Task>
              columns={kanbanColumns}
              renderCard={(task, isDragging) => (
                <TaskKanbanCard task={task} isDragging={isDragging} />
              )}
              onDragEnd={handleKanbanDragEnd}
              onCardClick={(task) => setSelectedTaskId(task.id)}
              loading={boardLoading}
              emptyText="אין משימות"
            />
          ) : (
            <>
              {/* Status filter chips */}
              <div className="flex gap-2 flex-wrap">
                <FilterChip
                  label="הכל"
                  active={!statusFilter}
                  onClick={() => {
                    setStatusFilter("");
                    setPage(1);
                  }}
                />
                {Object.entries(taskStatuses).map(([key, val]) => (
                  <FilterChip
                    key={key}
                    label={val.label}
                    color={val.color}
                    active={statusFilter === key}
                    onClick={() => {
                      setStatusFilter(key);
                      setPage(1);
                    }}
                  />
                ))}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <EmptyState
                  icon={
                    <CheckCircle2 size={28} className="text-text-tertiary" />
                  }
                  title="אין משימות"
                  description="צרו משימה חדשה כדי להתחיל לעקוב אחרי המשימות שלכם."
                  action={
                    <button
                      onClick={() => setShowCreate(true)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      צור משימה ראשונה
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {!statusFilter ? (
                    <>
                      {todoTasks.length > 0 && (
                        <TaskGroup
                          title="לביצוע"
                          color={taskStatuses.TODO?.color || "#579BFC"}
                          tasks={todoTasks}
                          onToggle={(task) =>
                            toggleMutation.mutate({
                              id: task.id,
                              status: "IN_PROGRESS",
                            })
                          }
                          onComplete={(task) =>
                            toggleMutation.mutate({
                              id: task.id,
                              status: "DONE",
                            })
                          }
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onStatusChange={(id, status) =>
                            toggleMutation.mutate({ id, status })
                          }
                          onPriorityChange={(id, priority) =>
                            updateTask(id, { priority }).then(() =>
                              queryClient.invalidateQueries({
                                queryKey: ["tasks"],
                              }),
                            )
                          }
                          inlineUpdate={inlineUpdate}
                          memberOptions={memberOptions}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      )}
                      {inProgressTasks.length > 0 && (
                        <TaskGroup
                          title="בתהליך"
                          color={
                            taskStatuses.IN_PROGRESS?.color || "#579BFC"
                          }
                          tasks={inProgressTasks}
                          onToggle={(task) =>
                            toggleMutation.mutate({
                              id: task.id,
                              status: "TODO",
                            })
                          }
                          onComplete={(task) =>
                            toggleMutation.mutate({
                              id: task.id,
                              status: "DONE",
                            })
                          }
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onStatusChange={(id, status) =>
                            toggleMutation.mutate({ id, status })
                          }
                          onPriorityChange={(id, priority) =>
                            updateTask(id, { priority }).then(() =>
                              queryClient.invalidateQueries({
                                queryKey: ["tasks"],
                              }),
                            )
                          }
                          inlineUpdate={inlineUpdate}
                          memberOptions={memberOptions}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      )}
                      {doneTasks.length > 0 && (
                        <TaskGroup
                          title="הושלם"
                          color={taskStatuses.DONE?.color || "#00CA72"}
                          tasks={doneTasks}
                          onToggle={(task) =>
                            toggleMutation.mutate({
                              id: task.id,
                              status: "TODO",
                            })
                          }
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onStatusChange={(id, status) =>
                            toggleMutation.mutate({ id, status })
                          }
                          onPriorityChange={(id, priority) =>
                            updateTask(id, { priority }).then(() =>
                              queryClient.invalidateQueries({
                                queryKey: ["tasks"],
                              }),
                            )
                          }
                          inlineUpdate={inlineUpdate}
                          memberOptions={memberOptions}
                          onTaskClick={(task) => setSelectedTaskId(task.id)}
                        />
                      )}
                    </>
                  ) : (
                    <TaskGroup
                      title={taskStatuses[statusFilter]?.label || "משימות"}
                      color={taskStatuses[statusFilter]?.color || "#579BFC"}
                      tasks={tasks}
                      onToggle={(task) => {
                        const nextStatus =
                          task.status === "DONE" ? "TODO" : "IN_PROGRESS";
                        toggleMutation.mutate({
                          id: task.id,
                          status: nextStatus,
                        });
                      }}
                      onComplete={(task) =>
                        toggleMutation.mutate({
                          id: task.id,
                          status: "DONE",
                        })
                      }
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onStatusChange={(id, status) =>
                        toggleMutation.mutate({ id, status })
                      }
                      onPriorityChange={(id, priority) =>
                        updateTask(id, { priority }).then(() =>
                          queryClient.invalidateQueries({
                            queryKey: ["tasks"],
                          }),
                        )
                      }
                      inlineUpdate={inlineUpdate}
                      memberOptions={memberOptions}
                      onTaskClick={(task) => setSelectedTaskId(task.id)}
                    />
                  )}
                </div>
              )}

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm bg-white border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    הקודם
                  </button>
                  <span className="text-sm text-text-secondary">
                    עמוד {page} מתוך {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(data.pagination.totalPages, p + 1),
                      )
                    }
                    disabled={page >= data.pagination.totalPages}
                    className="px-3 py-1.5 text-sm bg-white border border-border rounded-lg hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    הבא
                  </button>
                </div>
              )}
            </>
          )}

          {showCreate && (
            <CreateTaskModal onClose={() => setShowCreate(false)} />
          )}
        </PageShell>
      </div>

      {/* Side Panel */}
      {selectedTaskId && (
        <div className="fixed top-0 left-0 h-full w-[400px] bg-white/95 backdrop-blur-md shadow-[-4px_0_24px_rgba(0,0,0,0.08)] border-r border-border-light z-30 overflow-y-auto animate-slide-in-left">
          <div className="p-5">
            <TaskDetailPanel
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TaskKanbanCard({
  task,
  isDragging,
}: {
  task: Task;
  isDragging?: boolean;
}) {
  const { priorities } = useWorkspaceOptions();
  const isDone = task.status === "DONE";
  const isOverdue =
    task.dueDate && !isDone && new Date(task.dueDate) < new Date();
  const priorityInfo = priorities[task.priority];

  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${
        isDragging
          ? "shadow-lg opacity-90 border-l-primary"
          : isOverdue
            ? "border-l-danger shadow-sm ring-1 ring-danger/10"
            : isDone
              ? "border-l-success/50 opacity-70"
              : "border-l-transparent hover:shadow-md hover:border-l-primary"
      }`}
    >
      {/* Title */}
      <span
        className={`font-semibold text-sm block mb-1.5 ${
          isDone ? "line-through text-text-tertiary" : "text-text-primary"
        }`}
      >
        {task.title}
      </span>

      {task.description && (
        <p className="text-xs text-text-tertiary truncate mb-2">
          {task.description}
        </p>
      )}

      {/* Priority + overdue badges */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}
        >
          {priorityInfo?.label || task.priority}
        </span>
        {isOverdue && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-danger/10 text-danger">
            באיחור!
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-light">
        {/* Contact */}
        <div className="flex items-center gap-1">
          {task.contact && (
            <span className="text-[11px] text-text-secondary truncate max-w-[100px]">
              {task.contact.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Due date */}
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 text-[10px] ${
                isOverdue ? "text-danger font-semibold" : "text-text-tertiary"
              }`}
            >
              <Calendar size={10} />
              <span>
                {new Date(task.dueDate).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}

          {/* Assignee */}
          {task.assignee && (
            <div
              className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"
              role="img"
              aria-label={task.assignee.name}
              title={task.assignee.name}
            >
              <span className="text-white text-[9px] font-bold">
                {task.assignee.name[0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskGroup({
  title,
  color,
  tasks,
  onToggle,
  onComplete,
  onDelete,
  onStatusChange,
  onPriorityChange,
  inlineUpdate,
  memberOptions,
  onTaskClick,
}: {
  title: string;
  color: string;
  tasks: Task[];
  onToggle: (task: Task) => void;
  onComplete?: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onPriorityChange: (id: string, priority: string) => void;
  inlineUpdate: (id: string, data: any) => void;
  memberOptions: { id: string; name: string }[];
  onTaskClick?: (task: Task) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Monday-style colored group header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: color }}
      >
        <span className="font-bold text-sm text-white">{title}</span>
        <span className="text-[11px] font-semibold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Task items */}
      <div>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => onToggle(task)}
            onComplete={onComplete ? () => onComplete(task) : undefined}
            onDelete={() => onDelete(task.id)}
            onStatusChange={(status) => onStatusChange(task.id, status)}
            onPriorityChange={(priority) =>
              onPriorityChange(task.id, priority)
            }
            inlineUpdate={inlineUpdate}
            memberOptions={memberOptions}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
          />
        ))}
      </div>

      {/* Inline quick-add */}
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
      setTitle("");
      setIsAdding(false);
      toast.success("משימה נוצרה");
    },
    onError: () => {
      toast.error("שגיאה ביצירת משימה");
    },
  });

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full px-4 py-2.5 text-sm text-text-tertiary hover:text-primary hover:bg-[#F5F6FF] transition-colors flex items-center gap-2 border-t border-border-light"
      >
        <Plus size={14} />
        הוסף משימה
      </button>
    );
  }

  return (
    <div className="px-4 py-2.5 flex items-center gap-2 border-t border-border-light bg-[#F5F6FF]">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) mutation.mutate();
          if (e.key === "Escape") {
            setIsAdding(false);
            setTitle("");
          }
        }}
        placeholder="כותרת משימה חדשה..."
        className="flex-1 px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <button
        onClick={() => {
          if (title.trim()) mutation.mutate();
        }}
        disabled={!title.trim() || mutation.isPending}
        className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? "..." : "הוסף"}
      </button>
      <button
        onClick={() => {
          setIsAdding(false);
          setTitle("");
        }}
        className="p-1 rounded text-text-tertiary hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onComplete,
  onDelete,
  onStatusChange: _onStatusChange,
  onPriorityChange,
  inlineUpdate,
  memberOptions,
  onClick,
}: {
  task: Task;
  onToggle: () => void;
  onComplete?: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  inlineUpdate: (id: string, data: any) => void;
  memberOptions: { id: string; name: string }[];
  onClick?: () => void;
}) {
  const { priorities } = useWorkspaceOptions();
  const isDone = task.status === "DONE";
  const isOverdue =
    task.dueDate &&
    !isDone &&
    task.status !== "CANCELLED" &&
    new Date(task.dueDate) < new Date();
  const StatusIcon = STATUS_ICONS[task.status] || Circle;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border-light last:border-0 hover:bg-[#F5F6FF] transition-colors group ${
        isOverdue ? "bg-danger/[0.03]" : ""
      }`}
    >
      {/* Status toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          (onComplete || onToggle)();
        }}
        className="flex-shrink-0 transition-colors"
        title={isDone ? "סמן כלא הושלם" : "סמן כהושלם"}
      >
        <StatusIcon
          size={20}
          className={
            isDone
              ? "text-success"
              : task.status === "IN_PROGRESS"
                ? "text-warning"
                : "text-text-tertiary hover:text-success"
          }
        />
      </button>

      {/* Task title - clickable for side panel */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <MondayTextCell
          value={task.title}
          onChange={(val) => inlineUpdate(task.id, { title: val })}
          placeholder="כותרת משימה"
        />
        {task.description && (
          <p className="text-xs text-text-tertiary mt-0.5 truncate">
            {task.description}
          </p>
        )}
        {isOverdue && (
          <span className="text-[10px] font-semibold text-danger">
            באיחור!
          </span>
        )}
      </div>

      {/* Inline priority dropdown */}
      <StatusDropdown
        value={task.priority}
        options={priorities}
        onChange={onPriorityChange}
      />

      {/* Meta info */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {task.contact && (
          <span className="text-xs text-text-secondary hidden sm:inline">
            {task.contact.name}
          </span>
        )}

        {/* Due date - inline editable */}
        <MondayDateCell
          value={task.dueDate || null}
          onChange={(val) => inlineUpdate(task.id, { dueDate: val })}
        />
        {/* Due time indicator */}
        {task.dueTime && (
          <span
            className="flex items-center gap-1 text-[11px] text-text-tertiary font-mono"
            title={`שעה: ${task.dueTime}`}
          >
            <Clock size={10} />
            {task.dueTime}
          </span>
        )}

        {/* Assignee - inline editable */}
        <MondayPersonCell
          value={
            task.assignee
              ? { id: task.assignee.id, name: task.assignee.name }
              : null
          }
          onChange={(id) => inlineUpdate(task.id, { assigneeId: id! })}
          options={memberOptions}
          placeholder="נציג"
        />

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
          title="מחק משימה"
        >
          <X size={14} className="text-danger" />
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        active
          ? "text-white shadow-sm"
          : "bg-white border border-border text-text-secondary hover:border-primary hover:text-primary"
      }`}
      style={active ? { backgroundColor: color || "#6161FF" } : undefined}
    >
      {label}
    </button>
  );
}

const REMINDER_OPTIONS = [
  { value: 0, label: "בדיוק בזמן" },
  { value: 5, label: "5 דקות לפני" },
  { value: 10, label: "10 דקות לפני" },
  { value: 15, label: "15 דקות לפני" },
  { value: 30, label: "30 דקות לפני" },
  { value: 60, label: "שעה לפני" },
  { value: 120, label: "שעתיים לפני" },
  { value: 1440, label: "יום לפני" },
];

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { priorities } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    dueTime: "",
    reminderMinutes: 15,
    contactId: "",
    dealId: "",
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", { limit: 100 }],
    queryFn: () => listContacts({ limit: 100 }),
  });

  const { data: deals } = useQuery({
    queryKey: ["deals", { limit: 100 }],
    queryFn: () => listDeals({ limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createTask({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        dueTime: form.dueTime || undefined,
        reminderMinutes: form.dueTime ? form.reminderMinutes : undefined,
        contactId: form.contactId || undefined,
        dealId: form.dealId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      toast.success("משימה נוצרה בהצלחה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת משימה");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="משימה חדשה">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            כותרת *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            תיאור
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              עדיפות
            </label>
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {Object.entries(priorities).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              תאריך יעד
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              dir="ltr"
            />
          </div>
        </div>

        {/* Due time + reminder — shown only when a due date is set */}
        {form.dueDate && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                שעת ביצוע
              </label>
              <input
                type="time"
                value={form.dueTime}
                onChange={(e) => setField("dueTime", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                dir="ltr"
              />
            </div>
            {form.dueTime && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  תזכורת
                </label>
                <select
                  value={form.reminderMinutes}
                  onChange={(e) =>
                    setField("reminderMinutes", Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              איש קשר
            </label>
            <select
              value={form.contactId}
              onChange={(e) => setField("contactId", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">ללא</option>
              {contacts?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              עסקה
            </label>
            <select
              value={form.dealId}
              onChange={(e) => setField("dealId", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">ללא</option>
              {deals?.data.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור משימה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
