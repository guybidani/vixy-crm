import { api } from "./client";

export interface SearchResults {
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

export function globalSearch(query: string) {
  return api<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
}
