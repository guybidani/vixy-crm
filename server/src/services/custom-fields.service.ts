import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

// ─── Slug Generation ───

const MAX_UNIQUE_KEY_ITERATIONS = 50;

function randomSuffix(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

function toSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "_") // keep Hebrew + alphanumeric
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  // If the slug is empty or just the fallback "field" (e.g. emoji, Arabic,
  // Cyrillic input all collapse to nothing), append a random suffix so
  // concurrent creates don't all collide on the literal string "field".
  if (!slug || slug === "field") {
    return `field_${randomSuffix()}`;
  }
  return slug;
}

async function uniqueKey(workspaceId: string, entityType: string, name: string): Promise<string> {
  const base = toSlug(name);
  let key = base;
  let i = 1;
  while (i <= MAX_UNIQUE_KEY_ITERATIONS) {
    const existing = await prisma.customField.findUnique({
      where: { workspaceId_entityType_key: { workspaceId, entityType, key } },
    });
    if (!existing) return key;
    key = `${base}_${i++}`;
  }
  throw new AppError(
    500,
    "KEY_GENERATION_FAILED",
    `Failed to generate a unique key for field "${name}" after ${MAX_UNIQUE_KEY_ITERATIONS} attempts`,
  );
}

// ─── Field CRUD ───

export async function listFields(workspaceId: string, entityType: string) {
  return prisma.customField.findMany({
    where: { workspaceId, entityType },
    orderBy: { order: "asc" },
  });
}

export async function createField(
  workspaceId: string,
  data: {
    entityType: string;
    name: string;
    fieldType: string;
    options?: unknown;
    required?: boolean;
  },
) {
  const baseKey = await uniqueKey(workspaceId, data.entityType, data.name);

  // Get next order value
  const maxOrder = await prisma.customField.aggregate({
    where: { workspaceId, entityType: data.entityType },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const createPayload = {
    workspaceId,
    entityType: data.entityType,
    name: data.name,
    fieldType: data.fieldType,
    options: data.options as any,
    required: data.required ?? false,
    order,
  };

  // The uniqueness check above is read-then-write — two concurrent creates
  // can both pass and then race on INSERT, producing a Prisma P2002 unique
  // constraint violation. Retry up to 3 times with a random suffix on the
  // key to recover transparently.
  let key = baseKey;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.customField.create({
        data: { ...createPayload, key },
      });
    } catch (err: any) {
      if (err?.code === "P2002" && attempt < 3) {
        key = `${baseKey}_${randomSuffix()}`;
        continue;
      }
      throw err;
    }
  }

  // Should be unreachable — the loop above either returns or throws.
  throw new AppError(
    500,
    "KEY_GENERATION_FAILED",
    `Failed to create field "${data.name}" after multiple retries`,
  );
}

export async function updateField(
  workspaceId: string,
  fieldId: string,
  data: {
    name?: string;
    fieldType?: string;
    options?: unknown;
    required?: boolean;
    order?: number;
  },
) {
  const existing = await prisma.customField.findFirst({
    where: { id: fieldId, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Custom field not found");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
  if (data.options !== undefined) updateData.options = data.options as any;
  if (data.required !== undefined) updateData.required = data.required;
  if (data.order !== undefined) updateData.order = data.order;

  return prisma.customField.update({
    where: { id: fieldId },
    data: updateData,
  });
}

export async function deleteField(workspaceId: string, fieldId: string) {
  const result = await prisma.customField.deleteMany({
    where: { id: fieldId, workspaceId },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Custom field not found");
  }
  return { deleted: true };
}

export async function reorderFields(
  workspaceId: string,
  entityType: string,
  fieldIds: string[],
) {
  // Reject duplicate IDs up front — otherwise a caller could send the same
  // ID twice and collapse ordering.
  const uniqueIds = new Set(fieldIds);
  if (uniqueIds.size !== fieldIds.length) {
    throw new AppError(
      400,
      "INVALID_ORDER",
      "fieldIds contains duplicate entries",
    );
  }

  // Read the current set of fields inside the transaction and validate that
  // the caller's list matches the workspace's fields exactly. This prevents
  // a concurrent create from leaving a stray field with its original order
  // while the rest of the list is reshuffled.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.customField.findMany({
      where: { workspaceId, entityType },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((f) => f.id));

    if (existingIds.size !== uniqueIds.size) {
      throw new AppError(
        400,
        "INVALID_ORDER",
        `fieldIds count (${uniqueIds.size}) does not match workspace fields count (${existingIds.size})`,
      );
    }
    for (const id of uniqueIds) {
      if (!existingIds.has(id)) {
        throw new AppError(
          400,
          "INVALID_ORDER",
          `Field ${id} does not belong to this workspace/entityType`,
        );
      }
    }

    // Safe to update — scope every update to workspace+entityType for defence
    // in depth even though we just validated above.
    for (let index = 0; index < fieldIds.length; index++) {
      await tx.customField.updateMany({
        where: { id: fieldIds[index], workspaceId, entityType },
        data: { order: index },
      });
    }
  });

  return { success: true };
}

// ─── Field Values ───

export async function getValues(workspaceId: string, entityId: string) {
  return prisma.customFieldValue.findMany({
    where: { workspaceId, entityId },
    include: { field: true },
  });
}

export async function bulkUpdateValues(
  workspaceId: string,
  entityId: string,
  values: Array<{ fieldId: string; value: string | null }>,
) {
  // IDOR protection: verify every fieldId belongs to this workspace before upserting
  const fieldIds = [...new Set(values.map((v) => v.fieldId))];
  if (fieldIds.length === 0) return [];

  const validFields = await prisma.customField.findMany({
    where: { id: { in: fieldIds }, workspaceId },
    select: { id: true, entityType: true },
  });
  const validFieldIds = new Set(validFields.map((f) => f.id));
  const invalidIds = fieldIds.filter((id) => !validFieldIds.has(id));
  if (invalidIds.length > 0) {
    throw new AppError(
      403,
      "FORBIDDEN",
      `Field(s) do not belong to workspace: ${invalidIds.join(", ")}`,
    );
  }

  // All fields in a single bulk update must share the same entityType.
  // Otherwise we can't verify the entityId against exactly one table —
  // and allowing a mixed batch would let an attacker attach, e.g., a
  // deal field value to a contact row.
  const entityTypes = new Set(validFields.map((f) => f.entityType));
  if (entityTypes.size > 1) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "All fields in a bulk update must share the same entityType",
    );
  }
  const entityType = validFields[0].entityType;

  // IDOR protection: verify the entity exists in this workspace. Without
  // this check, an attacker with a valid fieldId could write custom-field
  // values against any entityId they can guess (cross-workspace or
  // non-existent), since the upsert uses (fieldId, entityId) as its unique
  // key without any FK constraint.
  let entityExists = false;
  if (entityType === "contact") {
    entityExists = !!(await prisma.contact.findFirst({
      where: { id: entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  } else if (entityType === "deal") {
    entityExists = !!(await prisma.deal.findFirst({
      where: { id: entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  } else if (entityType === "company") {
    entityExists = !!(await prisma.company.findFirst({
      where: { id: entityId, workspaceId, deletedAt: null },
      select: { id: true },
    }));
  }
  if (!entityExists) {
    throw new AppError(403, "FORBIDDEN", `Entity ${entityId} not found in workspace`);
  }

  const ops = values.map(({ fieldId, value }) =>
    prisma.customFieldValue.upsert({
      where: { fieldId_entityId: { fieldId, entityId } },
      create: {
        workspaceId,
        fieldId,
        entityId,
        value,
      },
      update: { value },
    }),
  );
  return prisma.$transaction(ops);
}
