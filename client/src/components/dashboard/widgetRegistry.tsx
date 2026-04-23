import type { ReactNode } from "react";
import {
  Sparkles,
  BarChart3,
  Activity,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Users,
  ListChecks,
  Hand,
} from "lucide-react";
import type { DashboardWidgetSize } from "../../api/settings";

/**
 * Static description of a widget — everything the Customize modal and the
 * dashboard grid need to render a widget *without* actually knowing how it's
 * implemented. The actual React component is looked up at render time inside
 * DashboardPage so we don't get a giant lazy-loading cycle here.
 */
export interface WidgetMeta {
  id: string;
  /** Short Hebrew label shown in the customize modal and (optionally) header. */
  title: string;
  /** Hebrew description for the customize modal. */
  description: string;
  /** lucide icon. */
  icon: ReactNode;
  /** Default size used when first seeding a user's layout. */
  defaultSize: DashboardWidgetSize;
  /** Whether the widget can be hidden. A few widgets (greeting, stat-cards)
   *  are always shown because hiding them breaks the page identity. */
  hideable: boolean;
  /** Whether the widget's size is user-configurable. */
  resizable: boolean;
}

export const WIDGET_REGISTRY: Record<string, WidgetMeta> = {
  greeting: {
    id: "greeting",
    title: "ברכת שלום",
    description: "כותרת אישית עם שם המשתמש והתאריך",
    icon: <Hand size={16} />,
    defaultSize: "large",
    hideable: true,
    resizable: false,
  },
  "stat-cards": {
    id: "stat-cards",
    title: "כרטיסי נתונים",
    description: "ארבעה כרטיסי KPI — לידים, עסקאות, משימות ושיחות",
    icon: <BarChart3 size={16} />,
    defaultSize: "large",
    hideable: true,
    resizable: false,
  },
  "pipeline-chart": {
    id: "pipeline-chart",
    title: "צינור מכירות",
    description: "גרף משפך של עסקאות פתוחות לפי שלב",
    icon: <TrendingUp size={16} />,
    defaultSize: "medium",
    hideable: true,
    resizable: true,
  },
  "activity-feed": {
    id: "activity-feed",
    title: "פעילות אחרונה",
    description: "פיד פעילויות של הצוות",
    icon: <Activity size={16} />,
    defaultSize: "medium",
    hideable: true,
    resizable: true,
  },
  "team-performance": {
    id: "team-performance",
    title: "ביצועי צוות",
    description: "טבלת מובילים של חברי הצוות",
    icon: <Users size={16} />,
    defaultSize: "large",
    hideable: true,
    resizable: true,
  },
  "deals-at-risk": {
    id: "deals-at-risk",
    title: "עסקאות בסיכון",
    description: "עסקאות ללא פעילות 14+ ימים",
    icon: <AlertTriangle size={16} />,
    defaultSize: "large",
    hideable: true,
    resizable: true,
  },
  "my-tasks": {
    id: "my-tasks",
    title: "המשימות שלי",
    description: "משימות שהוקצו לי",
    icon: <ListChecks size={16} />,
    defaultSize: "medium",
    hideable: true,
    resizable: true,
  },
  calendar: {
    id: "calendar",
    title: "יומן",
    description: "אירועים קרובים מיומן Google",
    icon: <Calendar size={16} />,
    defaultSize: "large",
    hideable: true,
    resizable: true,
  },
  "todays-tasks": {
    id: "todays-tasks",
    title: "משימות היום",
    description: "המשימות שלי להיום עם השלמה מהירה",
    icon: <Sparkles size={16} />,
    defaultSize: "large",
    hideable: true,
    resizable: true,
  },
};

/** The canonical default order. Mirrors server DEFAULT_DASHBOARD_LAYOUT. */
export const DEFAULT_WIDGET_ORDER: string[] = [
  "greeting",
  "stat-cards",
  "pipeline-chart",
  "activity-feed",
  "team-performance",
  "deals-at-risk",
  "calendar",
  "todays-tasks",
  "my-tasks",
];
