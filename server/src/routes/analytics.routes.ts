import { Router } from "express";
import * as analyticsService from "../services/analytics.service";

export const analyticsRouter = Router();

function parseDateRange(req: { query: { from?: string; to?: string } }) {
  const now = new Date();
  const from = req.query.from
    ? new Date(req.query.from as string)
    : new Date(now.getFullYear(), now.getMonth(), 1); // Default: start of current month
  const to = req.query.to ? new Date(req.query.to as string) : now;
  return { from, to };
}

analyticsRouter.get("/activity-breakdown", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const data = await analyticsService.getActivityBreakdown(req.workspaceId!, from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/deal-funnel", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const data = await analyticsService.getDealConversionFunnel(req.workspaceId!, from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/task-completion", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const data = await analyticsService.getTaskCompletionRate(req.workspaceId!, from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/contact-growth", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const data = await analyticsService.getContactGrowth(req.workspaceId!, from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/top-performers", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const data = await analyticsService.getTopPerformers(req.workspaceId!, from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
