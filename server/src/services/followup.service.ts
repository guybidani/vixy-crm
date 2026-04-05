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
    take: 100,
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

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.triggerStatuses !== undefined)
    updateData.triggerStatuses = data.triggerStatuses as any;
  if (data.endAction !== undefined) updateData.endAction = data.endAction;

  // If steps are provided, wrap delete + recreate in a transaction to avoid
  // partial state if the process crashes between delete and create.
  if (data.steps) {
    return prisma.$transaction(async (tx) => {
      await tx.followUpStep.deleteMany({ where: { sequenceId: id } });
      await tx.followUpStep.createMany({
        data: data.steps!.map((s) => ({
          sequenceId: id,
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          channel: s.channel as any,
          messageTemplate: s.messageTemplate,
        })),
      });
      return tx.followUpSequence.update({
        where: { id },
        data: updateData,
        include: {
          steps: { orderBy: { stepNumber: "asc" } },
        },
      });
    });
  }

  return prisma.followUpSequence.update({
    where: { id },
    data: updateData,
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

  // Wrap cancel + delete in a transaction so a crash between them can't leave
  // active executions referencing a deleted sequence.
  return prisma.$transaction(async (tx) => {
    await tx.followUpExecution.updateMany({
      where: { sequenceId: id, status: "ACTIVE" },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    return tx.followUpSequence.delete({ where: { id } });
  });
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
  // Run all three validation queries in parallel — they are independent.
  // Previously contactId was validated sequentially before the other two,
  // adding an extra round-trip.
  const [contactRef, sequence, existing] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: data.contactId, workspaceId },
      select: { id: true },
    }),
    prisma.followUpSequence.findFirst({
      where: { id: data.sequenceId, workspaceId, isActive: true },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    }),
    prisma.followUpExecution.findFirst({
      where: {
        sequenceId: data.sequenceId,
        contactId: data.contactId,
        status: "ACTIVE",
      },
    }),
  ]);

  if (!contactRef)
    throw new AppError(400, "INVALID_REFERENCE", "Contact not found in workspace");

  if (!sequence)
    throw new AppError(404, "NOT_FOUND", "Active sequence not found");

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
    take: 50,
  });
}
