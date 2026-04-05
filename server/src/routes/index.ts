import { Router } from "express";
import { authRouter } from "./auth.routes";
import { contactsRouter } from "./contacts.routes";
import { companiesRouter } from "./companies.routes";
import { dealsRouter } from "./deals.routes";
import { tasksRouter } from "./tasks.routes";
import { activitiesRouter } from "./activities.routes";
import { ticketsRouter } from "./tickets.routes";
import { knowledgeRouter } from "./knowledge.routes";
import { cannedRouter } from "./canned.routes";
import { templatesRouter } from "./templates.routes";
import { slaRouter } from "./sla.routes";
import { dashboardRouter } from "./dashboard.routes";
import { vixyRouter, vixyWebhookRouter } from "./vixy.routes";
import { kolioWebhookRouter } from "./kolio.routes";
import { followupRouter } from "./followup.routes";
import { documentRouter } from "./document.routes";
import { boardsRouter } from "./boards.routes";
import { automationRouter } from "./automation.routes";
import { notificationRouter } from "./notification.routes";
import { settingsRouter } from "./settings.routes";
import { tagsRouter } from "./tags.routes";
import { searchRouter } from "./search.routes";
import { exportRouter } from "./export.routes";
import { calendarRouter } from "./calendar.routes";
import { analyticsRouter } from "./analytics.routes";
import { viewsRouter } from "./views.routes";
import { importRouter } from "./import.routes";
import { aiRouter } from "./ai.routes";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import { checkNavPermission } from "../middleware/navPermission";

export const router = Router();

// Public routes (no auth required)
router.use("/auth", authRouter);
router.use("/vixy/webhook", vixyWebhookRouter); // Webhook uses HMAC signature auth, not JWT
router.use("/kolio/webhook", kolioWebhookRouter); // Kolio call analysis webhook, HMAC auth

// Protected routes (require auth + workspace membership)
router.use(requireAuth);
router.use(requireWorkspace);
router.use(checkNavPermission);

// Domain routes
router.use("/contacts", contactsRouter);
router.use("/companies", companiesRouter);
router.use("/deals", dealsRouter);
router.use("/tasks", tasksRouter);
router.use("/activities", activitiesRouter);
router.use("/tickets", ticketsRouter);
router.use("/kb", knowledgeRouter);
router.use("/canned-responses", cannedRouter);
router.use("/templates", templatesRouter);
router.use("/sla-policies", slaRouter);
router.use("/dashboard", dashboardRouter);
router.use("/vixy", vixyRouter); // Non-webhook Vixy routes (require auth)
router.use("/follow-up", followupRouter);
router.use("/documents", documentRouter);
router.use("/boards", boardsRouter);
router.use("/automations", automationRouter);
router.use("/notifications", notificationRouter);
router.use("/settings", settingsRouter);
router.use("/tags", tagsRouter);
router.use("/search", searchRouter);
router.use("/export", exportRouter);
router.use("/calendar", calendarRouter);
router.use("/analytics", analyticsRouter);
router.use("/views", viewsRouter);
router.use("/import", importRouter);
router.use("/ai", aiRouter);
// router.use('/smart-views', smartViewsRouter);
