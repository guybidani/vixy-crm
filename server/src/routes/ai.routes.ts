import { Router } from "express";
import * as aiService from "../services/ai.service";
import { z } from "zod";
import { validate } from "../middleware/validate";

export const aiRouter = Router();

// GET /api/v1/ai/health — Check if AI is available
aiRouter.get("/health", async (_req, res, next) => {
  try {
    const health = await aiService.checkHealth();
    res.json(health);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/ai/summarize-contact/:id — Generate contact summary
aiRouter.post("/summarize-contact/:id", async (req, res, next) => {
  try {
    const { messages } = await aiService.summarizeContact(
      req.workspaceId!,
      req.params.id as string,
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      for await (const chunk of aiService.chatCompletionStream(messages)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message || "AI לא זמין" })}\n\n`);
    }

    res.end();
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/ai/score-deal/:id — Score a deal
aiRouter.post("/score-deal/:id", async (req, res, next) => {
  try {
    const { messages } = await aiService.scoreDeal(
      req.workspaceId!,
      req.params.id as string,
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      for await (const chunk of aiService.chatCompletionStream(messages)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message || "AI לא זמין" })}\n\n`);
    }

    res.end();
  } catch (err) {
    next(err);
  }
});

const draftEmailSchema = z.object({
  context: z.string().optional(),
});

// POST /api/v1/ai/draft-email/:contactId — Generate email draft
aiRouter.post("/draft-email/:contactId", validate(draftEmailSchema), async (req, res, next) => {
  try {
    const { messages } = await aiService.draftEmail(
      req.workspaceId!,
      req.params.contactId as string,
      req.body.context,
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      for await (const chunk of aiService.chatCompletionStream(messages)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message || "AI לא זמין" })}\n\n`);
    }

    res.end();
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/ai/suggest-action/:contactId — Suggest next action
aiRouter.post("/suggest-action/:contactId", async (req, res, next) => {
  try {
    const { messages } = await aiService.suggestAction(
      req.workspaceId!,
      req.params.contactId as string,
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      for await (const chunk of aiService.chatCompletionStream(messages)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message || "AI לא זמין" })}\n\n`);
    }

    res.end();
  } catch (err) {
    next(err);
  }
});
