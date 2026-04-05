import { prisma } from "../db/client";

interface SearchResults {
  contacts: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  }>;
  deals: Array<{
    id: string;
    title: string;
    value: number | null;
    stage: string;
  }>;
  companies: Array<{
    id: string;
    name: string;
    industry: string | null;
  }>;
  tickets: Array<{
    id: string;
    subject: string;
    status: string;
  }>;
}

export async function globalSearch(
  workspaceId: string,
  query: string,
  limit = 5,
): Promise<SearchResults> {
  if (!query || query.length < 2) {
    return { contacts: [], deals: [], companies: [], tickets: [] };
  }

  // Clamp limit to prevent unbounded queries — callers could pass limit=999999
  // to pull the entire table.  Cap at 20 per entity (global search only needs
  // a handful of results for the dropdown).
  const safeLim = Math.min(Math.max(1, limit), 20);

  // Sanitize LIKE wildcards so user input like "%" or "_" doesn't match everything.
  // Prisma's `contains` maps to SQL LIKE '%…%' — percent and underscore in the
  // search term would be interpreted as wildcards without escaping.
  const safeQuery = query.replace(/[%_]/g, "\\$&");

  const [contacts, deals, companies, tickets] = await Promise.all([
    prisma.contact.findMany({
      where: {
        workspaceId,
        OR: [
          { firstName: { contains: safeQuery, mode: "insensitive" } },
          { lastName: { contains: safeQuery, mode: "insensitive" } },
          { email: { contains: safeQuery, mode: "insensitive" } },
          { phone: { contains: safeQuery } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      take: safeLim,
    }),
    prisma.deal.findMany({
      where: {
        workspaceId,
        title: { contains: safeQuery, mode: "insensitive" },
      },
      select: { id: true, title: true, value: true, stage: true },
      take: safeLim,
    }),
    prisma.company.findMany({
      where: {
        workspaceId,
        name: { contains: safeQuery, mode: "insensitive" },
      },
      select: { id: true, name: true, industry: true },
      take: safeLim,
    }),
    prisma.ticket.findMany({
      where: {
        workspaceId,
        subject: { contains: safeQuery, mode: "insensitive" },
      },
      select: { id: true, subject: true, status: true },
      take: safeLim,
    }),
  ]);

  return {
    contacts: contacts.map((c) => ({
      id: c.id,
      fullName: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone,
    })),
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value ? Number(d.value) : null,
      stage: d.stage as string,
    })),
    companies,
    tickets,
  };
}
