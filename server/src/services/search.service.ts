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

  const [contacts, deals, companies, tickets] = await Promise.all([
    prisma.contact.findMany({
      where: {
        workspaceId,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      take: limit,
    }),
    prisma.deal.findMany({
      where: {
        workspaceId,
        title: { contains: query, mode: "insensitive" },
      },
      select: { id: true, title: true, value: true, stage: true },
      take: limit,
    }),
    prisma.company.findMany({
      where: {
        workspaceId,
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, industry: true },
      take: limit,
    }),
    prisma.ticket.findMany({
      where: {
        workspaceId,
        subject: { contains: query, mode: "insensitive" },
      },
      select: { id: true, subject: true, status: true },
      take: limit,
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
