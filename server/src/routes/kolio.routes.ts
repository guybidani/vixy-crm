import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../db/client";
import { config } from "../config";

export const kolioWebhookRouter = Router();

// ─── Kolio Webhook: receives call analysis and creates CALL activity ───
// POST /api/v1/kolio/webhook
// Auth: HMAC-SHA256 signature in X-Kolio-Signature header
// NOTE: This route is mounted BEFORE requireAuth in routes/index.ts

const kolioWebhookSchema = z.object({
  workspaceId: z.string(),
  call: z.object({
    id: z.string(),
    repName: z.string().optional(),
    callerNumber: z.string().optional(),
    calledNumber: z.string().optional(),
    direction: z.enum(["INBOUND", "OUTBOUND", "UNKNOWN"]).optional(),
    duration: z.number().optional(),
    recordedAt: z.string().optional(),
    callType: z.string().optional(),
  }),
  analysis: z.object({
    overallScore: z.number().nullable().optional(),
    scores: z.record(z.number()).optional(),
    summary: z.string().optional(),
    prospectName: z.string().optional(),
    prospectBusiness: z.string().optional(),
    coachingTips: z.unknown().optional(),
    objections: z.unknown().optional(),
    retentionPoints: z.unknown().optional(),
    improvementPoints: z.unknown().optional(),
    buyingSignals: z.unknown().optional(),
    nextCallPrep: z.unknown().optional(),
    talkRatioRep: z.number().nullable().optional(),
    talkRatioCustomer: z.number().nullable().optional(),
  }),
  // Optional: match to a CRM contact by phone number
  contactPhone: z.string().optional(),
});

function verifyKolioSignature(
  body: string,
  signature: string | undefined
): boolean {
  const secret = config.kolio?.webhookSecret;
  if (!secret) return false;
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

kolioWebhookRouter.post("/", async (req, res, next) => {
  try {
    // Verify webhook signature
    const signature = req.headers["x-kolio-signature"] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (!verifyKolioSignature(rawBody, signature)) {
      return res.status(401).json({
        error: {
          code: "INVALID_SIGNATURE",
          message: "Invalid webhook signature",
        },
      });
    }

    // Validate body
    const parsed = kolioWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid payload",
          details: parsed.error.flatten(),
        },
      });
    }

    const { workspaceId, call, analysis, contactPhone } = parsed.data;

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Workspace not found" },
      });
    }

    // Get the first admin member as the activity author (system integration)
    const systemMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: "OWNER" },
    });
    if (!systemMember) {
      return res.status(400).json({
        error: { code: "NO_OWNER", message: "Workspace has no owner member" },
      });
    }

    // Try to match contact by phone number
    let contactId: string | undefined;
    if (contactPhone) {
      const normalizedPhone = contactPhone.replace(/[^0-9+]/g, "");
      const contact = await prisma.contact.findFirst({
        where: {
          workspaceId,
          phone: { contains: normalizedPhone.slice(-9) }, // Match last 9 digits
        },
      });
      if (contact) {
        contactId = contact.id;
      }
    }

    // Build activity subject and body
    const score = analysis.overallScore != null ? ` (${analysis.overallScore}/10)` : "";
    const repLabel = call.repName || "נציג";
    const prospect = analysis.prospectName || call.callerNumber || "לא ידוע";

    const subject = `ניתוח שיחה: ${repLabel} → ${prospect}${score}`;

    // Build readable Hebrew body from the analysis
    const bodyParts: string[] = [];
    if (analysis.summary) bodyParts.push(`📋 ${analysis.summary}`);
    if (analysis.overallScore != null) bodyParts.push(`⭐ ציון כולל: ${analysis.overallScore}/10`);
    if (analysis.scores) {
      const scoreLabels: Record<string, string> = {
        discovery: "דיסקברי",
        objection_handling: "טיפול בהתנגדויות",
        closing: "סגירה",
        rapport: "ראפור",
        value_communication: "העברת ערך",
      };
      const scoreLines = Object.entries(analysis.scores)
        .filter(([k]) => k !== "overall")
        .map(([k, v]) => `${scoreLabels[k] || k}: ${v}/10`)
        .join(" | ");
      if (scoreLines) bodyParts.push(`📊 ${scoreLines}`);
    }
    if (call.duration) {
      const mins = Math.round(call.duration / 60);
      bodyParts.push(`⏱️ משך: ${mins} דקות`);
    }

    const body = bodyParts.join("\n");

    // Create the activity — use JSON roundtrip to ensure Prisma-compatible types
    const metadata = JSON.parse(JSON.stringify({
      source: "kolio",
      kolioCallId: call.id,
      repName: call.repName,
      direction: call.direction,
      callType: call.callType,
      recordedAt: call.recordedAt,
      analysis: {
        overallScore: analysis.overallScore,
        scores: analysis.scores,
        summary: analysis.summary,
        prospectName: analysis.prospectName,
        prospectBusiness: analysis.prospectBusiness,
        coachingTips: analysis.coachingTips,
        objections: analysis.objections,
        retentionPoints: analysis.retentionPoints,
        improvementPoints: analysis.improvementPoints,
        buyingSignals: analysis.buyingSignals,
        nextCallPrep: analysis.nextCallPrep,
        talkRatioRep: analysis.talkRatioRep,
        talkRatioCustomer: analysis.talkRatioCustomer,
      },
    }));

    const activity = await prisma.activity.create({
      data: {
        workspaceId,
        memberId: systemMember.id,
        type: "CALL",
        subject,
        body,
        contactId: contactId || null,
        metadata,
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      received: true,
      activityId: activity.id,
      contactMatched: !!contactId,
    });
  } catch (err) {
    next(err);
  }
});
