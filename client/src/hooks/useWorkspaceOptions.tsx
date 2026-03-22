import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  createElement,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { getWorkspaceOptions } from "../api/settings";
import { useAuth } from "./useAuth";
import {
  DEAL_STAGES,
  PRIORITIES,
  TICKET_STATUSES,
  TASK_STATUSES,
  CONTACT_STATUSES,
  COMPANY_STATUSES,
  ACTIVITY_TYPES,
} from "../lib/constants";

// ── Types ──

export interface StatusOption {
  label: string;
  color: string;
  order?: number;
  hidden?: boolean;
}

export interface ActivityOption {
  label: string;
  color: string;
  icon: string;
}

export interface ChannelOption {
  label: string;
  color: string;
}

export interface WorkspaceOptions {
  dealStages: Record<string, StatusOption>;
  priorities: Record<string, StatusOption>;
  ticketStatuses: Record<string, StatusOption>;
  taskStatuses: Record<string, StatusOption>;
  contactStatuses: Record<string, StatusOption>;
  companyStatuses: Record<string, StatusOption>;
  activityTypes: Record<string, ActivityOption>;
  leadSources: string[];
  ticketChannels: Record<string, ChannelOption>;
  isLoading: boolean;
}

// ── Defaults for items not in constants.ts ──

const DEFAULT_LEAD_SOURCES = [
  "אתר",
  "טלפון",
  "הפניה",
  "פייסבוק",
  "vixy",
  "אחר",
];

const DEFAULT_TICKET_CHANNELS: Record<string, ChannelOption> = {
  email: { label: "אימייל", color: "#579BFC" },
  whatsapp: { label: "ווטסאפ", color: "#25D366" },
  chat: { label: "צ׳אט", color: "#6161FF" },
  phone: { label: "טלפון", color: "#FDAB3D" },
  portal: { label: "פורטל", color: "#A25DDC" },
};

// ── Helpers ──

/** Deep-merge workspace overrides onto defaults (per-key partial merge). */
function mergeOptions<T extends Record<string, any>>(
  defaults: T,
  overrides?: Record<string, Partial<T[string]>>,
): Record<string, T[string]> {
  const result = { ...defaults } as Record<string, any>;
  if (!overrides) return result;
  for (const key of Object.keys(defaults)) {
    if (overrides[key]) {
      result[key] = { ...defaults[key], ...overrides[key] };
    }
  }
  return result;
}

/**
 * Return sorted entries, optionally filtering hidden items.
 * Use this instead of Object.entries() when you need ordered dropdowns.
 */
export function sortedEntries<T extends { order?: number; hidden?: boolean }>(
  options: Record<string, T>,
  includeHidden = false,
): [string, T][] {
  return Object.entries(options)
    .filter(([, v]) => includeHidden || !v.hidden)
    .sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99));
}

// ── Context ──

const WorkspaceOptionsContext = createContext<WorkspaceOptions | null>(null);

export function WorkspaceOptionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { currentWorkspaceId, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-options", currentWorkspaceId],
    queryFn: getWorkspaceOptions,
    enabled: !!currentWorkspaceId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo<WorkspaceOptions>(() => {
    const co = data?.customOptions || {};
    return {
      dealStages: mergeOptions(
        DEAL_STAGES as unknown as Record<string, StatusOption>,
        co.dealStages,
      ),
      priorities: mergeOptions(
        PRIORITIES as unknown as Record<string, StatusOption>,
        co.priorities,
      ),
      ticketStatuses: mergeOptions(
        TICKET_STATUSES as unknown as Record<string, StatusOption>,
        co.ticketStatuses,
      ),
      taskStatuses: mergeOptions(
        TASK_STATUSES as unknown as Record<string, StatusOption>,
        co.taskStatuses,
      ),
      contactStatuses: mergeOptions(
        CONTACT_STATUSES as unknown as Record<string, StatusOption>,
        co.contactStatuses,
      ),
      companyStatuses: mergeOptions(
        COMPANY_STATUSES as unknown as Record<string, StatusOption>,
        co.companyStatuses,
      ),
      activityTypes: mergeOptions(
        ACTIVITY_TYPES as unknown as Record<string, ActivityOption>,
        co.activityTypes,
      ),
      leadSources: co.leadSources || DEFAULT_LEAD_SOURCES,
      ticketChannels: mergeOptions(DEFAULT_TICKET_CHANNELS, co.ticketChannels),
      isLoading,
    };
  }, [data, isLoading]);

  return createElement(
    WorkspaceOptionsContext.Provider,
    { value: options },
    children,
  );
}

export function useWorkspaceOptions(): WorkspaceOptions {
  const ctx = useContext(WorkspaceOptionsContext);
  if (!ctx) {
    // Fallback for use outside provider (e.g., login page)
    return {
      dealStages: DEAL_STAGES as unknown as Record<string, StatusOption>,
      priorities: PRIORITIES as unknown as Record<string, StatusOption>,
      ticketStatuses: TICKET_STATUSES as unknown as Record<
        string,
        StatusOption
      >,
      taskStatuses: TASK_STATUSES as unknown as Record<string, StatusOption>,
      contactStatuses: CONTACT_STATUSES as unknown as Record<
        string,
        StatusOption
      >,
      companyStatuses: COMPANY_STATUSES as unknown as Record<
        string,
        StatusOption
      >,
      activityTypes: ACTIVITY_TYPES as unknown as Record<
        string,
        ActivityOption
      >,
      leadSources: DEFAULT_LEAD_SOURCES,
      ticketChannels: DEFAULT_TICKET_CHANNELS,
      isLoading: false,
    };
  }
  return ctx;
}
