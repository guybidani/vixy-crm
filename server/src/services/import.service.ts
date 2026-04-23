import { parse } from "csv-parse/sync";
import { prisma } from "../db/client";
import { IMPORT_MAX_ROWS } from "../lib/constants";
import { AppError } from "../middleware/errorHandler";

/**
 * Parse a CSV buffer into headers + rows.
 * Handles UTF-8 BOM, Windows-1255 (Hebrew), and relaxed column count.
 */
export function parseCSV(buffer: Buffer): {
  headers: string[];
  rows: string[][];
} {
  // Detect encoding: if UTF-8 BOM present, use UTF-8. Otherwise, try UTF-8
  // and fall back to win1255 (Hebrew Windows) if we see replacement chars.
  let content = buffer.toString("utf-8");

  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  // Heuristic: if UTF-8 decode produced many replacement chars (U+FFFD),
  // try Windows-1255 (common for Hebrew exports from older Excel).
  const replacementRatio =
    (content.match(/\uFFFD/g) || []).length / Math.max(content.length, 1);
  if (replacementRatio > 0.01) {
    try {
      const decoder = new TextDecoder("windows-1255", { fatal: false });
      const decoded = decoder.decode(buffer);
      // Use win1255 output only if it has fewer replacement chars
      if (
        (decoded.match(/\uFFFD/g) || []).length <
        (content.match(/\uFFFD/g) || []).length
      ) {
        content = decoded.replace(/^\uFEFF/, "");
      }
    } catch {
      // keep utf-8 content
    }
  }

  const records: string[][] = parse(content, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0];
  const rows = records.slice(1);

  return { headers, rows };
}

// Alias for clarity in routes
export const parseCsv = parseCSV;

export type EntityType = "contact" | "deal" | "company";
export type DuplicateStrategy = "skip" | "update" | "create";

export interface ImportFailure {
  row: number;
  error: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: ImportFailure[];
  // Legacy flat errors for backwards compat with older frontend
  errors: string[];
}

export interface PreviewResult {
  headers: string[];
  preview: string[][];
  totalRows: number;
}

export function previewImport(buffer: Buffer): PreviewResult {
  const { headers, rows } = parseCSV(buffer);
  return {
    headers,
    preview: rows.slice(0, 5),
    totalRows: rows.length,
  };
}

const BATCH_SIZE = 100;

/**
 * Build a getter that reads a mapped CRM field from a CSV row.
 * mapping is CSV-column -> CRM-field (e.g. { "Email": "email" }).
 */
function makeRowGetter(
  headerIndex: Record<string, number>,
  mapping: Record<string, string>,
  row: string[],
) {
  // Invert mapping: field -> csvColumn(s). Use the first match.
  const fieldToCsvCol: Record<string, string> = {};
  for (const [csvCol, field] of Object.entries(mapping)) {
    if (field && !fieldToCsvCol[field]) fieldToCsvCol[field] = csvCol;
  }

  return (field: string): string => {
    const csvCol = fieldToCsvCol[field];
    if (!csvCol) return "";
    const idx = headerIndex[csvCol];
    if (idx === undefined) return "";
    return (row[idx] || "").trim();
  };
}

/**
 * Load workspace's custom fields for an entity type, indexed by key.
 */
async function loadCustomFields(workspaceId: string, entityType: string) {
  const fields = await prisma.customField.findMany({
    where: { workspaceId, entityType },
  });
  const byKey: Record<string, { id: string; fieldType: string }> = {};
  for (const f of fields) {
    byKey[`custom:${f.key}`] = { id: f.id, fieldType: f.fieldType };
  }
  return byKey;
}

async function writeCustomFieldValues(
  workspaceId: string,
  entityId: string,
  customFieldsByKey: Record<string, { id: string; fieldType: string }>,
  mapping: Record<string, string>,
  get: (field: string) => string,
) {
  const entries = Object.entries(mapping).filter(([, field]) =>
    field.startsWith("custom:"),
  );
  if (entries.length === 0) return;

  const data: Array<{
    workspaceId: string;
    fieldId: string;
    entityId: string;
    value: string | null;
  }> = [];

  for (const [, field] of entries) {
    const meta = customFieldsByKey[field];
    if (!meta) continue;
    const raw = get(field);
    if (!raw) continue;
    data.push({
      workspaceId,
      fieldId: meta.id,
      entityId,
      value: raw,
    });
  }

  if (data.length > 0) {
    await prisma.customFieldValue.createMany({
      data,
      skipDuplicates: true,
    });
  }
}

// ─── Contacts ───

const VALID_CONTACT_STATUSES = [
  "LEAD",
  "QUALIFIED",
  "CUSTOMER",
  "CHURNED",
  "INACTIVE",
] as const;
type ContactStatus = (typeof VALID_CONTACT_STATUSES)[number];

function normalizeStatus(raw: string): ContactStatus | undefined {
  const v = raw.toUpperCase().trim();
  return (VALID_CONTACT_STATUSES as readonly string[]).includes(v)
    ? (v as ContactStatus)
    : undefined;
}

export async function importContacts(
  workspaceId: string,
  memberId: string,
  rows: string[][],
  mapping: Record<string, string>,
  headers: string[],
  duplicateStrategy: DuplicateStrategy = "skip",
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: [],
    errors: [],
  };

  if (rows.length > IMPORT_MAX_ROWS) {
    result.errors.push(
      `File has ${rows.length} rows — max allowed is ${IMPORT_MAX_ROWS}. Only the first ${IMPORT_MAX_ROWS} rows will be processed.`,
    );
    rows = rows.slice(0, IMPORT_MAX_ROWS);
  }

  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) headerIndex[headers[i]] = i;

  const customFieldsByKey = await loadCustomFields(workspaceId, "contact");

  // Pre-load existing contacts by email
  const emailField = Object.entries(mapping).find(
    ([, f]) => f === "email",
  )?.[0];
  const existingByEmail = new Map<string, { id: string }>();
  if (emailField && headerIndex[emailField] !== undefined) {
    const emailIdx = headerIndex[emailField];
    const emails = Array.from(
      new Set(
        rows
          .map((r) => r[emailIdx]?.trim().toLowerCase())
          .filter((e): e is string => !!e),
      ),
    );
    if (emails.length > 0) {
      const existing = await prisma.contact.findMany({
        where: { workspaceId, deletedAt: null, email: { in: emails } },
        select: { id: true, email: true },
      });
      for (const c of existing) {
        if (c.email) existingByEmail.set(c.email.toLowerCase(), { id: c.id });
      }
    }
  }

  // Pre-load companies by name for linking
  const companyField = Object.entries(mapping).find(
    ([, f]) => f === "company",
  )?.[0];
  const companiesByName = new Map<string, string>();
  if (companyField && headerIndex[companyField] !== undefined) {
    const idx = headerIndex[companyField];
    const names = Array.from(
      new Set(
        rows
          .map((r) => r[idx]?.trim())
          .filter((n): n is string => !!n),
      ),
    );
    if (names.length > 0) {
      const companies = await prisma.company.findMany({
        where: { workspaceId, name: { in: names }, deletedAt: null },
        select: { id: true, name: true },
      });
      for (const c of companies) {
        companiesByName.set(c.name.toLowerCase(), c.id);
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const get = makeRowGetter(headerIndex, mapping, row);

      // Support full-name "name" mapping — split on first space
      let firstName = get("firstName");
      let lastName = get("lastName");
      const fullName = get("name");
      if (!firstName && !lastName && fullName) {
        const parts = fullName.split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ");
      }

      const emailRaw = get("email");
      const email = emailRaw ? emailRaw.toLowerCase() : undefined;
      const phone = get("phone") || undefined;

      if (!firstName && !lastName && !email && !phone) {
        result.failed.push({
          row: rowNum,
          error: "שורה ריקה — חסר שם, אימייל או טלפון",
        });
        result.skipped++;
        continue;
      }

      // Resolve company
      let companyId: string | undefined;
      const companyName = get("company");
      if (companyName) {
        const existing = companiesByName.get(companyName.toLowerCase());
        if (existing) {
          companyId = existing;
        } else {
          // Auto-create company
          const created = await prisma.company.create({
            data: { workspaceId, name: companyName },
            select: { id: true },
          });
          companyId = created.id;
          companiesByName.set(companyName.toLowerCase(), created.id);
        }
      }

      const status = normalizeStatus(get("status"));
      const sourceVal = get("source") || undefined;
      const position = get("position") || undefined;
      const leadScoreRaw = get("leadScore");
      const leadScore = leadScoreRaw
        ? Math.max(0, Math.min(100, parseInt(leadScoreRaw, 10) || 0))
        : undefined;

      const dup = email ? existingByEmail.get(email) : undefined;

      if (dup) {
        if (duplicateStrategy === "skip") {
          result.skipped++;
          continue;
        }
        if (duplicateStrategy === "update") {
          await prisma.contact.update({
            where: { id: dup.id },
            data: {
              ...(firstName ? { firstName } : {}),
              ...(lastName ? { lastName } : {}),
              ...(phone ? { phone } : {}),
              ...(position ? { position } : {}),
              ...(sourceVal ? { source: sourceVal } : {}),
              ...(status ? { status } : {}),
              ...(leadScore !== undefined ? { leadScore } : {}),
              ...(companyId ? { companyId } : {}),
            },
          });
          await writeCustomFieldValues(
            workspaceId,
            dup.id,
            customFieldsByKey,
            mapping,
            get,
          );
          result.imported++;
          continue;
        }
        // create strategy falls through to createMany path below
      }

      const created = await prisma.contact.create({
        data: {
          workspaceId,
          firstName: firstName || "",
          lastName: lastName || "",
          email,
          phone,
          position,
          source: sourceVal,
          ...(status ? { status } : {}),
          ...(leadScore !== undefined ? { leadScore } : {}),
          companyId,
          createdById: memberId,
        },
        select: { id: true, email: true },
      });

      await writeCustomFieldValues(
        workspaceId,
        created.id,
        customFieldsByKey,
        mapping,
        get,
      );

      if (email) existingByEmail.set(email, { id: created.id });
      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      result.failed.push({ row: rowNum, error: msg });
      result.skipped++;
    }
  }

  // Keep errors[] populated for backwards compat
  result.errors = result.failed.map((f) => `שורה ${f.row}: ${f.error}`);
  return result;
}

// ─── Companies ───

const VALID_COMPANY_STATUSES = [
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
  "CHURNED",
] as const;
type CompanyStatus = (typeof VALID_COMPANY_STATUSES)[number];

function normalizeCompanyStatus(raw: string): CompanyStatus | undefined {
  const v = raw.toUpperCase().trim();
  return (VALID_COMPANY_STATUSES as readonly string[]).includes(v)
    ? (v as CompanyStatus)
    : undefined;
}

export async function importCompanies(
  workspaceId: string,
  _memberId: string,
  rows: string[][],
  mapping: Record<string, string>,
  headers: string[],
  duplicateStrategy: DuplicateStrategy = "skip",
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: [],
    errors: [],
  };

  if (rows.length > IMPORT_MAX_ROWS) {
    result.errors.push(
      `File has ${rows.length} rows — max allowed is ${IMPORT_MAX_ROWS}.`,
    );
    rows = rows.slice(0, IMPORT_MAX_ROWS);
  }

  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) headerIndex[headers[i]] = i;

  const customFieldsByKey = await loadCustomFields(workspaceId, "company");

  // Pre-load existing companies by name (case-insensitive duplicate check)
  const nameField = Object.entries(mapping).find(([, f]) => f === "name")?.[0];
  const existingByName = new Map<string, string>();
  if (nameField && headerIndex[nameField] !== undefined) {
    const idx = headerIndex[nameField];
    const names = Array.from(
      new Set(
        rows
          .map((r) => r[idx]?.trim())
          .filter((n): n is string => !!n),
      ),
    );
    if (names.length > 0) {
      const existing = await prisma.company.findMany({
        where: { workspaceId, name: { in: names }, deletedAt: null },
        select: { id: true, name: true },
      });
      for (const c of existing) existingByName.set(c.name.toLowerCase(), c.id);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const get = makeRowGetter(headerIndex, mapping, row);
      const name = get("name");
      if (!name) {
        result.failed.push({ row: rowNum, error: "חסר שם חברה" });
        result.skipped++;
        continue;
      }

      const status = normalizeCompanyStatus(get("status"));
      const website = get("website") || undefined;
      const phone = get("phone") || undefined;
      const email = get("email") || undefined;
      const address = get("address") || undefined;
      const industry = get("industry") || undefined;
      const size = get("size") || undefined;
      const notes = get("notes") || undefined;

      const existingId = existingByName.get(name.toLowerCase());

      if (existingId) {
        if (duplicateStrategy === "skip") {
          result.skipped++;
          continue;
        }
        if (duplicateStrategy === "update") {
          await prisma.company.update({
            where: { id: existingId },
            data: {
              ...(status ? { status } : {}),
              ...(website ? { website } : {}),
              ...(phone ? { phone } : {}),
              ...(email ? { email } : {}),
              ...(address ? { address } : {}),
              ...(industry ? { industry } : {}),
              ...(size ? { size } : {}),
              ...(notes ? { notes } : {}),
            },
          });
          await writeCustomFieldValues(
            workspaceId,
            existingId,
            customFieldsByKey,
            mapping,
            get,
          );
          result.imported++;
          continue;
        }
      }

      const created = await prisma.company.create({
        data: {
          workspaceId,
          name,
          ...(status ? { status } : {}),
          website,
          phone,
          email,
          address,
          industry,
          size,
          notes,
        },
        select: { id: true },
      });

      await writeCustomFieldValues(
        workspaceId,
        created.id,
        customFieldsByKey,
        mapping,
        get,
      );

      existingByName.set(name.toLowerCase(), created.id);
      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      result.failed.push({ row: rowNum, error: msg });
      result.skipped++;
    }
  }

  result.errors = result.failed.map((f) => `שורה ${f.row}: ${f.error}`);
  return result;
}

// ─── Deals ───

export async function importDeals(
  workspaceId: string,
  memberId: string,
  rows: string[][],
  mapping: Record<string, string>,
  headers: string[],
  _duplicateStrategy: DuplicateStrategy = "skip",
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: [],
    errors: [],
  };

  if (rows.length > IMPORT_MAX_ROWS) {
    result.errors.push(
      `File has ${rows.length} rows — max allowed is ${IMPORT_MAX_ROWS}.`,
    );
    rows = rows.slice(0, IMPORT_MAX_ROWS);
  }

  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) headerIndex[headers[i]] = i;

  const customFieldsByKey = await loadCustomFields(workspaceId, "deal");

  const validStages = [
    "LEAD",
    "QUALIFIED",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ] as const;
  type Stage = (typeof validStages)[number];

  // Pre-fetch contacts by email
  const contactEmailField = Object.entries(mapping).find(
    ([, f]) => f === "contactEmail",
  )?.[0];
  const contactsByEmail = new Map<string, string>();
  if (contactEmailField && headerIndex[contactEmailField] !== undefined) {
    const idx = headerIndex[contactEmailField];
    const emails = Array.from(
      new Set(
        rows
          .map((r) => r[idx]?.trim().toLowerCase())
          .filter((e): e is string => !!e),
      ),
    );
    if (emails.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: { workspaceId, deletedAt: null, email: { in: emails } },
        select: { id: true, email: true },
      });
      for (const c of contacts) {
        if (c.email) contactsByEmail.set(c.email.toLowerCase(), c.id);
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const get = makeRowGetter(headerIndex, mapping, row);
      const title = get("title");
      if (!title) {
        result.failed.push({ row: rowNum, error: "חסר שם עסקה" });
        result.skipped++;
        continue;
      }

      const contactEmail = get("contactEmail").toLowerCase();
      const contactId = contactEmail
        ? contactsByEmail.get(contactEmail)
        : undefined;
      if (!contactId) {
        result.failed.push({
          row: rowNum,
          error: `לא נמצא איש קשר עם האימייל "${contactEmail || "(ריק)"}"`,
        });
        result.skipped++;
        continue;
      }

      const valueStr = get("value").replace(/[^0-9.]/g, "");
      const value = valueStr ? parseFloat(valueStr) : undefined;

      const stageRaw = get("stage").toUpperCase().replace(/\s+/g, "_");
      const stage = (validStages as readonly string[]).includes(stageRaw)
        ? (stageRaw as Stage)
        : undefined;

      const notes = get("notes") || undefined;

      const created = await prisma.deal.create({
        data: {
          workspaceId,
          title,
          value,
          ...(stage ? { stage } : {}),
          contactId,
          assigneeId: memberId,
          notes,
        },
        select: { id: true },
      });

      await writeCustomFieldValues(
        workspaceId,
        created.id,
        customFieldsByKey,
        mapping,
        get,
      );

      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      result.failed.push({ row: rowNum, error: msg });
      result.skipped++;
    }
  }

  result.errors = result.failed.map((f) => `שורה ${f.row}: ${f.error}`);
  return result;
}

// ─── Unified dispatcher ───

// TODO(async-imports): This runs synchronously and blocks the HTTP request for
// the duration of the import (up to IMPORT_MAX_ROWS = 10k rows). For large
// files this can tie up a request for tens of seconds. When we need to scale
// beyond that:
//   1. Add an `ImportJob` model to Prisma (id, workspaceId, entityType,
//      status, progress, result, failedRows).
//   2. Create `queue/import.queue.ts` mirroring automation.queue.ts (BullMQ is
//      already wired via redisConnection).
//   3. Route `/import/execute` pushes a job and returns { jobId }; worker calls
//      the same executeImport() below and persists result/progress.
//   4. Add GET /import/jobs/:id for the UI to poll.
// Not blocking deploys today because:
//   - Requests cap at 10k rows (hard limit) and typical usage is <500.
//   - Single-container deployment (no horizontal scaling pressure).
export async function executeImport(
  workspaceId: string,
  memberId: string,
  entityType: EntityType,
  mapping: Record<string, string>,
  rows: string[][],
  headers: string[],
  duplicateStrategy: DuplicateStrategy = "skip",
): Promise<ImportResult> {
  switch (entityType) {
    case "contact":
      return importContacts(
        workspaceId,
        memberId,
        rows,
        mapping,
        headers,
        duplicateStrategy,
      );
    case "company":
      return importCompanies(
        workspaceId,
        memberId,
        rows,
        mapping,
        headers,
        duplicateStrategy,
      );
    case "deal":
      return importDeals(
        workspaceId,
        memberId,
        rows,
        mapping,
        headers,
        duplicateStrategy,
      );
    default:
      throw new AppError(400, "INVALID_ENTITY_TYPE", `Unknown entity type: ${entityType}`);
  }
}
