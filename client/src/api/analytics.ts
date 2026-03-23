import { api } from "./client";

export interface ActivityBreakdownItem {
  type: string;
  count: number;
}

export interface DealFunnelItem {
  stage: string;
  count: number;
  value: number;
}

export interface TaskCompletionData {
  totalCreated: number;
  totalCompleted: number;
  pending: number;
  completionRate: number;
}

export interface ContactGrowthItem {
  weekStart: string;
  count: number;
}

export interface TopPerformerItem {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  activitiesCount: number;
}

function qs(from: string, to: string) {
  return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export function getActivityBreakdown(from: string, to: string) {
  return api<ActivityBreakdownItem[]>(`/analytics/activity-breakdown${qs(from, to)}`);
}

export function getDealFunnel(from: string, to: string) {
  return api<DealFunnelItem[]>(`/analytics/deal-funnel${qs(from, to)}`);
}

export function getTaskCompletion(from: string, to: string) {
  return api<TaskCompletionData>(`/analytics/task-completion${qs(from, to)}`);
}

export function getContactGrowth(from: string, to: string) {
  return api<ContactGrowthItem[]>(`/analytics/contact-growth${qs(from, to)}`);
}

export function getTopPerformers(from: string, to: string) {
  return api<TopPerformerItem[]>(`/analytics/top-performers${qs(from, to)}`);
}
