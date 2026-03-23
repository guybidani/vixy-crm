import { api } from "./client";

export interface RecentContact {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  lastActivity: {
    type: string;
    subject: string | null;
    createdAt: string;
  };
  activityCount: number;
}

export function getRecentContacts(): Promise<RecentContact[]> {
  return api<RecentContact[]>("/activities/recent-contacts");
}
