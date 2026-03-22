import { Router } from "express";
import * as searchService from "../services/search.service";

export const searchRouter = Router();

// GET /api/v1/search?q=...
searchRouter.get("/", async (req, res, next) => {
  try {
    const query = (req.query.q as string) || "";
    const results = await searchService.globalSearch(req.workspaceId!, query);
    res.json(results);
  } catch (err) {
    next(err);
  }
});
