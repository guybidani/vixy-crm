import { Worker } from "bullmq";
import { redisConnection } from "./connection";
import { prisma } from "../db/client";
import type { Server as SocketServer } from "socket.io";
import { logger } from "../lib/logger";

let ioRef: SocketServer | null = null;

export function setWorkerIO(io: SocketServer) {
  ioRef = io;
}

export const followUpWorker = new Worker(
  "followup-checker",
  async () => {
    await checkDueExecutions();
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

followUpWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Follow-up job failed");
});

async function checkDueExecutions() {
  const now = new Date();

  const dueExecutions = await prisma.followUpExecution.findMany({
    where: {
      status: "ACTIVE",
      nextRunAt: { lte: now },
    },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      contact: true,
    },
  });

  for (const execution of dueExecutions) {
    try {
      await executeStep(execution);
    } catch (err) {
      logger.error({ executionId: execution.id, err }, "Error executing follow-up step");
    }
  }
}

async function executeStep(execution: any) {
  const { sequence, contact } = execution;
  const steps = sequence.steps;

  // Check if contact had any activity since last step (response detection)
  if (execution.lastStepAt) {
    const recentActivity = await prisma.activity.findFirst({
      where: {
        contactId: contact.id,
        createdAt: { gt: execution.lastStepAt },
        type: { in: ["CALL", "EMAIL", "WHATSAPP", "MEETING"] },
      },
    });

    if (recentActivity) {
      // Contact responded! Stop the sequence.
      await prisma.followUpExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      emitUpdate(execution.workspaceId, execution.contactId, "responded");
      return;
    }
  }

  // Get the current step
  const currentStep = steps.find(
    (s: any) => s.stepNumber === execution.currentStep + 1,
  );

  if (!currentStep) {
    // No more steps — execute end action
    await handleEndAction(execution);
    return;
  }

  // Execute the step based on channel
  switch (currentStep.channel) {
    case "EMAIL":
    case "WHATSAPP":
    case "SMS": {
      // Create an activity log (actual sending is a placeholder)
      const channelLabel =
        currentStep.channel === "EMAIL"
          ? "אימייל"
          : currentStep.channel === "WHATSAPP"
            ? "WhatsApp"
            : "SMS";

      const messageBody = currentStep.messageTemplate
        ? currentStep.messageTemplate
            .replace(/\{\{firstName\}\}/g, contact.firstName)
            .replace(/\{\{lastName\}\}/g, contact.lastName)
            .replace(
              /\{\{fullName\}\}/g,
              `${contact.firstName} ${contact.lastName}`,
            )
        : `מעקב אוטומטי - ${channelLabel}`;

      // Find a workspace member to attribute the activity to
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: execution.workspaceId },
      });

      if (member) {
        await prisma.activity.create({
          data: {
            workspaceId: execution.workspaceId,
            type:
              currentStep.channel === "WHATSAPP"
                ? "WHATSAPP"
                : currentStep.channel === "EMAIL"
                  ? "EMAIL"
                  : "SYSTEM",
            subject: `מעקב אוטומטי (שלב ${currentStep.stepNumber}) - ${channelLabel}`,
            body: messageBody,
            contactId: contact.id,
            memberId: member.id,
            metadata: {
              followUpExecutionId: execution.id,
              followUpSequenceId: execution.sequenceId,
              stepNumber: currentStep.stepNumber,
              channel: currentStep.channel,
              automated: true,
            },
          },
        });
      }
      break;
    }
    case "CALL_TASK": {
      // Create a task for the team to call the contact
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: execution.workspaceId },
      });

      if (member) {
        await prisma.task.create({
          data: {
            workspaceId: execution.workspaceId,
            title: `התקשר ל-${contact.firstName} ${contact.lastName} (מעקב אוטומטי)`,
            description: `שלב ${currentStep.stepNumber} בסדרת מעקב "${sequence.name}"`,
            status: "TODO",
            priority: "HIGH",
            dueDate: new Date(),
            contactId: contact.id,
            assigneeId: member.id,
            createdById: member.id,
          },
        });
      }
      break;
    }
  }

  // Advance to the next step
  const nextCurrentStep = execution.currentStep + 1;
  const nextStep = steps.find((s: any) => s.stepNumber === nextCurrentStep + 1);
  const now = new Date();

  await prisma.followUpExecution.update({
    where: { id: execution.id },
    data: {
      currentStep: nextCurrentStep,
      lastStepAt: now,
      nextRunAt: nextStep
        ? new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000)
        : null,
    },
  });

  emitUpdate(execution.workspaceId, execution.contactId, "step-executed");

  // If no more steps, execute end action
  if (!nextStep) {
    await handleEndAction(execution);
  }
}

async function handleEndAction(execution: any) {
  const { sequence, contact } = execution;

  if (sequence.endAction === "MOVE_INACTIVE") {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: "INACTIVE" },
    });
  } else if (sequence.endAction === "MOVE_CHURNED") {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: "CHURNED" },
    });
  }

  await prisma.followUpExecution.update({
    where: { id: execution.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      nextRunAt: null,
    },
  });

  emitUpdate(execution.workspaceId, execution.contactId, "sequence-completed");
}

function emitUpdate(workspaceId: string, contactId: string, event: string) {
  if (ioRef) {
    ioRef
      .to(`workspace:${workspaceId}`)
      .emit("followup:update", { contactId, event });
  }
}
