import { api } from "./client";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: { id: string; name: string } | null;
  position: string | null;
  source: string | null;
  status: "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED" | "INACTIVE";
  leadScore: number;
  lastActivityAt: string | null;
  tags: Array<{ id: string; name: string; color: string }>;
  createdBy: string;
  createdAt: string;
}

export interface ContactDetail extends Contact {
  deals: any[];
  tickets: any[];
  activities: any[];
  tasks: any[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function listContacts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortDir) searchParams.set("sortDir", params.sortDir);

  const qs = searchParams.toString();
  return api<PaginatedResponse<Contact>>(`/contacts${qs ? `?${qs}` : ""}`);
}

export function getContact(id: string) {
  return api<ContactDetail>(`/contacts/${id}`);
}

export function createContact(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: string | null;
  position?: string;
  source?: string;
  status?: string;
}) {
  return api<Contact>("/contacts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateContact(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyId: string | null;
    position: string;
    source: string;
    status: string;
    leadScore: number;
  }>,
) {
  return api<Contact>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteContact(id: string) {
  return api(`/contacts/${id}`, { method: "DELETE" });
}

export interface BoardResponse<T> {
  statuses: Record<string, T[]>;
  totals: Array<{ status: string; count: number }>;
}

export function getContactsBoard() {
  return api<BoardResponse<Contact>>("/contacts/board");
}
