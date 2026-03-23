import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";
import fs from "fs";
import path from "path";

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  type?: "FILE" | "RICH_TEXT";
  search?: string;
}

export async function list({
  workspaceId,
  page = 1,
  limit = 25,
  type,
  search,
}: ListParams) {
  const where: any = { workspaceId };
  if (type) where.type = type;
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        createdBy: { include: { user: { select: { name: true } } } },
        links: {
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, title: true } },
            company: { select: { id: true, name: true } },
            ticket: { select: { id: true, subject: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getById(workspaceId: string, id: string) {
  return prisma.document.findFirst({
    where: { id, workspaceId },
    include: {
      createdBy: { include: { user: { select: { name: true } } } },
      links: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          company: { select: { id: true, name: true } },
          ticket: { select: { id: true, subject: true } },
        },
      },
    },
  });
}

interface CreateFileParams {
  workspaceId: string;
  memberId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export async function createFile(params: CreateFileParams) {
  return prisma.document.create({
    data: {
      workspaceId: params.workspaceId,
      type: "FILE",
      title: params.title,
      fileName: params.fileName,
      fileUrl: params.fileUrl,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      createdById: params.memberId,
    },
    include: {
      createdBy: { include: { user: { select: { name: true } } } },
      links: true,
    },
  });
}

interface CreateRichTextParams {
  workspaceId: string;
  memberId: string;
  title: string;
  content: string;
}

export async function createRichText(params: CreateRichTextParams) {
  return prisma.document.create({
    data: {
      workspaceId: params.workspaceId,
      type: "RICH_TEXT",
      title: params.title,
      content: params.content,
      createdById: params.memberId,
    },
    include: {
      createdBy: { include: { user: { select: { name: true } } } },
      links: true,
    },
  });
}

export async function update(
  workspaceId: string,
  id: string,
  data: { title?: string; content?: string },
) {
  const doc = await prisma.document.findFirst({ where: { id, workspaceId } });
  if (!doc) return null;

  return prisma.document.update({
    where: { id },
    data,
    include: {
      createdBy: { include: { user: { select: { name: true } } } },
      links: true,
    },
  });
}

export async function remove(workspaceId: string, id: string) {
  const doc = await prisma.document.findFirst({ where: { id, workspaceId } });
  if (!doc) return null;

  // Delete physical file if it's a FILE type
  if (doc.type === "FILE" && doc.fileUrl) {
    const filePath = path.resolve(__dirname, "../../uploads", doc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.document.delete({ where: { id } });
  return { deleted: true };
}

interface LinkParams {
  documentId: string;
  entityType: "contact" | "deal" | "company" | "ticket";
  entityId: string;
}

export async function linkToEntity(workspaceId: string, params: LinkParams) {
  // Verify document belongs to workspace
  const doc = await prisma.document.findFirst({
    where: { id: params.documentId, workspaceId },
  });
  if (!doc) return null;

  // Verify the entity belongs to the workspace
  const entityModelMap: Record<string, any> = {
    contact: prisma.contact,
    deal: prisma.deal,
    company: prisma.company,
    ticket: prisma.ticket,
  };
  const model = entityModelMap[params.entityType];
  if (model) {
    const entity = await model.findFirst({ where: { id: params.entityId, workspaceId } });
    if (!entity) throw new AppError(400, "INVALID_REFERENCE", `${params.entityType} not found in workspace`);
  }

  const linkData: any = { documentId: params.documentId };
  linkData[`${params.entityType}Id`] = params.entityId;

  return prisma.documentLink.create({
    data: linkData,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
      company: { select: { id: true, name: true } },
      ticket: { select: { id: true, subject: true } },
    },
  });
}

export async function unlinkFromEntity(
  workspaceId: string,
  documentId: string,
  linkId: string,
) {
  // Verify document belongs to workspace
  const doc = await prisma.document.findFirst({
    where: { id: documentId, workspaceId },
  });
  if (!doc) return null;

  const link = await prisma.documentLink.findFirst({
    where: { id: linkId, documentId },
  });
  if (!link) return null;

  await prisma.documentLink.delete({ where: { id: linkId } });
  return { deleted: true };
}

export async function getEntityDocuments(
  workspaceId: string,
  entityType: "contact" | "deal" | "company" | "ticket",
  entityId: string,
) {
  const where: any = {};
  where[`${entityType}Id`] = entityId;

  const links = await prisma.documentLink.findMany({
    where,
    include: {
      document: {
        include: {
          createdBy: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter to workspace-owned documents
  return links.filter((l) => l.document.workspaceId === workspaceId);
}
