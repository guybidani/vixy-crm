import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export interface CreateTemplateInput {
  name: string;
  category?: string;
  channel?: string;
  subject?: string;
  body: string;
  variables?: Array<{ name: string; label: string }>;
  createdById: string;
}

export interface UpdateTemplateInput {
  name?: string;
  category?: string;
  channel?: string;
  subject?: string;
  body?: string;
  variables?: Array<{ name: string; label: string }>;
  isActive?: boolean;
}

export async function listTemplates(
  workspaceId: string,
  filters?: { category?: string; channel?: string },
) {
  const where: Record<string, unknown> = { workspaceId };
  if (filters?.category) where.category = filters.category;
  if (filters?.channel) where.channel = filters.channel;

  return prisma.cannedResponse.findMany({
    where,
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    include: {
      createdBy: {
        include: { user: { select: { name: true } } },
      },
    },
    take: 200,
  });
}

export async function getTemplate(workspaceId: string, id: string) {
  const template = await prisma.cannedResponse.findFirst({
    where: { id, workspaceId },
    include: {
      createdBy: {
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!template)
    throw new AppError(404, "NOT_FOUND", "Template not found");
  return template;
}

export async function createTemplate(
  workspaceId: string,
  data: CreateTemplateInput,
) {
  return prisma.cannedResponse.create({
    data: {
      workspaceId,
      name: data.name,
      category: data.category || "GENERAL",
      channel: data.channel || "EMAIL",
      subject: data.subject,
      body: data.body,
      variables: data.variables || Prisma.JsonNull,
      createdById: data.createdById,
    },
    include: {
      createdBy: {
        include: { user: { select: { name: true } } },
      },
    },
  });
}

export async function updateTemplate(
  workspaceId: string,
  id: string,
  data: UpdateTemplateInput,
) {
  // Use updateMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the mutation level, not just the existence check. Prevents
  // TOCTOU race where another request could change the record between
  // findFirst and update.
  const result = await prisma.cannedResponse.updateMany({
    where: { id, workspaceId },
    data,
  });
  if (result.count === 0)
    throw new AppError(404, "NOT_FOUND", "Template not found");

  return prisma.cannedResponse.findUnique({
    where: { id },
    include: {
      createdBy: {
        include: { user: { select: { name: true } } },
      },
    },
  });
}

export async function deleteTemplate(workspaceId: string, id: string) {
  // Use deleteMany with workspaceId for defense-in-depth — workspace scope
  // enforced at the delete level, not just an existence check. Prevents
  // TOCTOU race and cross-workspace deletes.
  const result = await prisma.cannedResponse.deleteMany({
    where: { id, workspaceId },
  });
  if (result.count === 0)
    throw new AppError(404, "NOT_FOUND", "Template not found");
  return { deleted: true };
}

export function renderTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });
}

export async function renderAndTrack(
  workspaceId: string,
  id: string,
  variables: Record<string, string>,
) {
  const template = await prisma.cannedResponse.findFirst({
    where: { id, workspaceId },
  });
  if (!template)
    throw new AppError(404, "NOT_FOUND", "Template not found");

  // Increment usage count with workspace scope (defense-in-depth) — fire
  // and forget so rendering is not blocked by the counter update.
  prisma.cannedResponse
    .updateMany({
      where: { id, workspaceId },
      data: { usageCount: { increment: 1 } },
    })
    .catch(() => {});

  const renderedBody = renderTemplate(template.body, variables);
  const renderedSubject = template.subject
    ? renderTemplate(template.subject, variables)
    : null;

  return {
    subject: renderedSubject,
    body: renderedBody,
  };
}

/** Seed default templates for a workspace */
export async function seedDefaultTemplates(
  workspaceId: string,
  createdById: string,
) {
  const existing = await prisma.cannedResponse.count({
    where: { workspaceId },
  });
  if (existing > 0) return; // Already has templates

  const defaults = [
    {
      name: "מעקב אחרי שיחה",
      category: "SALES",
      channel: "EMAIL",
      subject: "תודה על השיחה, {{firstName}}!",
      body: `שלום {{firstName}},\n\nתודה רבה על השיחה היום. כפי שדיברנו, אשמח לשלוח לך פרטים נוספים על {{dealTitle}}.\n\nאם יש לך שאלות נוספות, אל תהסס/י לפנות אליי.\n\nבברכה`,
      variables: [
        { name: "firstName", label: "שם פרטי" },
        { name: "dealTitle", label: "שם העסקה" },
      ],
    },
    {
      name: "הצעת מחיר",
      category: "SALES",
      channel: "EMAIL",
      subject: "הצעת מחיר - {{companyName}}",
      body: `שלום {{firstName}},\n\nמצורפת הצעת מחיר עבור {{companyName}} כפי שסיכמנו.\n\nפרטי ההצעה:\n- שם העסקה: {{dealTitle}}\n- תוקף ההצעה: 30 יום\n\nאשמח לשמוע ממך.\n\nבברכה`,
      variables: [
        { name: "firstName", label: "שם פרטי" },
        { name: "companyName", label: "שם חברה" },
        { name: "dealTitle", label: "שם העסקה" },
      ],
    },
    {
      name: "תזכורת פגישה",
      category: "SERVICE",
      channel: "WHATSAPP",
      subject: null,
      body: `היי {{firstName}} 👋\n\nרק תזכורת לפגישה שלנו מחר.\nאם יש שינוי, עדכן/י אותי.\n\nתודה!`,
      variables: [
        { name: "firstName", label: "שם פרטי" },
      ],
    },
    {
      name: "ברוכים הבאים",
      category: "GENERAL",
      channel: "EMAIL",
      subject: "ברוכים הבאים, {{firstName}}!",
      body: `שלום {{firstName}},\n\nשמחים שהצטרפת אלינו! 🎉\n\nאנחנו כאן בשבילך לכל שאלה או בקשה.\n\nצוות {{companyName}}`,
      variables: [
        { name: "firstName", label: "שם פרטי" },
        { name: "companyName", label: "שם חברה" },
      ],
    },
  ];

  await prisma.cannedResponse.createMany({
    data: defaults.map((t) => ({
      workspaceId,
      name: t.name,
      category: t.category,
      channel: t.channel,
      subject: t.subject,
      body: t.body,
      variables: t.variables,
      createdById,
    })),
  });
}
