import { api } from "./client";
import type { PaginatedResponse } from "./contacts";

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage:
    | "LEAD"
    | "QUALIFIED"
    | "PROPOSAL"
    | "NEGOTIATION"
    | "CLOSED_WON"
    | "CLOSED_LOST";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  probability: number;
  contact: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
  expectedClose: string | null;
  stageChangedAt: string;
  daysInStage: number;
  lastActivityAt: string | null;
  lostReason: string | null;
  notes: string | null;
  nextTask?: any;
  tags: Array<{ id: string; name: string; color: string }>;
  createdAt: string;
}

export interface PipelineResponse {
  stages: Record<string, Deal[]>;
  totals: Array<{
    stage: string;
    count: number;
    totalValue: number;
  }>;
}

export function listDeals(params?: {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  sortBy?: string;
  sortDir?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.stage) searchParams.set("stage", params.stage);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortDir) searchParams.set("sortDir", params.sortDir);

  const qs = searchParams.toString();
  return api<PaginatedResponse<Deal>>(`/deals${qs ? `?${qs}` : ""}`);
}

export function getDealsPipeline() {
  return api<PipelineResponse>("/deals/pipeline");
}

export interface DealDetail extends Omit<
  Deal,
  "contact" | "company" | "assignee"
> {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    phone: string | null;
    website: string | null;
  } | null;
  assignee: { id: string; user: { name: string } } | null;
  activities: Array<{
    id: string;
    type: string;
    description: string | null;
    createdAt: string;
    member: { user: { name: string } } | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    assignee: { user: { name: string } } | null;
  }>;
}

export function getDeal(id: string) {
  return api<DealDetail>(`/deals/${id}`);
}

export function createDeal(data: {
  title: string;
  value?: number;
  stage?: string;
  priority?: string;
  contactId: string;
  companyId?: string;
  expectedClose?: string;
  notes?: string;
}) {
  return api<Deal>("/deals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDeal(
  id: string,
  data: Partial<{
    title: string;
    value: number;
    stage: string;
    priority: string;
    contactId: string;
    companyId: string | null;
    assigneeId: string;
    probability: number;
    expectedClose: string;
    notes: string;
    lostReason: string;
  }>,
) {
  return api<Deal>(`/deals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteDeal(id: string) {
  return api(`/deals/${id}`, { method: "DELETE" });
}
