import { api } from "./client";
import type { PaginatedResponse } from "./contacts";

export interface Company {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  size: string | null;
  notes: string | null;
  status: "PROSPECT" | "ACTIVE" | "INACTIVE" | "CHURNED";
  contactCount: number;
  dealCount: number;
  createdAt: string;
}

export function listCompanies(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortDir) searchParams.set("sortDir", params.sortDir);

  const qs = searchParams.toString();
  return api<PaginatedResponse<Company>>(`/companies${qs ? `?${qs}` : ""}`);
}

export function getCompany(id: string) {
  return api<Company & { contacts: any[]; deals: any[] }>(`/companies/${id}`);
}

export function createCompany(data: {
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  size?: string;
}) {
  return api<Company>("/companies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCompany(id: string, data: Partial<Company>) {
  return api<Company>(`/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCompany(id: string) {
  return api(`/companies/${id}`, { method: "DELETE" });
}

export function getCompaniesBoard() {
  return api<import("./contacts").BoardResponse<Company>>("/companies/board");
}
