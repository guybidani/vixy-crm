import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireRole } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import * as cfService from "../services/custom-fields.service";

export const customFieldsRouter = Router();

const uuidSchema = z.string().uuid();
function requireUuid(value: unknown, paramName: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, "INVALID_PARAM", `${paramName} must be a valid UUID`);
  }
  return result.data;
}

const ENTITY_TYPES = ["contact", "deal", "company"] as const;
const FIELD_TYPES = ["text", "number", "date", "select", "email", "phone", "url", "checkbox"] as const;

const optionSchema = z.object({
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  color: z.string().max(30).optional(),
});

const createSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  name: z.string().min(1).max(100),
  fieldType: z.enum(FIELD_TYPES),
  options: z.array(optionSchema).max(50).optional(),
  required: z.boolean().optional(),
}).refine(
  (data) => data.fieldType !== "select" || (data.options && data.options.length > 0),
  { message: "Select fields must have at least one option", path: ["options"] },
);

// NOTE: `fieldType` is intentionally omitted — type is immutable after creation
// to protect existing stored values. To change type, delete & recreate the field.
const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  options: z.array(optionSchema).max(50).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  fieldIds: z.array(z.string().uuid()).max(100),
});

const bulkValuesSchema = z.object({
  values: z.array(z.object({
    fieldId: z.string().uuid(),
    value: z.string().nullable(),
  })).max(100),
});

// ─── Field CRUD ───

// GET /custom-fields?entityType=contact
customFieldsRouter.get("/", async (req, res, next) => {
  try {
    const entityType = req.query.entityType as string;
    if (!ENTITY_TYPES.includes(entityType as any)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "entityType must be contact, deal, or company" },
      });
    }
    const fields = await cfService.listFields(req.workspaceId!, entityType);
    res.json(fields);
  } catch (err) {
    next(err);
  }
});

// POST /custom-fields — OWNER or ADMIN only (mutates workspace schema)
customFieldsRouter.post("/", requireRole("OWNER", "ADMIN"), validate(createSchema), async (req, res, next) => {
  try {
    const field = await cfService.createField(req.workspaceId!, req.body);
    res.status(201).json(field);
  } catch (err) {
    next(err);
  }
});

// PATCH /custom-fields/reorder — OWNER or ADMIN only (mutates workspace schema)
customFieldsRouter.patch("/reorder", requireRole("OWNER", "ADMIN"), validate(reorderSchema), async (req, res, next) => {
  try {
    const result = await cfService.reorderFields(
      req.workspaceId!,
      req.body.entityType,
      req.body.fieldIds,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /custom-fields/:id — OWNER or ADMIN only (mutates workspace schema)
customFieldsRouter.patch("/:id", requireRole("OWNER", "ADMIN"), validate(updateSchema), async (req, res, next) => {
  try {
    const field = await cfService.updateField(req.workspaceId!, requireUuid(req.params.id, "id"), req.body);
    res.json(field);
  } catch (err) {
    next(err);
  }
});

// DELETE /custom-fields/:id — OWNER or ADMIN only (mutates workspace schema)
customFieldsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const result = await cfService.deleteField(req.workspaceId!, requireUuid(req.params.id, "id"));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Field Values ───

// GET /custom-fields/values/:entityId
customFieldsRouter.get("/values/:entityId", async (req, res, next) => {
  try {
    const values = await cfService.getValues(req.workspaceId!, requireUuid(req.params.entityId, "entityId"));
    res.json(values);
  } catch (err) {
    next(err);
  }
});

// PATCH /custom-fields/values/:entityId
customFieldsRouter.patch("/values/:entityId", validate(bulkValuesSchema), async (req, res, next) => {
  try {
    const result = await cfService.bulkUpdateValues(
      req.workspaceId!,
      requireUuid(req.params.entityId, "entityId"),
      req.body.values,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
