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
import { slaRouter } from "./sla.routes";
import { dashboardRouter } from "./dashboard.routes";
import { vixyRouter } from "./vixy.routes";
import { followupRouter } from "./followup.routes";
import { documentRouter } from "./document.routes";
import { boardsRouter } from "./boards.routes";
import { automationRouter } from "./automation.routes";
import { notificationRouter } from "./notification.routes";
import { requireAuth, requireWorkspace } from "../middleware/auth";

export const router = Router();

// Public routes (no auth required)
router.use("/auth", authRouter);
router.use("/vixy/webhook", vixyRouter); // Webhook uses HMAC signature auth, not JWT

// Protected routes (require auth + workspace membership)
router.use(requireAuth);
router.use(requireWorkspace);

// Domain routes
router.use("/contacts", contactsRouter);
router.use("/companies", companiesRouter);
router.use("/deals", dealsRouter);
router.use("/tasks", tasksRouter);
router.use("/activities", activitiesRouter);
router.use("/tickets", ticketsRouter);
router.use("/kb", knowledgeRouter);
router.use("/canned-responses", cannedRouter);
router.use("/sla-policies", slaRouter);
router.use("/dashboard", dashboardRouter);
router.use("/vixy", vixyRouter); // Non-webhook Vixy routes (require auth)
router.use("/follow-up", followupRouter);
router.use("/documents", documentRouter);
router.use("/boards", boardsRouter);
router.use("/automations", automationRouter);
router.use("/notifications", notificationRouter);
// router.use('/tags', tagsRouter);
// router.use('/smart-views', smartViewsRouter);
