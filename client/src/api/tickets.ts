import { api } from "./client";
import type { PaginatedResponse } from "./contacts";

export interface UrgencyComputed {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  label: string;
  color: string;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: "NEW" | "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  channel: string;
  contact: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  slaPolicy: {
    id: string;
    name: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
  } | null;
  urgencyScore: number;
  urgencyComputed: UrgencyComputed;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  csatScore: number | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  channel: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  assignee: { id: string; user: { name: string } } | null;
  slaPolicy: any;
  urgencyScore: number;
  urgencyComputed: UrgencyComputed;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  csatScore: number | null;
  csatComment: string | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: "agent" | "contact";
  senderId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export function listTickets(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  contactId?: string;
  sortBy?: string;
  sortDir?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.priority) searchParams.set("priority", params.priority);
  if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId);
  if (params?.contactId) searchParams.set("contactId", params.contactId);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortDir) searchParams.set("sortDir", params.sortDir);

  const qs = searchParams.toString();
  return api<PaginatedResponse<Ticket>>(`/tickets${qs ? `?${qs}` : ""}`);
}

export function getTicket(id: string) {
  return api<TicketDetail>(`/tickets/${id}`);
}

export function createTicket(data: {
  subject: string;
  description?: string;
  priority?: string;
  urgencyLevel?: string;
  channel?: string;
  contactId?: string;
  assigneeId?: string;
}) {
  return api<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTicket(
  id: string,
  data: Partial<{
    subject: string;
    description: string;
    status: string;
    priority: string;
    urgencyLevel: string;
    assigneeId: string;
  }>,
) {
  return api<Ticket>(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function addTicketMessage(
  ticketId: string,
  data: { body: string; isInternal?: boolean },
) {
  return api<TicketMessage>(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getTicketsBoard() {
  return api<import("./contacts").BoardResponse<Ticket>>("/tickets/board");
}
