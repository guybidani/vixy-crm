import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

// ─── Slug Generation ───

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "_") // keep Hebrew + alphanumeric
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "field";
}

async function uniqueKey(workspaceId: string, entityType: string, name: string): Promise<string> {
  let base = toSlug(name);
  let key = base;
  let i = 1;
  while (true) {
    const existing = await prisma.customField.findUnique({
      where: { workspaceId_entityType_key: { workspaceId, entityType, key } },
    });
    if (!existing) return key;
    key = `${base}_${i++}`;
  }
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
  const key = await uniqueKey(workspaceId, data.entityType, data.name);

  // Get next order value
  const maxOrder = await prisma.customField.aggregate({
    where: { workspaceId, entityType: data.entityType },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  return prisma.customField.create({
    data: {
      workspaceId,
      entityType: data.entityType,
      name: data.name,
      key,
      fieldType: data.fieldType,
      options: data.options as any,
      required: data.required ?? false,
      order,
    },
  });
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
  const updates = fieldIds.map((id, index) =>
    prisma.customField.updateMany({
      where: { id, workspaceId, entityType },
      data: { order: index },
    }),
  );
  await prisma.$transaction(updates);
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
