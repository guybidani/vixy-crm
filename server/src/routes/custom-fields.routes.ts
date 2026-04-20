import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as cfService from "../services/custom-fields.service";

export const customFieldsRouter = Router();

const ENTITY_TYPES = ["contact", "deal", "company"] as const;
const FIELD_TYPES = ["text", "number", "date", "select", "email", "phone", "url", "checkbox"] as const;

const createSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  name: z.string().min(1).max(100),
  fieldType: z.enum(FIELD_TYPES),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    color: z.string().optional(),
  })).optional(),
  required: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldType: z.enum(FIELD_TYPES).optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    color: z.string().optional(),
  })).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  fieldIds: z.array(z.string().uuid()),
});

const bulkValuesSchema = z.object({
  values: z.array(z.object({
    fieldId: z.string().uuid(),
    value: z.string().nullable(),
  })),
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

// POST /custom-fields
customFieldsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const field = await cfService.createField(req.workspaceId!, req.body);
    res.status(201).json(field);
  } catch (err) {
    next(err);
  }
});

// PATCH /custom-fields/reorder
customFieldsRouter.patch("/reorder", validate(reorderSchema), async (req, res, next) => {
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

// PATCH /custom-fields/:id
customFieldsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const field = await cfService.updateField(req.workspaceId!, req.params.id as string, req.body);
    res.json(field);
  } catch (err) {
    next(err);
  }
});

// DELETE /custom-fields/:id
customFieldsRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await cfService.deleteField(req.workspaceId!, req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Field Values ───

// GET /custom-fields/values/:entityId
customFieldsRouter.get("/values/:entityId", async (req, res, next) => {
  try {
    const values = await cfService.getValues(req.workspaceId!, req.params.entityId as string);
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
      req.params.entityId as string,
      req.body.values,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});
