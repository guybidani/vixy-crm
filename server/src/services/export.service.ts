import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";

type ExportEntity = "contacts" | "deals" | "companies" | "tasks" | "tickets";

const UTF8_BOM = "\uFEFF";

const COLUMNS: Record<ExportEntity, Array<{ key: string; label: string }>> = {
  contacts: [
    { key: "firstName", label: "שם פרטי" },
    { key: "lastName", label: "שם משפחה" },
    { key: "email", label: "אימייל" },
    { key: "phone", label: "טלפון" },
    { key: "company", label: "חברה" },
    { key: "position", label: "תפקיד" },
    { key: "source", label: "מקור" },
    { key: "status", label: "סטטוס" },
    { key: "leadScore", label: "ציון ליד" },
    { key: "tags", label: "תגיות" },
    { key: "createdAt", label: "תאריך יצירה" },
  ],
  deals: [
    { key: "title", label: "שם עסקה" },
    { key: "value", label: "שווי" },
    { key: "stage", label: "שלב" },
    { key: "priority", label: "עדיפות" },
    { key: "contact", label: "איש קשר" },
    { key: "company", label: "חברה" },
    { key: "probability", label: "סיכוי" },
    { key: "expectedClose", label: "תאריך סגירה צפוי" },
    { key: "tags", label: "תגיות" },
    { key: "createdAt", label: "תאריך יצירה" },
  ],
  companies: [
    { key: "name", label: "שם" },
    { key: "status", label: "סטטוס" },
    { key: "website", label: "אתר" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
    { key: "industry", label: "תעשייה" },
    { key: "size", label: "גודל" },
    { key: "createdAt", label: "תאריך יצירה" },
  ],
  tasks: [
    { key: "title", label: "כותרת" },
    { key: "description", label: "תיאור" },
    { key: "status", label: "סטטוס" },
    { key: "priority", label: "עדיפות" },
    { key: "taskType", label: "סוג משימה" },
    { key: "dueDate", label: "תאריך יעד" },
    { key: "dueTime", label: "שעה" },
    { key: "assignee", label: "מטופל" },
    { key: "contact", label: "איש קשר" },
    { key: "deal", label: "עסקה" },
    { key: "completedAt", label: "הושלמה ב" },
    { key: "createdBy", label: "מי יצר" },
    { key: "createdAt", label: "תאריך יצירה" },
  ],
  tickets: [
    { key: "subject", label: "נושא" },
    { key: "status", label: "סטטוס" },
    { key: "priority", label: "עדיפות" },
    { key: "channel", label: "ערוץ" },
    { key: "contact", label: "איש קשר" },
    { key: "createdAt", label: "תאריך יצירה" },
  ],
};

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("he-IL");
}

const MAX_EXPORT_ROWS = 10_000;

export async function exportCsv(
  workspaceId: string,
  entity: ExportEntity,
  filters?: { status?: string; search?: string },
): Promise<{ csv: string; truncated: boolean }> {
  const cols = COLUMNS[entity];
  const header = cols.map((c) => escapeCsv(c.label)).join(",");
  let rows: string[] = [];

  switch (entity) {
    case "contacts": {
      const where: Prisma.ContactWhereInput = { workspaceId };
      if (filters?.status) where.status = filters.status as any;
      if (filters?.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      const data = await prisma.contact.findMany({
        where,
        include: {
          company: { select: { name: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_EXPORT_ROWS,
      });
      rows = data.map((c) =>
        [
          c.firstName,
          c.lastName,
          c.email || "",
          c.phone || "",
          c.company?.name || "",
          c.position || "",
          c.source || "",
          c.status,
          String(c.leadScore),
          c.tags.map((t) => t.tag.name).join("; "),
          formatDate(c.createdAt),
        ]
          .map(escapeCsv)
          .join(","),
      );
      break;
    }

    case "deals": {
      const where: Prisma.DealWhereInput = { workspaceId };
      if (filters?.status) where.stage = filters.status as any;
      if (filters?.search) {
        where.title = { contains: filters.search, mode: "insensitive" };
      }
      const data = await prisma.deal.findMany({
        where,
        include: {
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_EXPORT_ROWS,
      });
      rows = data.map((d) =>
        [
          d.title,
          d.value ? String(d.value) : "",
          d.stage,
          d.priority,
          d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "",
          d.company?.name || "",
          d.probability !== null ? String(d.probability) : "",
          formatDate(d.expectedClose),
          d.tags.map((t) => t.tag.name).join("; "),
          formatDate(d.createdAt),
        ]
          .map(escapeCsv)
          .join(","),
      );
      break;
    }

    case "companies": {
      const where: Prisma.CompanyWhereInput = { workspaceId };
      if (filters?.status) where.status = filters.status as any;
      if (filters?.search) {
        where.name = { contains: filters.search, mode: "insensitive" };
      }
      const data = await prisma.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_EXPORT_ROWS,
      });
      rows = data.map((c) =>
        [
          c.name,
          c.status,
          c.website || "",
          c.phone || "",
          c.email || "",
          c.industry || "",
          c.size || "",
          formatDate(c.createdAt),
        ]
          .map(escapeCsv)
          .join(","),
      );
      break;
    }

    case "tasks": {
      const where: Prisma.TaskWhereInput = { workspaceId };
      if (filters?.status) where.status = filters.status as any;
      if (filters?.search) {
        where.title = { contains: filters.search, mode: "insensitive" };
      }
      const data = await prisma.task.findMany({
        where,
        include: {
          contact: { select: { firstName: true, lastName: true } },
          deal: { select: { title: true } },
          assignee: { include: { user: { select: { name: true } } } },
          createdBy: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_EXPORT_ROWS,
      });
      rows = data.map((t) =>
        [
          t.title,
          t.description || "",
          t.status,
          t.priority,
          t.taskType || "",
          formatDate(t.dueDate),
          t.dueTime || "",
          t.assignee?.user?.name || "",
          t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : "",
          t.deal?.title || "",
          formatDate(t.completedAt),
          t.createdBy?.user?.name || "",
          formatDate(t.createdAt),
        ]
          .map(escapeCsv)
          .join(","),
      );
      break;
    }

    case "tickets": {
      const where: Prisma.TicketWhereInput = { workspaceId };
      if (filters?.status) where.status = filters.status as any;
      if (filters?.search) {
        where.subject = { contains: filters.search, mode: "insensitive" };
      }
      const data = await prisma.ticket.findMany({
        where,
        include: {
          contact: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_EXPORT_ROWS,
      });
      rows = data.map((t) =>
        [
          t.subject,
          t.status,
          t.priority,
          t.channel || "",
          t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : "",
          formatDate(t.createdAt),
        ]
          .map(escapeCsv)
          .join(","),
      );
      break;
    }
  }

  const truncated = rows.length >= MAX_EXPORT_ROWS;
  const csv = UTF8_BOM + header + "\n" + rows.join("\n");
  return { csv, truncated };
}
