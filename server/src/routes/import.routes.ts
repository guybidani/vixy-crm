import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";
import * as importService from "../services/import.service";
import fs from "fs";

export const importRouter = Router();

/**
 * POST /import/preview
 * Upload a CSV file, get headers + first 5 rows for mapping.
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

      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(req.file.path);
      } finally {
        // Always clean up temp file — even if readFileSync throws (unlikely)
        fs.unlink(req.file.path, () => {});
      }

      const { headers, rows } = importService.parseCSV(buffer);

      if (headers.length === 0) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "CSV file is empty" },
        });
      }

      res.json({
        headers,
        preview: rows.slice(0, 5),
        totalRows: rows.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /import/contacts
 * Upload CSV + mapping, import contacts.
 */
importRouter.post(
  "/contacts",
  requireRole("OWNER", "ADMIN"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "No file uploaded" },
        });
      }

      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(req.file.path);
      } finally {
        fs.unlink(req.file.path, () => {});
      }

      const { headers, rows } = importService.parseCSV(buffer);
      if (headers.length === 0) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "CSV file is empty" },
        });
      }

      // mapping comes as JSON string in multipart form
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

      const result = await importService.importContacts(
        req.workspaceId!,
        req.memberId!,
        rows,
        mapping,
        headers,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /import/deals
 * Upload CSV + mapping, import deals.
 */
importRouter.post(
  "/deals",
  requireRole("OWNER", "ADMIN"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: { code: "BAD_REQUEST", message: "No file uploaded" },
        });
      }

      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(req.file.path);
      } finally {
        fs.unlink(req.file.path, () => {});
      }

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

      const result = await importService.importDeals(
        req.workspaceId!,
        req.memberId!,
        rows,
        mapping,
        headers,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
