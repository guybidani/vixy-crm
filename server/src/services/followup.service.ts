import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export async function listSequences(workspaceId: string) {
  return prisma.followUpSequence.findMany({
    where: { workspaceId },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSequence(workspaceId: string, id: string) {
  const seq = await prisma.followUpSequence.findFirst({
    where: { id, workspaceId },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { executions: true } },
    },
  });
  if (!seq) throw new AppError(404, "NOT_FOUND", "Sequence not found");
  return seq;
}

export async function createSequence(
  workspaceId: string,
  data: {
    name: string;
    description?: string;
    triggerStatuses: string[];
    endAction?: string;
    steps: Array<{
      stepNumber: number;
      delayDays: number;
      channel: string;
      messageTemplate?: string;
    }>;
  },
) {
  return prisma.followUpSequence.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      triggerStatuses: data.triggerStatuses as any,
      endAction: data.endAction || "MOVE_INACTIVE",
      steps: {
        create: data.steps.map((s) => ({
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          channel: s.channel as any,
          messageTemplate: s.messageTemplate,
        })),
      },
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });
}

export async function updateSequence(
  workspaceId: string,
  id: string,
  data: {
    name?: string;
    description?: string;
    triggerStatuses?: string[];
    endAction?: string;
    steps?: Array<{
      stepNumber: number;
      delayDays: number;
      channel: string;
      messageTemplate?: string;
    }>;
  },
) {
  const existing = await prisma.followUpSequence.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Sequence not found");

  // If steps are provided, delete old and recreate
  if (data.steps) {
    await prisma.followUpStep.deleteMany({ where: { sequenceId: id } });
  }

  return prisma.followUpSequence.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.triggerStatuses !== undefined && {
        triggerStatuses: data.triggerStatuses as any,
      }),
      ...(data.endAction !== undefined && { endAction: data.endAction }),
      ...(data.steps && {
        steps: {
          create: data.steps.map((s) => ({
            stepNumber: s.stepNumber,
            delayDays: s.delayDays,
            channel: s.channel as any,
            messageTemplate: s.messageTemplate,
          })),
        },
      }),
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });
}

export async function deleteSequence(workspaceId: string, id: string) {
  const existing = await prisma.followUpSequence.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Sequence not found");

  // Cancel active executions
  await prisma.followUpExecution.updateMany({
    where: { sequenceId: id, status: "ACTIVE" },
    data: { status: "CANCELLED", completedAt: new Date() },
  });

  return prisma.followUpSequence.delete({ where: { id } });
}

export async function toggleSequence(workspaceId: string, id: string) {
  const existing = await prisma.followUpSequence.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Sequence not found");

  return prisma.followUpSequence.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

// ─── Executions ───

export async function startExecution(
  workspaceId: string,
  data: { sequenceId: string; contactId: string },
) {
  const sequence = await prisma.followUpSequence.findFirst({
    where: { id: data.sequenceId, workspaceId, isActive: true },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });
  if (!sequence)
    throw new AppError(404, "NOT_FOUND", "Active sequence not found");

  // Check for existing active execution for this contact + sequence
  const existing = await prisma.followUpExecution.findFirst({
    where: {
      sequenceId: data.sequenceId,
      contactId: data.contactId,
      status: "ACTIVE",
    },
  });
  if (existing)
    throw new AppError(
      400,
      "ALREADY_ACTIVE",
      "Sequence already running for this contact",
    );

  const firstStep = sequence.steps[0];
  if (!firstStep) throw new AppError(400, "NO_STEPS", "Sequence has no steps");

  const nextRunAt = new Date(
    Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000,
  );

  return prisma.followUpExecution.create({
    data: {
      workspaceId,
      sequenceId: data.sequenceId,
      contactId: data.contactId,
      currentStep: 0,
      status: "ACTIVE",
      nextRunAt,
    },
    include: {
      sequence: { select: { name: true } },
    },
  });
}

export async function stopExecution(workspaceId: string, id: string) {
  const existing = await prisma.followUpExecution.findFirst({
    where: { id, workspaceId, status: "ACTIVE" },
  });
  if (!existing)
    throw new AppError(404, "NOT_FOUND", "Active execution not found");

  return prisma.followUpExecution.update({
    where: { id },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
      nextRunAt: null,
    },
  });
}

export async function getContactExecutions(
  workspaceId: string,
  contactId: string,
) {
  return prisma.followUpExecution.findMany({
    where: { workspaceId, contactId },
    include: {
      sequence: {
        select: { name: true, steps: { orderBy: { stepNumber: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
