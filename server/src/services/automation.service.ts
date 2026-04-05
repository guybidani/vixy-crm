import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

// ─── Workflow CRUD ───

interface ListWorkflowsParams {
  workspaceId: string;
  trigger?: string;
  isActive?: boolean;
}

export async function listWorkflows(params: ListWorkflowsParams) {
  const { workspaceId, trigger, isActive } = params;

  const where: Prisma.WorkflowWhereInput = { workspaceId };
  if (trigger) where.trigger = trigger as any;
  if (isActive !== undefined) where.isActive = isActive;

  const workflows = await prisma.workflow.findMany({
    where,
    include: {
      actions: { orderBy: { order: "asc" } },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    trigger: w.trigger,
    conditions: w.conditions,
    isActive: w.isActive,
    actions: w.actions.map((a) => ({
      id: a.id,
      type: a.type,
      config: a.config,
      order: a.order,
    })),
    totalRuns: w._count.runs,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));
}

export async function getWorkflow(workspaceId: string, id: string) {
  const workflow = await prisma.workflow.findFirst({
    where: { id, workspaceId },
    include: {
      actions: { orderBy: { order: "asc" } },
      runs: { orderBy: { executedAt: "desc" }, take: 20 },
    },
  });

  if (!workflow) throw new AppError(404, "NOT_FOUND", "Workflow not found");
  return workflow;
}

interface CreateWorkflowData {
  name: string;
  description?: string;
  trigger: string;
  conditions?: any;
  actions: { type: string; config: any; order?: number }[];
}

export async function createWorkflow(
  workspaceId: string,
  memberId: string,
  data: CreateWorkflowData,
) {
  return prisma.workflow.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      trigger: data.trigger as any,
      conditions: data.conditions || Prisma.JsonNull,
      createdById: memberId,
      actions: {
        create: data.actions.map((a, i) => ({
          type: a.type as any,
          config: a.config,
          order: a.order ?? i,
        })),
      },
    },
    include: {
      actions: { orderBy: { order: "asc" } },
    },
  });
}

interface UpdateWorkflowData {
  name?: string;
  description?: string;
  trigger?: string;
  conditions?: any;
  isActive?: boolean;
  actions?: { type: string; config: any; order?: number }[];
}

export async function updateWorkflow(
  workspaceId: string,
  id: string,
  data: UpdateWorkflowData,
) {
  const existing = await prisma.workflow.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Workflow not found");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.trigger !== undefined) updateData.trigger = data.trigger;
  if (data.conditions !== undefined)
    updateData.conditions = data.conditions || Prisma.JsonNull;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  // If actions are provided, replace them all inside a transaction to avoid
  // partial state if the process crashes between delete and create.
  if (data.actions) {
    return prisma.$transaction(async (tx) => {
      await tx.workflowAction.deleteMany({ where: { workflowId: id } });
      await tx.workflowAction.createMany({
        data: data.actions!.map((a, i) => ({
          workflowId: id,
          type: a.type as any,
          config: a.config,
          order: a.order ?? i,
        })),
      });
      return tx.workflow.update({
        where: { id },
        data: updateData,
        include: {
          actions: { orderBy: { order: "asc" } },
        },
      });
    });
  }

  return prisma.workflow.update({
    where: { id },
    data: updateData,
    include: {
      actions: { orderBy: { order: "asc" } },
    },
  });
}

export async function deleteWorkflow(workspaceId: string, id: string) {
  const existing = await prisma.workflow.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Workflow not found");
  return prisma.workflow.delete({ where: { id } });
}

export async function toggleWorkflow(
  workspaceId: string,
  id: string,
  isActive: boolean,
) {
  const existing = await prisma.workflow.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Workflow not found");
  return prisma.workflow.update({
    where: { id },
    data: { isActive },
    include: { actions: { orderBy: { order: "asc" } } },
  });
}

// ─── Workflow Trigger Engine ───

interface TriggerContext {
  workspaceId: string;
  entityType: string;
  entityId: string;
  trigger: string;
  data: Record<string, any>;
  previousData?: Record<string, any>;
}

export async function processTrigger(ctx: TriggerContext) {
  const workflows = await prisma.workflow.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      trigger: ctx.trigger as any,
      isActive: true,
    },
    include: { actions: { orderBy: { order: "asc" } } },
  });

  // Collect run log entries during execution, flush with a single createMany at the end
  const runLogs: Array<{
    workflowId: string;
    triggeredBy: string;
    entityType: string;
    entityId: string;
    status: "SUCCESS" | "FAILED";
    error?: string;
  }> = [];

  for (const workflow of workflows) {
    try {
      // Check conditions
      if (
        !evaluateConditions(workflow.conditions, ctx.data, ctx.previousData)
      ) {
        continue;
      }

      // Execute actions
      for (const action of workflow.actions) {
        await executeAction(action, ctx);
      }

      runLogs.push({
        workflowId: workflow.id,
        triggeredBy: ctx.entityId,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        status: "SUCCESS",
      });
    } catch (err: any) {
      runLogs.push({
        workflowId: workflow.id,
        triggeredBy: ctx.entityId,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        status: "FAILED",
        error: err.message,
      });
      console.error(
        `Workflow ${workflow.id} (${workflow.name}) failed:`,
        err.message,
      );
    }
  }

  // Single bulk insert for all run logs instead of N sequential creates
  if (runLogs.length > 0) {
    await prisma.workflowRun.createMany({ data: runLogs });
  }
}

function evaluateConditions(
  conditions: any,
  data: Record<string, any>,
  previousData?: Record<string, any>,
): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0)
    return true;

  return conditions.every((cond: any) => {
    const value = data[cond.field];
    const prevValue = previousData?.[cond.field];

    switch (cond.operator) {
      case "equals":
        return value === cond.value;
      case "not_equals":
        return value !== cond.value;
      case "contains":
        return String(value || "")
          .toLowerCase()
          .includes(String(cond.value).toLowerCase());
      case "greater_than":
        return Number(value) > Number(cond.value);
      case "less_than":
        return Number(value) < Number(cond.value);
      case "changed_to":
        return value === cond.value && prevValue !== cond.value;
      case "changed_from":
        return prevValue === cond.value && value !== cond.value;
      case "is_empty":
        return !value || value === "";
      case "is_not_empty":
        return !!value && value !== "";
      default:
        console.warn(`[Automation] Unknown condition operator: ${cond.operator}`);
        return false;
    }
  });
}

async function executeAction(action: any, ctx: TriggerContext) {
  const config = action.config as Record<string, any>;

  switch (action.type) {
    case "SEND_NOTIFICATION": {
      const targetUserIds = config.userIds || [];
      // If no specific users, notify all workspace members
      const members =
        targetUserIds.length > 0
          ? await prisma.workspaceMember.findMany({
              where: {
                workspaceId: ctx.workspaceId,
                userId: { in: targetUserIds },
              },
            })
          : await prisma.workspaceMember.findMany({
              where: { workspaceId: ctx.workspaceId },
            });

      const title = interpolateTemplate(config.title || "התראה חדשה", ctx.data);
      const body = interpolateTemplate(config.body || "", ctx.data);

      if (members.length > 0) {
        // Single bulk insert instead of N sequential creates
        await prisma.notification.createMany({
          data: members.map((member) => ({
            workspaceId: ctx.workspaceId,
            userId: member.userId,
            type: "AUTOMATION" as const,
            title,
            body,
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            metadata: { workflowId: action.workflowId },
          })),
        });
      }
      break;
    }

    case "CREATE_TASK": {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          ...(config.assigneeId ? { id: config.assigneeId } : {}),
        },
      });

      if (member) {
        const title = interpolateTemplate(
          config.title || "משימה אוטומטית",
          ctx.data,
        );
        await prisma.task.create({
          data: {
            workspaceId: ctx.workspaceId,
            title,
            description: interpolateTemplate(
              config.description || "",
              ctx.data,
            ),
            priority: config.priority || "MEDIUM",
            status: "TODO",
            assigneeId: config.assigneeId || member.id,
            createdById: member.id,
            contactId: ctx.entityType === "contact" ? ctx.entityId : undefined,
            dealId: ctx.entityType === "deal" ? ctx.entityId : undefined,
            dueDate: config.dueDays
              ? new Date(
                  Date.now() + Number(config.dueDays) * 24 * 60 * 60 * 1000,
                )
              : undefined,
          },
        });
      }
      break;
    }

    case "CHANGE_FIELD": {
      const { field, value } = config;
      if (!field) break;

      const ALLOWED_FIELDS: Record<string, string[]> = {
        contact: ["status", "leadScore", "source", "preferredChannel", "notes"],
        deal: ["stage", "priority", "notes", "expectedCloseDate", "value"],
        ticket: ["status", "priority", "assigneeId"],
      };

      const allowed = ALLOWED_FIELDS[ctx.entityType];
      if (!allowed || !allowed.includes(field)) {
        console.error(
          `[Automation] CHANGE_FIELD blocked: field "${field}" is not allowed for entity type "${ctx.entityType}"`,
        );
        break;
      }

      // Use updateMany with workspaceId filter for defense-in-depth
      // (prevents cross-workspace writes if entityId was ever corrupted)
      if (ctx.entityType === "contact") {
        await prisma.contact.updateMany({
          where: { id: ctx.entityId, workspaceId: ctx.workspaceId },
          data: { [field]: value },
        });
      } else if (ctx.entityType === "deal") {
        await prisma.deal.updateMany({
          where: { id: ctx.entityId, workspaceId: ctx.workspaceId },
          data: { [field]: value },
        });
      } else if (ctx.entityType === "ticket") {
        await prisma.ticket.updateMany({
          where: { id: ctx.entityId, workspaceId: ctx.workspaceId },
          data: { [field]: value },
        });
      }
      break;
    }

    case "MOVE_STAGE": {
      if (ctx.entityType === "deal" && config.stage) {
        await prisma.deal.updateMany({
          where: { id: ctx.entityId, workspaceId: ctx.workspaceId },
          data: {
            stage: config.stage,
            stageChangedAt: new Date(),
          },
        });
      }
      break;
    }

    case "ASSIGN_OWNER": {
      if (config.assigneeId) {
        if (ctx.entityType === "deal") {
          await prisma.deal.updateMany({
            where: { id: ctx.entityId, workspaceId: ctx.workspaceId },
            data: { assigneeId: config.assigneeId },
          });
        }
      }
      break;
    }

    case "SEND_EMAIL": {
      // Placeholder — log as activity
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: ctx.workspaceId },
      });
      if (member) {
        await prisma.activity.create({
          data: {
            workspaceId: ctx.workspaceId,
            type: "EMAIL",
            subject: interpolateTemplate(
              config.subject || "אוטומציה - אימייל",
              ctx.data,
            ),
            body: interpolateTemplate(config.body || "", ctx.data),
            contactId: ctx.entityType === "contact" ? ctx.entityId : undefined,
            dealId: ctx.entityType === "deal" ? ctx.entityId : undefined,
            memberId: member.id,
            metadata: { automated: true, workflowId: action.workflowId },
          },
        });
      }
      break;
    }

    case "ADD_TAG": {
      if (config.tagName && ctx.entityType === "contact") {
        // upsert tag in one round-trip instead of findFirst + conditional create
        const tag = await prisma.tag.upsert({
          where: {
            workspaceId_name: {
              workspaceId: ctx.workspaceId,
              name: config.tagName,
            },
          },
          create: {
            workspaceId: ctx.workspaceId,
            name: config.tagName,
            color: config.tagColor || "#0073EA",
          },
          update: {},
        });
        await prisma.tagOnContact
          .create({
            data: { contactId: ctx.entityId, tagId: tag.id },
          })
          .catch(() => {}); // ignore if already exists
      }
      break;
    }
  }
}

function interpolateTemplate(
  template: string,
  data: Record<string, any>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}

// ─── Workflow Runs ───

export async function getWorkflowRuns(
  workspaceId: string,
  workflowId: string,
  limit = 50,
) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, workspaceId },
  });
  if (!workflow) throw new AppError(404, "NOT_FOUND", "Workflow not found");

  return prisma.workflowRun.findMany({
    where: { workflowId },
    orderBy: { executedAt: "desc" },
    take: limit,
  });
}
