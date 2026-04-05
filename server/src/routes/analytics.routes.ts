import { Router } from "express";
import * as analyticsService from "../services/analytics.service";

export const analyticsRouter = Router();

function parseDateRange(req: { query: { from?: string; to?: string } }) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = now;

  const fromRaw = req.query.from ? new Date(req.query.from as string) : defaultFrom;
  let toRaw = req.query.to ? new Date(req.query.to as string) : defaultTo;

  let from = isNaN(fromRaw.getTime()) ? defaultFrom : fromRaw;
  let to = isNaN(toRaw.getTime()) ? defaultTo : toRaw;

  // When an explicit date string (YYYY-MM-DD) is provided without time,
  // new Date('2026-03-29') resolves to midnight (start of day).
  // For "from", this is correct (start of day).
  // For "to", this silently excludes all data from that day — set to end-of-day.
  if (req.query.to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to as string)) {
    to = new Date(to);
    to.setHours(23, 59, 59, 999);
  }

  // When "from" is after "to", swap them so the caller doesn't silently get
  // empty results.  This can happen when the client picks a custom date range
  // and accidentally sends the values in wrong order.
  if (from > to) {
    const tmp = from;
    from = to;
    to = tmp;
  }

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

analyticsRouter.get("/deal-growth", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const data = await analyticsService.getDealGrowth(req.workspaceId!, from, to);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/lead-sources", async (req, res, next) => {
  try {
    const data = await analyticsService.getLeadSources(req.workspaceId!);
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
