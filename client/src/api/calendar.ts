import { api } from "./client";

export interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendarId?: string;
  syncEnabled?: boolean;
  lastSyncAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
}

export function getCalendarAuthUrl() {
  return api<{ url: string }>("/calendar/auth-url");
}

export function getCalendarStatus() {
  return api<CalendarStatus>("/calendar/status");
}

export function syncCalendar() {
  return api<{ synced: number }>("/calendar/sync", { method: "POST" });
}

export function syncTaskToCalendar(taskId: string) {
  return api<{ eventId: string }>(`/calendar/tasks/${taskId}/sync`, {
    method: "POST",
  });
}

export function disconnectCalendar() {
  return api<{ success: boolean }>("/calendar/disconnect", {
    method: "DELETE",
  });
}

export function getUpcomingEvents() {
  return api<{ events: CalendarEvent[] }>("/calendar/events/upcoming");
}
