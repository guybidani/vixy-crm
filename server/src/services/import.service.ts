import { parse } from "csv-parse/sync";
import { prisma } from "../db/client";

/**
 * Parse a CSV buffer into headers + rows.
 * Handles UTF-8 BOM automatically.
 */
export function parseCSV(buffer: Buffer): {
  headers: string[];
  rows: string[][];
} {
  // Strip UTF-8 BOM if present
  let content = buffer.toString("utf-8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const records: string[][] = parse(content, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0];
  const rows = records.slice(1);

  return { headers, rows };
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const BATCH_SIZE = 100;

/**
 * Import contacts from parsed CSV rows with column mapping.
 * Skips rows where email already exists in workspace.
 */
export async function importContacts(
  workspaceId: string,
  memberId: string,
  rows: string[][],
  mapping: Record<string, string>,
  headers: string[],
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  // Build header-index lookup
  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    headerIndex[headers[i]] = i;
  }

  // Collect existing emails in workspace for duplicate check
  const existingEmails = new Set<string>();
  const emailColName = Object.entries(mapping).find(
    ([, field]) => field === "email",
  )?.[0];
  if (emailColName && headerIndex[emailColName] !== undefined) {
    const emailIdx = headerIndex[emailColName];
    const emailsInFile = rows
      .map((r) => r[emailIdx]?.trim().toLowerCase())
      .filter(Boolean);
    if (emailsInFile.length > 0) {
      const existing = await prisma.contact.findMany({
        where: {
          workspaceId,
          email: { in: emailsInFile },
        },
        select: { email: true },
      });
      for (const c of existing) {
        if (c.email) existingEmails.add(c.email.toLowerCase());
      }
    }
  }

  // Prepare rows for insert
  const toInsert: Array<{
    workspaceId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    position?: string;
    source?: string;
    status?: "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED" | "INACTIVE";
    createdById: string;
  }> = [];

  const validStatuses = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED", "INACTIVE"];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const getValue = (field: string): string => {
        const csvCol = Object.entries(mapping).find(
          ([, f]) => f === field,
        )?.[0];
        if (!csvCol || headerIndex[csvCol] === undefined) return "";
        return (row[headerIndex[csvCol]] || "").trim();
      };

      const email = getValue("email").toLowerCase() || undefined;

      // Skip duplicates
      if (email && existingEmails.has(email)) {
        result.skipped++;
        continue;
      }

      const firstName = getValue("firstName");
      const lastName = getValue("lastName");

      if (!firstName && !lastName) {
        result.errors.push(`Row ${i + 2}: missing first and last name`);
        result.skipped++;
        continue;
      }

      const statusRaw = getValue("status").toUpperCase();
      const status = validStatuses.includes(statusRaw)
        ? (statusRaw as "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED" | "INACTIVE")
        : undefined;

      toInsert.push({
        workspaceId,
        firstName: firstName || "",
        lastName: lastName || "",
        email: email || undefined,
        phone: getValue("phone") || undefined,
        position: getValue("company") || undefined, // map "company" to position if no companyId
        source: getValue("source") || undefined,
        status,
        createdById: memberId,
      });

      if (email) existingEmails.add(email);
    } catch (err) {
      result.errors.push(
        `Row ${i + 2}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      result.skipped++;
    }
  }

  // Batch insert
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    try {
      const created = await prisma.contact.createMany({
        data: batch.map((c) => ({
          workspaceId: c.workspaceId,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          position: c.position,
          source: c.source,
          ...(c.status ? { status: c.status } : {}),
          createdById: c.createdById,
        })),
        skipDuplicates: true,
      });
      result.imported += created.count;
    } catch (err) {
      result.errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err instanceof Error ? err.message : "DB error"}`,
      );
      result.skipped += batch.length;
    }
  }

  return result;
}

/**
 * Import deals from parsed CSV rows with column mapping.
 * Links to existing contacts by email. Skips rows with no contact match.
 */
export async function importDeals(
  workspaceId: string,
  memberId: string,
  rows: string[][],
  mapping: Record<string, string>,
  headers: string[],
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    headerIndex[headers[i]] = i;
  }

  const validStages = [
    "LEAD",
    "QUALIFIED",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];

  // Pre-fetch contacts for email linking
  const contactEmailColName = Object.entries(mapping).find(
    ([, f]) => f === "contactEmail",
  )?.[0];

  const contactsByEmail = new Map<string, string>();
  if (contactEmailColName && headerIndex[contactEmailColName] !== undefined) {
    const emailIdx = headerIndex[contactEmailColName];
    const emails = rows
      .map((r) => r[emailIdx]?.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: { workspaceId, email: { in: emails } },
        select: { id: true, email: true },
      });
      for (const c of contacts) {
        if (c.email) contactsByEmail.set(c.email.toLowerCase(), c.id);
      }
    }
  }

  const toInsert: Array<{
    workspaceId: string;
    title: string;
    value?: number;
    stage?: "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";
    contactId: string;
    assigneeId: string;
    notes?: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const getValue = (field: string): string => {
        const csvCol = Object.entries(mapping).find(
          ([, f]) => f === field,
        )?.[0];
        if (!csvCol || headerIndex[csvCol] === undefined) return "";
        return (row[headerIndex[csvCol]] || "").trim();
      };

      const title = getValue("title");
      if (!title) {
        result.errors.push(`Row ${i + 2}: missing deal title`);
        result.skipped++;
        continue;
      }

      const contactEmail = getValue("contactEmail").toLowerCase();
      const contactId = contactEmail
        ? contactsByEmail.get(contactEmail)
        : undefined;
      if (!contactId) {
        result.errors.push(
          `Row ${i + 2}: no matching contact for email "${contactEmail || "(empty)"}"`,
        );
        result.skipped++;
        continue;
      }

      const valueStr = getValue("value").replace(/[^0-9.]/g, "");
      const value = valueStr ? parseFloat(valueStr) : undefined;

      const stageRaw = getValue("stage").toUpperCase().replace(/\s+/g, "_");
      const stage = validStages.includes(stageRaw)
        ? (stageRaw as "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST")
        : undefined;

      toInsert.push({
        workspaceId,
        title,
        value,
        stage,
        contactId,
        assigneeId: memberId,
        notes: getValue("notes") || undefined,
      });
    } catch (err) {
      result.errors.push(
        `Row ${i + 2}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      result.skipped++;
    }
  }

  // Batch insert
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    try {
      const created = await prisma.deal.createMany({
        data: batch.map((d) => ({
          workspaceId: d.workspaceId,
          title: d.title,
          value: d.value,
          ...(d.stage ? { stage: d.stage } : {}),
          contactId: d.contactId,
          assigneeId: d.assigneeId,
          notes: d.notes,
        })),
        skipDuplicates: true,
      });
      result.imported += created.count;
    } catch (err) {
      result.errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err instanceof Error ? err.message : "DB error"}`,
      );
      result.skipped += batch.length;
    }
  }

  return result;
}
