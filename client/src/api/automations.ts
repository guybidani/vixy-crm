import { api } from "./client";

export interface WorkflowAction {
  id?: string;
  type: string;
  config: Record<string, any>;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: any;
  isActive: boolean;
  actions: WorkflowAction[];
  totalRuns?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  triggeredBy: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  error: string | null;
  executedAt: string;
}

export function listWorkflows(opts?: { trigger?: string; isActive?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.trigger) params.set("trigger", opts.trigger);
  if (opts?.isActive !== undefined)
    params.set("isActive", String(opts.isActive));
  const qs = params.toString();
  return api<{ data: Workflow[] }>(`/automations${qs ? `?${qs}` : ""}`);
}

export function getWorkflow(id: string) {
  return api<Workflow & { runs: WorkflowRun[] }>(`/automations/${id}`);
}

export function createWorkflow(data: {
  name: string;
  description?: string;
  trigger: string;
  conditions?: any[];
  actions: { type: string; config: Record<string, any>; order?: number }[];
}) {
  return api<Workflow>("/automations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWorkflow(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    trigger: string;
    conditions: any[];
    isActive: boolean;
    actions: { type: string; config: Record<string, any>; order?: number }[];
  }>,
) {
  return api<Workflow>(`/automations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function toggleWorkflow(id: string, isActive: boolean) {
  return api<Workflow>(`/automations/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function deleteWorkflow(id: string) {
  return api(`/automations/${id}`, { method: "DELETE" });
}

export function getWorkflowRuns(id: string, limit?: number) {
  const qs = limit ? `?limit=${limit}` : "";
  return api<{ data: WorkflowRun[] }>(`/automations/${id}/runs${qs}`);
}
