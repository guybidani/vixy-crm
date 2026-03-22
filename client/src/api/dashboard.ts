import { api } from "./client";

export interface DashboardData {
  kpis: {
    contactsTotal: number;
    contactsThisWeek: number;
    dealsOpenCount: number;
    totalPipelineValue: number;
    ticketsOpen: number;
    ticketsUrgent: number;
    tasksToday: number;
    tasksOverdue: number;
    tasksCompletedThisWeek: number;
  };
  pipeline: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    subject: string | null;
    body: string | null;
    contact: { id: string; firstName: string; lastName: string } | null;
    deal: { id: string; title: string } | null;
    member: { user: { name: string } };
    createdAt: string;
  }>;
  myTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    contact: { id: string; firstName: string; lastName: string } | null;
    deal: { id: string; title: string } | null;
  }>;
}

export function getDashboard() {
  return api<DashboardData>("/dashboard");
}
