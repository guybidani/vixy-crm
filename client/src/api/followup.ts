import { api } from "./client";

export interface FollowUpStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  delayDays: number;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "CALL_TASK";
  messageTemplate: string | null;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string | null;
  triggerStatuses: string[];
  endAction: string;
  isActive: boolean;
  steps: FollowUpStep[];
  _count: { executions: number };
  createdAt: string;
}

export interface FollowUpExecution {
  id: string;
  sequenceId: string;
  contactId: string;
  currentStep: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  nextRunAt: string | null;
  lastStepAt: string | null;
  completedAt: string | null;
  createdAt: string;
  sequence: {
    name: string;
    steps: FollowUpStep[];
  };
}

// ─── Sequences ───

export function getSequences() {
  return api<FollowUpSequence[]>("/follow-up/sequences");
}

export function getSequence(id: string) {
  return api<FollowUpSequence>(`/follow-up/sequences/${id}`);
}

export function createSequence(data: {
  name: string;
  description?: string;
  triggerStatuses: string[];
  endAction?: string;
  steps: Array<{
    stepNumber: number;
    delayDays: number;
    channel: string;
    messageTemplate?: string;
  }>;
}) {
  return api<FollowUpSequence>("/follow-up/sequences", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSequence(
  id: string,
  data: {
    name?: string;
    description?: string;
    triggerStatuses?: string[];
    endAction?: string;
    steps?: Array<{
      stepNumber: number;
      delayDays: number;
      channel: string;
      messageTemplate?: string;
    }>;
  },
) {
  return api<FollowUpSequence>(`/follow-up/sequences/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteSequence(id: string) {
  return api(`/follow-up/sequences/${id}`, { method: "DELETE" });
}

export function toggleSequence(id: string) {
  return api<FollowUpSequence>(`/follow-up/sequences/${id}/toggle`, {
    method: "POST",
  });
}

// ─── Executions ───

export function startExecution(data: {
  sequenceId: string;
  contactId: string;
}) {
  return api<FollowUpExecution>("/follow-up/executions/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function stopExecution(id: string) {
  return api(`/follow-up/executions/${id}/stop`, { method: "POST" });
}

export function getContactExecutions(contactId: string) {
  return api<FollowUpExecution[]>(`/follow-up/executions/contact/${contactId}`);
}
