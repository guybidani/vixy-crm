import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";
import * as importService from "../services/import.service";
import type {
  DuplicateStrategy,
  EntityType,
} from "../services/import.service";
import fs from "fs";

export const importRouter = Router();

function readAndCleanup(filePath: string): Buffer {
  try {
    return fs.readFileSync(filePath);
  } finally {
    fs.unlink(filePath, () => {});
  }
}

/**
 * POST /import/preview
 * Accepts multipart CSV file, returns headers + first 5 rows + row count.
 */
importRouter.post(
  "/preview",
  requireRole("OWNER", "ADMIN"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "No file uploaded" },
        });
      }

      const buffer = readAndCleanup(req.file.path);
      const result = importService.previewImport(buffer);

      if (result.headers.length === 0) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "CSV file is empty" },
        });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /import/execute
 * Unified endpoint — accepts JSON body with entityType, columnMapping, data, duplicateStrategy.
 * Preferred for frontend wizard.
 */
importRouter.post(
  "/execute",
  requireRole("OWNER", "ADMIN"),
  async (req, res, next) => {
    try {
      const {
        entityType,
        columnMapping,
        data,
        headers,
        duplicateStrategy = "skip",
      } = req.body as {
        entityType: EntityType;
        columnMapping: Record<string, string>;
        data: Array<Record<string, string>> | string[][];
        headers?: string[];
        duplicateStrategy?: DuplicateStrategy;
      };

      if (
        !entityType ||
        !["contact", "deal", "company"].includes(entityType)
      ) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "entityType must be contact, deal, or company",
          },
        });
      }
      if (!columnMapping || typeof columnMapping !== "object") {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "columnMapping required" },
        });
      }
      if (!Array.isArray(data)) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "data must be an array" },
        });
      }

      // Normalize data to string[][] form + derive headers
      let resolvedHeaders: string[];
      let rows: string[][];

      if (data.length > 0 && Array.isArray(data[0])) {
        rows = data as string[][];
        resolvedHeaders = headers || Object.keys(columnMapping);
      } else {
        // Object form: derive headers from keys of first row + columnMapping
        const objData = data as Array<Record<string, string>>;
        const headerSet = new Set<string>();
        for (const k of Object.keys(columnMapping)) headerSet.add(k);
        if (objData[0]) {
          for (const k of Object.keys(objData[0])) headerSet.add(k);
        }
        resolvedHeaders = headers || Array.from(headerSet);
        rows = objData.map((obj) =>
          resolvedHeaders.map((h) => (obj[h] ?? "").toString()),
        );
      }

      const result = await importService.executeImport(
        req.workspaceId!,
        req.memberId!,
        entityType,
        columnMapping,
        rows,
        resolvedHeaders,
        duplicateStrategy,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Shared handler for entity-specific file-upload import endpoints.
 * Keeps backwards compat with the file+mapping multipart flow.
 */
function fileImportHandler(entityType: EntityType) {
  return async (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "No file uploaded" },
        });
      }

      const buffer = readAndCleanup(req.file.path);
      const { headers, rows } = importService.parseCSV(buffer);

      if (headers.length === 0) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "CSV file is empty" },
        });
      }

      let mapping: Record<string, string>;
      try {
        mapping =
          typeof req.body.mapping === "string"
            ? JSON.parse(req.body.mapping)
            : req.body.mapping;
      } catch {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "Invalid mapping JSON" },
        });
      }

      const duplicateStrategy =
        (req.body.duplicateStrategy as DuplicateStrategy) || "skip";

      const result = await importService.executeImport(
        req.workspaceId!,
        req.memberId!,
        entityType,
        mapping,
        rows,
        headers,
        duplicateStrategy,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

importRouter.post(
  "/contacts",
  requireRole("OWNER", "ADMIN"),
  upload.single("file"),
  fileImportHandler("contact"),
);

importRouter.post(
  "/companies",
  requireRole("OWNER", "ADMIN"),
  upload.single("file"),
  fileImportHandler("company"),
);

importRouter.post(
  "/deals",
  requireRole("OWNER", "ADMIN"),
  upload.single("file"),
  fileImportHandler("deal"),
);
