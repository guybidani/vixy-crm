import { Router } from "express";
import * as exportService from "../services/export.service";

export const exportRouter = Router();

const VALID_ENTITIES = ["contacts", "deals", "companies", "tasks", "tickets"];

// GET /api/v1/export/:entity
exportRouter.get("/:entity", async (req, res, next) => {
  try {
    const entity = req.params.entity as string;
    if (!VALID_ENTITIES.includes(entity)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid entity type" },
      });
    }

    const { csv, truncated } = await exportService.exportCsv(req.workspaceId!, entity as any, {
      status: req.query.status as string,
      search: req.query.search as string,
    });

    const filename = `${entity}_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    if (truncated) {
      res.setHeader("X-Export-Truncated", "true");
      res.setHeader("X-Export-Max-Rows", "10000");
    }
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
