import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

export async function list(workspaceId: string) {
  return prisma.tag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });
}

export async function create(
  workspaceId: string,
  data: { name: string; color?: string },
) {
  return prisma.tag.create({
    data: {
      workspaceId,
      name: data.name.trim(),
      color: data.color || "#0073EA",
    },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });
}

export async function update(
  workspaceId: string,
  id: string,
  data: { name?: string; color?: string },
) {
  const existing = await prisma.tag.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Tag not found");

  return prisma.tag.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.color !== undefined && { color: data.color }),
    },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });
}

export async function remove(workspaceId: string, id: string) {
  const existing = await prisma.tag.findFirst({ where: { id, workspaceId } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Tag not found");

  return prisma.tag.delete({ where: { id } });
}

export async function assignToContact(
  workspaceId: string,
  contactId: string,
  tagId: string,
) {
  const [tag, contact] = await Promise.all([
    prisma.tag.findFirst({ where: { id: tagId, workspaceId } }),
    prisma.contact.findFirst({ where: { id: contactId, workspaceId } }),
  ]);
  if (!tag) throw new AppError(404, "NOT_FOUND", "Tag not found");
  if (!contact) throw new AppError(404, "NOT_FOUND", "Contact not found");

  return prisma.tagOnContact.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });
}

export async function unassignFromContact(
  workspaceId: string,
  contactId: string,
  tagId: string,
) {
  // Verify both tag and contact belong to the workspace
  const [tag, contact] = await Promise.all([
    prisma.tag.findFirst({ where: { id: tagId, workspaceId } }),
    prisma.contact.findFirst({ where: { id: contactId, workspaceId } }),
  ]);
  if (!tag) throw new AppError(404, "NOT_FOUND", "Tag not found");
  if (!contact) throw new AppError(404, "NOT_FOUND", "Contact not found");

  return prisma.tagOnContact
    .delete({
      where: { contactId_tagId: { contactId, tagId } },
    })
    .catch(() => null);
}

export async function assignToDeal(
  workspaceId: string,
  dealId: string,
  tagId: string,
) {
  const [tag, deal] = await Promise.all([
    prisma.tag.findFirst({ where: { id: tagId, workspaceId } }),
    prisma.deal.findFirst({ where: { id: dealId, workspaceId } }),
  ]);
  if (!tag) throw new AppError(404, "NOT_FOUND", "Tag not found");
  if (!deal) throw new AppError(404, "NOT_FOUND", "Deal not found");

  return prisma.tagOnDeal.upsert({
    where: { dealId_tagId: { dealId, tagId } },
    create: { dealId, tagId },
    update: {},
  });
}

export async function unassignFromDeal(
  workspaceId: string,
  dealId: string,
  tagId: string,
) {
  // Verify both tag and deal belong to the workspace
  const [tag, deal] = await Promise.all([
    prisma.tag.findFirst({ where: { id: tagId, workspaceId } }),
    prisma.deal.findFirst({ where: { id: dealId, workspaceId } }),
  ]);
  if (!tag) throw new AppError(404, "NOT_FOUND", "Tag not found");
  if (!deal) throw new AppError(404, "NOT_FOUND", "Deal not found");

  return prisma.tagOnDeal
    .delete({
      where: { dealId_tagId: { dealId, tagId } },
    })
    .catch(() => null);
}
