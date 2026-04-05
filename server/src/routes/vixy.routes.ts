import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { validate } from "../middleware/validate";
import { prisma } from "../db/client";
import { config } from "../config";

export const vixyRouter = Router();
export const vixyWebhookRouter = Router();

// ─── Webhook: Vixy sends lead data when an ad converts ───
// POST /api/v1/vixy/webhook
// Auth: HMAC-SHA256 signature in X-Vixy-Signature header
// NOTE: This route is mounted BEFORE requireAuth in routes/index.ts
const webhookSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  lead: z.object({
    firstName: z.string(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Verify the HMAC-SHA256 signature on incoming Vixy webhooks.
 * Rejects requests if VIXY_WEBHOOK_SECRET is not configured or signature is invalid.
 */
function verifyVixySignature(
  body: string,
  signature: string | undefined,
): boolean {
  const secret = config.vixy.webhookSecret;
  if (!secret) return false;
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

vixyWebhookRouter.post("/", validate(webhookSchema), async (req, res, next) => {
  try {
    // Verify webhook signature using the original raw body (not re-serialized)
    const signature = req.headers["x-vixy-signature"] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (!verifyVixySignature(rawBody, signature)) {
      return res.status(401).json({
        error: {
          code: "INVALID_SIGNATURE",
          message: "Invalid webhook signature",
        },
      });
    }

    // Placeholder response — TODO: look up workspace by API key, create contact
    res.status(200).json({
      received: true,
      message: "Webhook received - integration pending",
      data: {
        campaignId: req.body.campaignId,
        leadName: req.body.lead.firstName,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Link a Vixy campaign to a contact/deal ───
// POST /api/v1/vixy/campaigns/link
const linkSchema = z.object({
  vixyCampaignId: z.string(),
  campaignName: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

vixyRouter.post(
  "/campaigns/link",
  validate(linkSchema),
  async (req, res, next) => {
    try {
      // Validate FK references belong to this workspace (prevent BOLA)
      const [contactRef, dealRef] = await Promise.all([
        req.body.contactId
          ? prisma.contact.findFirst({ where: { id: req.body.contactId, workspaceId: req.workspaceId! }, select: { id: true } })
          : null,
        req.body.dealId
          ? prisma.deal.findFirst({ where: { id: req.body.dealId, workspaceId: req.workspaceId! }, select: { id: true } })
          : null,
      ]);
      if (req.body.contactId && !contactRef) {
        return res.status(400).json({
          error: { code: "INVALID_REFERENCE", message: "Contact not found in workspace" },
        });
      }
      if (req.body.dealId && !dealRef) {
        return res.status(400).json({
          error: { code: "INVALID_REFERENCE", message: "Deal not found in workspace" },
        });
      }

      const link = await prisma.vixyCampaignLink.create({
        data: {
          workspaceId: req.workspaceId!,
          vixyCampaignId: req.body.vixyCampaignId,
          vixyCampaignName: req.body.campaignName,
          contactId: req.body.contactId || null,
          dealId: req.body.dealId || null,
          metadata: req.body.metadata || {},
        },
      });
      res.status(201).json(link);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Get linked campaigns for a contact ───
// GET /api/v1/vixy/campaigns?contactId=...
vixyRouter.get("/campaigns", async (req, res, next) => {
  try {
    const { contactId, dealId } = req.query;
    const where: any = { workspaceId: req.workspaceId! };
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;

    const links = await prisma.vixyCampaignLink.findMany({
      where,
      orderBy: { syncedAt: "desc" },
      take: 200,
    });
    res.json(links);
  } catch (err) {
    next(err);
  }
});

// ─── Delete a campaign link ───
// DELETE /api/v1/vixy/campaigns/:id
vixyRouter.delete("/campaigns/:id", async (req, res, next) => {
  try {
    const link = await prisma.vixyCampaignLink.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!link) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Campaign link not found" },
      });
    }
    await prisma.vixyCampaignLink.delete({
      where: { id: req.params.id },
    });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
