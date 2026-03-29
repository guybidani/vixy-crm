import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

const SORTABLE_FIELDS = [
  "name",
  "website",
  "phone",
  "email",
  "industry",
  "size",
  "createdAt",
  "updatedAt",
] as const;

interface ListParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function list(params: ListParams) {
  const {
    workspaceId,
    page = 1,
    limit = 25,
    search,
    sortBy: rawSortBy = "createdAt",
    sortDir = "desc",
  } = params;
  const sortBy = SORTABLE_FIELDS.includes(rawSortBy as any)
    ? rawSortBy
    : "createdAt";

  const where: Prisma.CompanyWhereInput = { workspaceId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return {
    data: companies.map((c) => ({
      id: c.id,
      name: c.name,
      website: c.website,
      phone: c.phone,
      email: c.email,
      industry: c.industry,
      size: c.size,
      contactCount: c._count.contacts,
      dealCount: c._count.deals,
      createdAt: c.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getById(workspaceId: string, id: string) {
  const company = await prisma.company.findFirst({
    where: { id, workspaceId },
    include: {
      contacts: {
        include: {
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      deals: {
        include: {
          contact: { select: { firstName: true, lastName: true } },
          assignee: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    throw new AppError(404, "NOT_FOUND", "Company not found");
  }

  // Fetch recent activities from all contacts and deals belonging to this company
  const contactIds = company.contacts.map((c) => c.id);
  const dealIds = company.deals.map((d) => d.id);

  const activities =
    contactIds.length > 0 || dealIds.length > 0
      ? await prisma.activity.findMany({
          where: {
            workspaceId,
            OR: [
              ...(contactIds.length > 0 ? [{ contactId: { in: contactIds } }] : []),
              ...(dealIds.length > 0 ? [{ dealId: { in: dealIds } }] : []),
            ],
          },
          include: {
            member: { include: { user: { select: { name: true } } } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [];

  return { ...company, activities };
}

export async function create(
  workspaceId: string,
  data: {
    name: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    industry?: string;
    size?: string;
    notes?: string;
  },
) {
  return prisma.company.create({
    data: { workspaceId, ...data },
  });
}

export async function update(
  workspaceId: string,
  id: string,
  data: Partial<{
    name: string;
    website: string;
    phone: string;
    email: string;
    address: string;
    industry: string;
    size: string;
    notes: string;
  }>,
) {
  const existing = await prisma.company.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Company not found");
  }

  return prisma.company.update({
    where: { id },
    data,
  });
}

export async function remove(workspaceId: string, id: string) {
  const existing = await prisma.company.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Company not found");
  }

  return prisma.company.delete({ where: { id } });
}

export async function board(workspaceId: string) {
  const companies = await prisma.company.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const statuses = ["PROSPECT", "ACTIVE", "INACTIVE", "CHURNED"];
  const grouped: Record<string, any[]> = {};
  for (const s of statuses) grouped[s] = [];

  for (const c of companies) {
    grouped[c.status]?.push({
      id: c.id,
      name: c.name,
      status: c.status,
      industry: c.industry,
      email: c.email,
      phone: c.phone,
      website: c.website,
      size: c.size,
      contactCount: c._count.contacts,
      dealCount: c._count.deals,
      createdAt: c.createdAt,
    });
  }

  const totals = statuses.map((s) => ({
    status: s,
    count: grouped[s].length,
  }));

  return { statuses: grouped, totals };
}
