import { api } from "./client";

export interface Activity {
  id: string;
  type:
    | "NOTE"
    | "CALL"
    | "EMAIL"
    | "MEETING"
    | "WHATSAPP"
    | "STATUS_CHANGE"
    | "SYSTEM";
  subject: string | null;
  body: string | null;
  contactId: string | null;
  dealId: string | null;
  ticketId: string | null;
  metadata: any;
  member: {
    id: string;
    user: { name: string };
  };
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
  createdAt: string;
}

export function listActivities(params?: {
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.contactId) searchParams.set("contactId", params.contactId);
  if (params?.dealId) searchParams.set("dealId", params.dealId);
  if (params?.ticketId) searchParams.set("ticketId", params.ticketId);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  return api<Activity[]>(`/activities${qs ? `?${qs}` : ""}`);
}

export function createActivity(data: {
  type: string;
  subject?: string;
  body?: string;
  contactId?: string;
  dealId?: string;
  ticketId?: string;
  metadata?: any;
}) {
  return api<Activity>("/activities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateActivity(
  id: string,
  data: { subject?: string; body?: string; metadata?: any },
) {
  return api<Activity>(`/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteActivity(id: string) {
  return api<{ deleted: boolean }>(`/activities/${id}`, {
    method: "DELETE",
  });
}
