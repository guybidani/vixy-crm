import { api } from "./client";

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata: any;
  createdAt: string;
}

interface NotificationListResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

export function listNotifications(opts?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.unreadOnly) params.set("unreadOnly", "true");
  const qs = params.toString();
  return api<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ""}`);
}

export function getUnreadCount() {
  return api<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return api(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return api("/notifications/read-all", { method: "PATCH" });
}

export function deleteNotification(id: string) {
  return api(`/notifications/${id}`, { method: "DELETE" });
}
