import { api } from "./client";

export interface TemplateVariable {
  name: string;
  label: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: TemplateVariable[] | null;
  isActive: boolean;
  usageCount: number;
  createdById: string;
  createdBy: {
    user: { name: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface RenderResult {
  subject: string | null;
  body: string;
}

export function listTemplates(filters?: {
  category?: string;
  channel?: string;
}): Promise<Template[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.channel) params.set("channel", filters.channel);
  const qs = params.toString();
  return api<Template[]>(`/templates${qs ? `?${qs}` : ""}`);
}

export function getTemplate(id: string): Promise<Template> {
  return api<Template>(`/templates/${id}`);
}

export function createTemplate(data: {
  name: string;
  category?: string;
  channel?: string;
  subject?: string;
  body: string;
  variables?: TemplateVariable[];
}): Promise<Template> {
  return api<Template>("/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    category: string;
    channel: string;
    subject: string | null;
    body: string;
    variables: TemplateVariable[] | null;
    isActive: boolean;
  }>,
): Promise<Template> {
  return api<Template>(`/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTemplate(id: string): Promise<{ success: boolean }> {
  return api(`/templates/${id}`, { method: "DELETE" });
}

export function renderTemplate(
  id: string,
  variables: Record<string, string>,
): Promise<RenderResult> {
  return api<RenderResult>(`/templates/${id}/render`, {
    method: "POST",
    body: JSON.stringify({ variables }),
  });
}
