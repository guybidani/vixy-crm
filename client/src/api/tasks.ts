import { api } from "./client";
import type { PaginatedResponse } from "./contacts";

export type TaskType = "CALL" | "EMAIL" | "MEETING" | "WHATSAPP" | "FOLLOW_UP" | "TASK";
export type TaskContext = "SALES" | "SERVICE" | "GENERAL";
export type CallResult = "ANSWERED" | "VOICEMAIL" | "NO_ANSWER" | "BUSY" | "RESCHEDULED" | "NOT_RELEVANT";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskType: TaskType;
  taskContext: TaskContext;
  dueDate: string | null;
  dueTime: string | null;
  reminderMinutes: number | null;
  outcomeNote: string | null;
  callResult: CallResult | null;
  snoozedUntil: string | null;
  isRecurring: boolean;
  recurrenceType: string | null;
  assignee: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
  createdBy: string;
  completedAt: string | null;
  createdAt: string;
}

export interface TaskDetail extends Task {
  ticket: { id: string; subject: string } | null;
  updatedAt?: string;
}

export function getTask(id: string) {
  return api<TaskDetail>(`/tasks/${id}`);
}

export function getTaskStats(myOnly?: boolean) {
  const qs = myOnly ? "?myOnly=true" : "";
  return api<{ overdueCount: number; dueTodayCount: number; completedThisWeek: number }>(
    `/tasks/stats${qs}`,
  );
}

export function listTasks(params?: {
  page?: number;
  limit?: number;
  status?: string;
  taskType?: string;
  taskContext?: string;
  assigneeId?: string;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  myOnly?: boolean;
  dueTodayOnly?: boolean;
  sortBy?: string;
  sortDir?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.taskType) searchParams.set("taskType", params.taskType);
  if (params?.taskContext) searchParams.set("taskContext", params.taskContext);
  if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId);
  if (params?.contactId) searchParams.set("contactId", params.contactId);
  if (params?.dealId) searchParams.set("dealId", params.dealId);
  if (params?.ticketId) searchParams.set("ticketId", params.ticketId);
  if (params?.myOnly) searchParams.set("myOnly", "true");
  if (params?.dueTodayOnly) searchParams.set("dueTodayOnly", "true");
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortDir) searchParams.set("sortDir", params.sortDir);

  const qs = searchParams.toString();
  return api<PaginatedResponse<Task>>(`/tasks${qs ? `?${qs}` : ""}`);
}

export function createTask(data: {
  title: string;
  description?: string;
  priority?: string;
  taskType?: string;
  taskContext?: string;
  dueDate?: string;
  dueTime?: string;
  reminderMinutes?: number;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  assigneeId?: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceDay?: number;
  recurrenceEndDate?: string;
}) {
  return api<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    taskType: string;
    taskContext: string;
    dueDate: string;
    dueTime: string | null;
    reminderMinutes: number;
    assigneeId: string;
    outcomeNote: string;
    callResult: string | null;
    snoozedUntil: string | null;
  }>,
) {
  return api<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function snoozeTask(id: string, until: string) {
  return api<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ snoozedUntil: until }),
  });
}

export function completeTask(id: string, data: { callResult?: CallResult; outcomeNote?: string }) {
  return api<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "DONE", ...data }),
  });
}

export function deleteTask(id: string) {
  return api(`/tasks/${id}`, { method: "DELETE" });
}

export function getTasksBoard() {
  return api<import("./contacts").BoardResponse<Task>>("/tasks/board");
}

export function bulkDeleteTasks(ids: string[]) {
  return api<{ deleted: number }>("/tasks/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

// ─── Task Comments ───

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function listTaskComments(taskId: string) {
  return api<TaskComment[]>(`/tasks/${taskId}/comments`);
}

export function createTaskComment(taskId: string, body: string) {
  return api<TaskComment>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteTaskComment(taskId: string, commentId: string) {
  return api<{ success: boolean }>(`/tasks/${taskId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export function bulkUpdateTasks(
  ids: string[],
  data: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
  },
) {
  return api<{ updated: number }>("/tasks/bulk-update", {
    method: "POST",
    body: JSON.stringify({ ids, data }),
  });
}
