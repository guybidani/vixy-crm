import { Router } from "express";
import * as dashboardService from "../services/dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardStats(req.workspaceId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
