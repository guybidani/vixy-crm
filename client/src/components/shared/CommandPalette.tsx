import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Handshake,
  CheckSquare,
  Building2,
  Ticket,
  Loader2,
  SearchX,
  LayoutDashboard,
  FileText,
  Settings,
  BookOpen,
  History,
  Zap,
  ArrowLeft,
  Target,
  UserPlus,
  Palette,
  Type as TypeIcon,
  BarChart3,
  FileBarChart,
  ListChecks,
  Upload,
  Command as CommandIcon,
} from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { globalSearch, type SearchResults } from "../../api/search";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

type QuickAddType = "contact" | "deal" | "task" | "ticket";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onQuickAdd: (type?: QuickAddType) => void;
  onOpenShortcuts?: () => void;
}

type ItemType =
  | "contact"
  | "deal"
  | "company"
  | "ticket"
  | "action"
  | "navigation"
  | "settings"
  | "recent";

interface ResultItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconColor: string;
  iconBg: string;
  /** Shortcut hint shown on the right, e.g. "⌘ N" or "G D" */
  shortcut?: string;
  /** Keywords to match in fuzzy filter (in addition to title). */
  keywords?: string[];
  action: () => void;
}

interface ResultGroup {
  label: string;
  items: ResultItem[];
}

interface RecentItem {
  id: string;
  entity: "contact" | "deal" | "company" | "ticket";
  title: string;
  subtitle?: string;
  path: string;
  at: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  LEAD: "ליד",
  QUALIFIED: "מאומת",
  PROPOSAL: "הצעה",
  NEGOTIATION: "משא ומתן",
  CLOSED_WON: "נסגר בהצלחה",
  CLOSED_LOST: "נסגר באי-הצלחה",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: "חדש",
  OPEN: "פתוח",
  PENDING: "ממתין",
  RESOLVED: "טופל",
  CLOSED: "סגור",
};

const RECENT_KEY = "vixy-crm:command-palette:recent";
const RECENT_MAX = 5;

// Icon palette per entity/module (kept aligned with rest of app).
const C = {
  blue: { fg: "#6161FF", bg: "#E8E8FF" },
  green: { fg: "#00CA72", bg: "#D6F5E8" },
  purple: { fg: "#A25DDC", bg: "#EDE1F5" },
  orange: { fg: "#FDAB3D", bg: "#FEF0D8" },
  teal: { fg: "#037F4C", bg: "#D6F5E8" },
  red: { fg: "#D83A52", bg: "#FCE7EB" },
  gray: { fg: "#676879", bg: "#F0F0F0" },
  primary: { fg: "#0073EA", bg: "#E8F3FF" },
};

// Shortcut key labels use ⌘ on mac, Ctrl elsewhere.
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? "⌘" : "Ctrl";

// ──────────────────────────────────────────────────────────────────────────
// Recent items (localStorage)
// ──────────────────────────────────────────────────────────────────────────

function readRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentItem =>
          x && typeof x.id === "string" && typeof x.path === "string",
      )
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function pushRecent(item: Omit<RecentItem, "at">) {
  try {
    const current = readRecents().filter((r) => r.id !== item.id);
    const next: RecentItem[] = [{ ...item, at: Date.now() }, ...current].slice(
      0,
      RECENT_MAX,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / disabled storage */
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Fuzzy matcher — RTL-safe (substring + all-tokens-present)
// ──────────────────────────────────────────────────────────────────────────

function itemMatches(item: ResultItem, q: string): boolean {
  if (!q) return true;
  const haystack = [item.title, item.subtitle ?? "", ...(item.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  // Split by whitespace; require every token to appear somewhere.
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

// ──────────────────────────────────────────────────────────────────────────
// Builders
// ──────────────────────────────────────────────────────────────────────────

function buildQuickActions(
  onQuickAdd: (type: QuickAddType) => void,
  go: (path: string) => void,
): ResultGroup {
  return {
    label: "פעולות מהירות",
    items: [
      {
        id: "qa-new-contact",
        type: "action",
        title: "איש קשר חדש",
        subtitle: "צור רשומת איש קשר",
        icon: <UserPlus size={16} />,
        iconColor: C.blue.fg,
        iconBg: C.blue.bg,
        shortcut: "N C",
        keywords: ["contact", "new", "create", "חדש", "צור", "person"],
        action: () => onQuickAdd("contact"),
      },
      {
        id: "qa-new-deal",
        type: "action",
        title: "עסקה חדשה",
        subtitle: "צור עסקה במשפך",
        icon: <Handshake size={16} />,
        iconColor: C.green.fg,
        iconBg: C.green.bg,
        shortcut: "N D",
        keywords: ["deal", "new", "create", "חדש", "opportunity"],
        action: () => onQuickAdd("deal"),
      },
      {
        id: "qa-new-task",
        type: "action",
        title: "משימה חדשה",
        subtitle: "צור משימה לעקוב אחריה",
        icon: <CheckSquare size={16} />,
        iconColor: C.purple.fg,
        iconBg: C.purple.bg,
        shortcut: "N T",
        keywords: ["task", "todo", "new", "צור", "משימה"],
        action: () => onQuickAdd("task"),
      },
      {
        id: "qa-new-lead",
        type: "action",
        title: "ליד חדש",
        subtitle: "הוסף ליד דרך איש קשר חדש",
        icon: <Target size={16} />,
        iconColor: C.orange.fg,
        iconBg: C.orange.bg,
        keywords: ["lead", "prospect", "ליד", "new"],
        action: () => onQuickAdd("contact"),
      },
      {
        id: "qa-new-ticket",
        type: "action",
        title: "פנייה חדשה",
        subtitle: "פתח קריאת שירות",
        icon: <Ticket size={16} />,
        iconColor: C.orange.fg,
        iconBg: C.orange.bg,
        shortcut: "N K",
        keywords: ["ticket", "support", "פנייה", "קריאה"],
        action: () => onQuickAdd("ticket"),
      },
      {
        id: "qa-new-company",
        type: "action",
        title: "חברה חדשה",
        subtitle: "הוסף חברה חדשה",
        icon: <Building2 size={16} />,
        iconColor: C.teal.fg,
        iconBg: C.teal.bg,
        keywords: ["company", "business", "חברה", "new"],
        action: () => go("/companies?new=1"),
      },
      {
        id: "qa-invite-member",
        type: "action",
        title: "הזמן חבר צוות",
        subtitle: "הוסף משתמש לסביבת העבודה",
        icon: <Users size={16} />,
        iconColor: C.primary.fg,
        iconBg: C.primary.bg,
        keywords: ["invite", "member", "team", "הזמן", "חבר"],
        action: () => go("/settings?tab=members"),
      },
    ],
  };
}

function buildNavigation(
  moduleLabels: Record<string, string>,
  go: (path: string) => void,
): ResultGroup {
  function label(key: string, fallback: string) {
    return moduleLabels[key] || fallback;
  }
  return {
    label: "ניווט",
    items: [
      {
        id: "nav-dashboard",
        type: "navigation",
        title: label("dashboard", "דשבורד"),
        icon: <LayoutDashboard size={16} />,
        iconColor: C.primary.fg,
        iconBg: C.primary.bg,
        shortcut: "G D",
        keywords: ["dashboard", "home", "דשבורד"],
        action: () => go("/dashboard"),
      },
      {
        id: "nav-contacts",
        type: "navigation",
        title: label("contacts", "אנשי קשר"),
        icon: <Users size={16} />,
        iconColor: C.blue.fg,
        iconBg: C.blue.bg,
        shortcut: "G C",
        keywords: ["contacts", "people", "אנשי קשר"],
        action: () => go("/contacts"),
      },
      {
        id: "nav-companies",
        type: "navigation",
        title: label("companies", "חברות"),
        icon: <Building2 size={16} />,
        iconColor: C.teal.fg,
        iconBg: C.teal.bg,
        keywords: ["companies", "business", "חברות"],
        action: () => go("/companies"),
      },
      {
        id: "nav-deals",
        type: "navigation",
        title: label("deals", "עסקאות"),
        icon: <Handshake size={16} />,
        iconColor: C.green.fg,
        iconBg: C.green.bg,
        shortcut: "G E",
        keywords: ["deals", "pipeline", "עסקאות"],
        action: () => go("/deals"),
      },
      {
        id: "nav-leads",
        type: "navigation",
        title: label("leads", "לידים"),
        icon: <Target size={16} />,
        iconColor: C.orange.fg,
        iconBg: C.orange.bg,
        keywords: ["leads", "לידים"],
        action: () => go("/leads"),
      },
      {
        id: "nav-tasks",
        type: "navigation",
        title: label("tasks", "משימות"),
        icon: <CheckSquare size={16} />,
        iconColor: C.purple.fg,
        iconBg: C.purple.bg,
        shortcut: "G T",
        keywords: ["tasks", "todo", "משימות"],
        action: () => go("/tasks"),
      },
      {
        id: "nav-tickets",
        type: "navigation",
        title: label("tickets", "קריאות שירות"),
        icon: <Ticket size={16} />,
        iconColor: C.orange.fg,
        iconBg: C.orange.bg,
        shortcut: "G K",
        keywords: ["tickets", "support", "פניות", "קריאות"],
        action: () => go("/tickets"),
      },
      {
        id: "nav-documents",
        type: "navigation",
        title: label("documents", "מסמכים"),
        icon: <FileText size={16} />,
        iconColor: C.primary.fg,
        iconBg: C.primary.bg,
        keywords: ["documents", "files", "מסמכים"],
        action: () => go("/documents"),
      },
      {
        id: "nav-knowledge",
        type: "navigation",
        title: label("knowledge", "מאגר ידע"),
        icon: <BookOpen size={16} />,
        iconColor: C.blue.fg,
        iconBg: C.blue.bg,
        keywords: ["knowledge", "kb", "wiki", "ידע"],
        action: () => go("/knowledge"),
      },
      {
        id: "nav-templates",
        type: "navigation",
        title: label("templates", "תבניות"),
        icon: <ListChecks size={16} />,
        iconColor: C.blue.fg,
        iconBg: C.blue.bg,
        keywords: ["templates", "תבניות"],
        action: () => go("/templates"),
      },
      {
        id: "nav-automations",
        type: "navigation",
        title: label("automations", "אוטומציות"),
        icon: <Zap size={16} />,
        iconColor: C.orange.fg,
        iconBg: C.orange.bg,
        keywords: ["automations", "workflows", "אוטומציות"],
        action: () => go("/automations"),
      },
      {
        id: "nav-reports",
        type: "navigation",
        title: label("reports", "דוחות"),
        icon: <FileBarChart size={16} />,
        iconColor: C.purple.fg,
        iconBg: C.purple.bg,
        keywords: ["reports", "דוחות"],
        action: () => go("/reports"),
      },
      {
        id: "nav-analytics",
        type: "navigation",
        title: label("analytics", "ניתוחים"),
        icon: <BarChart3 size={16} />,
        iconColor: C.primary.fg,
        iconBg: C.primary.bg,
        keywords: ["analytics", "charts", "ניתוחים"],
        action: () => go("/analytics"),
      },
      {
        id: "nav-history",
        type: "navigation",
        title: label("history", "היסטוריה"),
        icon: <History size={16} />,
        iconColor: C.gray.fg,
        iconBg: C.gray.bg,
        keywords: ["history", "log", "היסטוריה"],
        action: () => go("/history"),
      },
      {
        id: "nav-import",
        type: "navigation",
        title: label("import", "ייבוא"),
        icon: <Upload size={16} />,
        iconColor: C.primary.fg,
        iconBg: C.primary.bg,
        keywords: ["import", "upload", "ייבוא", "csv"],
        action: () => go("/import"),
      },
      {
        id: "nav-settings",
        type: "navigation",
        title: "הגדרות",
        icon: <Settings size={16} />,
        iconColor: C.gray.fg,
        iconBg: C.gray.bg,
        shortcut: "G S",
        keywords: ["settings", "config", "הגדרות"],
        action: () => go("/settings"),
      },
    ],
  };
}

function buildSettingsShortcuts(go: (path: string) => void): ResultGroup {
  return {
    label: "הגדרות",
    items: [
      {
        id: "set-open",
        type: "settings",
        title: "פתח הגדרות",
        icon: <Settings size={16} />,
        iconColor: C.gray.fg,
        iconBg: C.gray.bg,
        keywords: ["settings", "הגדרות"],
        action: () => go("/settings"),
      },
      {
        id: "set-module-labels",
        type: "settings",
        title: "שנה שמות מודולים",
        subtitle: "מותג את שמות המודולים בסביבת העבודה",
        icon: <TypeIcon size={16} />,
        iconColor: C.purple.fg,
        iconBg: C.purple.bg,
        keywords: ["module", "labels", "rename", "שמות", "מודולים"],
        action: () => go("/settings?tab=module-labels"),
      },
      {
        id: "set-custom-fields",
        type: "settings",
        title: "שדות מותאמים",
        subtitle: "הוסף שדות מותאמים לרשומות",
        icon: <TypeIcon size={16} />,
        iconColor: C.primary.fg,
        iconBg: C.primary.bg,
        keywords: ["custom", "fields", "שדות", "מותאמים"],
        action: () => go("/settings?tab=custom-fields"),
      },
      {
        id: "set-branding",
        type: "settings",
        title: "מיתוג",
        subtitle: "לוגו, צבע מותג ותצוגה",
        icon: <Palette size={16} />,
        iconColor: C.blue.fg,
        iconBg: C.blue.bg,
        keywords: ["branding", "logo", "color", "מיתוג", "לוגו"],
        action: () => go("/settings?tab=branding"),
      },
      {
        id: "set-members",
        type: "settings",
        title: "חברי צוות",
        subtitle: "ניהול הזמנות, תפקידים והרשאות",
        icon: <Users size={16} />,
        iconColor: C.green.fg,
        iconBg: C.green.bg,
        keywords: ["members", "team", "חברי צוות", "invite"],
        action: () => go("/settings?tab=members"),
      },
    ],
  };
}

function buildSearchGroups(
  data: SearchResults,
  onOpen: (item: RecentItem) => void,
): ResultGroup[] {
  const groups: ResultGroup[] = [];

  if (data.contacts.length > 0) {
    groups.push({
      label: "אנשי קשר",
      items: data.contacts.map((c) => ({
        id: `search-contact-${c.id}`,
        type: "contact" as const,
        title: c.fullName,
        subtitle: c.email || c.phone || "",
        icon: <Users size={16} />,
        iconColor: C.blue.fg,
        iconBg: C.blue.bg,
        action: () =>
          onOpen({
            id: `contact:${c.id}`,
            entity: "contact",
            title: c.fullName,
            subtitle: c.email || c.phone || undefined,
            path: `/contacts/${c.id}`,
            at: 0,
          }),
      })),
    });
  }

  if (data.deals.length > 0) {
    groups.push({
      label: "עסקאות",
      items: data.deals.map((d) => ({
        id: `search-deal-${d.id}`,
        type: "deal" as const,
        title: d.title,
        subtitle: d.value
          ? `₪${d.value.toLocaleString()}`
          : STAGE_LABELS[d.stage] || d.stage,
        icon: <Handshake size={16} />,
        iconColor: C.green.fg,
        iconBg: C.green.bg,
        action: () =>
          onOpen({
            id: `deal:${d.id}`,
            entity: "deal",
            title: d.title,
            subtitle: d.value ? `₪${d.value.toLocaleString()}` : undefined,
            path: `/deals?open=${d.id}`,
            at: 0,
          }),
      })),
    });
  }

  if (data.companies.length > 0) {
    groups.push({
      label: "חברות",
      items: data.companies.map((c) => ({
        id: `search-company-${c.id}`,
        type: "company" as const,
        title: c.name,
        subtitle: c.industry || "",
        icon: <Building2 size={16} />,
        iconColor: C.teal.fg,
        iconBg: C.teal.bg,
        action: () =>
          onOpen({
            id: `company:${c.id}`,
            entity: "company",
            title: c.name,
            subtitle: c.industry || undefined,
            path: `/companies/${c.id}`,
            at: 0,
          }),
      })),
    });
  }

  if (data.tickets.length > 0) {
    groups.push({
      label: "פניות",
      items: data.tickets.map((t) => ({
        id: `search-ticket-${t.id}`,
        type: "ticket" as const,
        title: t.subject,
        subtitle: TICKET_STATUS_LABELS[t.status] || t.status,
        icon: <Ticket size={16} />,
        iconColor: C.orange.fg,
        iconBg: C.orange.bg,
        action: () =>
          onOpen({
            id: `ticket:${t.id}`,
            entity: "ticket",
            title: t.subject,
            subtitle: TICKET_STATUS_LABELS[t.status] || t.status,
            path: `/tickets/${t.id}`,
            at: 0,
          }),
      })),
    });
  }

  return groups;
}

function buildRecents(
  recents: RecentItem[],
  onOpen: (item: RecentItem) => void,
): ResultGroup | null {
  if (recents.length === 0) return null;
  const ICONS: Record<RecentItem["entity"], { node: ReactNode; color: typeof C.blue }> = {
    contact: { node: <Users size={16} />, color: C.blue },
    deal: { node: <Handshake size={16} />, color: C.green },
    company: { node: <Building2 size={16} />, color: C.teal },
    ticket: { node: <Ticket size={16} />, color: C.orange },
  };
  return {
    label: "נצפו לאחרונה",
    items: recents.map((r) => {
      const icon = ICONS[r.entity];
      return {
        id: `recent-${r.id}`,
        type: "recent",
        title: r.title,
        subtitle: r.subtitle,
        icon: icon.node,
        iconColor: icon.color.fg,
        iconBg: icon.color.bg,
        action: () => onOpen(r),
      };
    }),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────

export default function CommandPalette({
  open,
  onClose,
  onQuickAdd,
  onOpenShortcuts,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [chord, setChord] = useState<"g" | "n" | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  const navigate = useNavigate();
  const { moduleLabels } = useWorkspaceOptions();

  // Search query is used when user has typed something substantive.
  const isSearching = debouncedQuery.trim().length >= 2;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["command-palette-search", debouncedQuery.trim()],
    queryFn: () => globalSearch(debouncedQuery.trim()),
    enabled: isSearching,
    staleTime: 30_000,
  });

  // ── Close / navigate helper ────────────────────────────────────────────
  const go = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const openRecent = useCallback(
    (item: RecentItem) => {
      pushRecent({
        id: item.id,
        entity: item.entity,
        title: item.title,
        subtitle: item.subtitle,
        path: item.path,
      });
      go(item.path);
    },
    [go],
  );

  const quickAdd = useCallback(
    (type: QuickAddType) => {
      onClose();
      // Delay so the palette fully closes before QuickAdd opens —
      // prevents scroll-lock races and Escape stealing focus.
      setTimeout(() => onQuickAdd(type), 50);
    },
    [onClose, onQuickAdd],
  );

  // ── Reset state on open ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    setChord(null);
    setRecents(readRecents());
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // ── Build groups ───────────────────────────────────────────────────────
  const staticGroups = useMemo<ResultGroup[]>(() => {
    const g: ResultGroup[] = [];
    const recentsGroup = buildRecents(recents, openRecent);
    if (recentsGroup) g.push(recentsGroup);
    g.push(buildQuickActions(quickAdd, go));
    g.push(buildNavigation(moduleLabels, go));
    g.push(buildSettingsShortcuts(go));
    return g;
  }, [recents, moduleLabels, quickAdd, go, openRecent]);

  // Filtered static groups (client-side) + server search groups.
  const groups: ResultGroup[] = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    // Filter static groups client-side.
    const filteredStatic = staticGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => itemMatches(i, q)),
      }))
      .filter((g) => g.items.length > 0);

    if (isSearching) {
      const serverGroups = data ? buildSearchGroups(data, openRecent) : [];
      // Show filtered quick/nav/settings FIRST, then server-side search results.
      return [...filteredStatic, ...serverGroups];
    }

    // Idle / short query — just the filtered static set.
    return filteredStatic;
  }, [staticGroups, debouncedQuery, isSearching, data, openRecent]);

  // Flattened list for keyboard navigation across groups.
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Reset selection when the list structure changes.
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, isSearching, data]);

  useEffect(() => {
    if (selectedIndex > flatItems.length - 1) {
      setSelectedIndex(flatItems.length > 0 ? flatItems.length - 1 : 0);
    }
  }, [flatItems.length, selectedIndex]);

  // Scroll selected item into view.
  useEffect(() => {
    if (!listRef.current) return;
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ── Chord handling (inside palette) ─────────────────────────────────────
  // Supports: G → D/C/E/T/K/S and N → C/D/T/K
  const clearChord = useCallback(() => {
    setChord(null);
    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  const startChord = useCallback(
    (lead: "g" | "n") => {
      setChord(lead);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      chordTimerRef.current = setTimeout(() => {
        setChord(null);
        chordTimerRef.current = null;
      }, 900);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, []);

  // ── Keyboard handling on input ──────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Escape closes.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // "?" as trigger — when query is empty, open shortcuts help.
      if (e.key === "?" && !query) {
        e.preventDefault();
        if (onOpenShortcuts) {
          onClose();
          setTimeout(onOpenShortcuts, 50);
        }
        return;
      }

      // Chord second key.
      if (chord) {
        const k = e.key.toLowerCase();
        // Only match when the input is empty (user is commanding, not typing).
        if (!query && /^[a-z]$/.test(k)) {
          e.preventDefault();
          const routes: Record<string, string> = {
            d: "/dashboard",
            c: "/contacts",
            e: "/deals",
            t: "/tasks",
            k: "/tickets",
            s: "/settings",
          };
          if (chord === "g" && routes[k]) {
            clearChord();
            go(routes[k]);
            return;
          }
          if (chord === "n") {
            clearChord();
            if (k === "c") return quickAdd("contact");
            if (k === "d") return quickAdd("deal");
            if (k === "t") return quickAdd("task");
            if (k === "k") return quickAdd("ticket");
          }
          clearChord();
          return;
        }
        clearChord();
      }

      // Chord first key — only if input empty.
      if (!query) {
        if (e.key.toLowerCase() === "g") {
          e.preventDefault();
          startChord("g");
          return;
        }
        if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          startChord("n");
          return;
        }
      }

      // Navigation.
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (flatItems.length === 0) return;
        setSelectedIndex((i) => (i < flatItems.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (flatItems.length === 0) return;
        setSelectedIndex((i) => (i > 0 ? i - 1 : flatItems.length - 1));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setSelectedIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setSelectedIndex(flatItems.length - 1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        flatItems[selectedIndex]?.action();
        return;
      }
    },
    [
      chord,
      clearChord,
      flatItems,
      go,
      onClose,
      onOpenShortcuts,
      query,
      quickAdd,
      selectedIndex,
      startChord,
    ],
  );

  // ── Global escape + scroll lock ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const showLoading = isSearching && (isLoading || isFetching) && !data;
  const showEmpty =
    !showLoading &&
    flatItems.length === 0 &&
    (query.trim().length > 0 || isSearching);
  const showIdleHint = !query && flatItems.length === 0;

  // We walk the flattened index alongside the rendered list.
  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="פלטת פקודות"
      dir="rtl"
    >
      <div
        className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-[560px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search input ──────────────────────────────────────────── */}
        <div className="p-3 border-b border-[#E6E9EF]">
          <div className="relative">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="חפש, נווט או הרץ פעולה..."
              className="w-full pr-10 pl-28 py-2.5 bg-[#F5F6F8] rounded-xl text-sm text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:bg-white transition-colors"
              aria-label="חיפוש ופעולות"
              aria-controls="command-palette-list"
              aria-activedescendant={
                flatItems[selectedIndex]
                  ? `cp-item-${flatItems[selectedIndex].id}`
                  : undefined
              }
              autoComplete="off"
              spellCheck={false}
            />
            {/* Chord indicator / clear button on the left (LTR side in RTL flow) */}
            {chord ? (
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-mono"
                dir="ltr"
              >
                <Kbd>{chord.toUpperCase()}</Kbd>
                <span className="text-[#9699A6]">→ …</span>
              </span>
            ) : (
              isSearching && isFetching && (
                <Loader2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9699A6] animate-spin"
                />
              )
            )}
          </div>
        </div>

        {/* ── Results ───────────────────────────────────────────────── */}
        <div
          ref={listRef}
          id="command-palette-list"
          className="max-h-[420px] overflow-y-auto overscroll-contain relative"
          role="listbox"
        >
          {/* Loading */}
          {showLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="text-[#0073EA] animate-spin" />
            </div>
          )}

          {/* Idle state */}
          {showIdleHint && (
            <div className="flex flex-col items-center py-10 text-[#9699A6]">
              <CommandIcon size={28} className="mb-2 opacity-40" />
              <span className="text-sm">התחל להקליד כדי לחפש...</span>
              <div className="flex items-center gap-3 mt-4 text-[11px]" dir="ltr">
                <span className="flex items-center gap-1">
                  <Kbd>G</Kbd>
                  <Kbd>D</Kbd>
                  <span className="text-[#9699A6] mr-1">Dashboard</span>
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>N</Kbd>
                  <Kbd>C</Kbd>
                  <span className="text-[#9699A6] mr-1">New Contact</span>
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>?</Kbd>
                  <span className="text-[#9699A6] mr-1">Shortcuts</span>
                </span>
              </div>
            </div>
          )}

          {/* Empty */}
          {showEmpty && (
            <div className="flex flex-col items-center py-10 text-[#9699A6]">
              <SearchX size={28} className="mb-2 opacity-50" />
              <span className="text-sm">לא נמצאו תוצאות</span>
              <span className="text-xs mt-1 opacity-70">
                נסה מילות חיפוש אחרות
              </span>
            </div>
          )}

          {/* Groups */}
          {!showLoading &&
            groups.map((group) => (
              <div key={group.label}>
                {/* Sticky category header */}
                <div className="sticky top-0 z-[1] flex items-center gap-2 px-4 py-1.5 bg-[#F5F6F8]/95 backdrop-blur-sm border-b border-[#E6E9EF]/60">
                  <span className="text-[10px] font-bold text-[#9699A6] uppercase tracking-wide">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-[#9699A6]">
                    {group.items.length}
                  </span>
                </div>

                {group.items.map((item) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      id={`cp-item-${item.id}`}
                      ref={isSelected ? selectedRef : null}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                        isSelected
                          ? "bg-[#0073EA]/8"
                          : "hover:bg-[#F5F6F8]/60"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: item.iconBg,
                          color: item.iconColor,
                        }}
                      >
                        {item.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#323338] truncate block">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-[#9699A6] truncate block">
                            {item.subtitle}
                          </span>
                        )}
                      </div>

                      {/* Right-side hint cluster */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && !isSelected && (
                          <ShortcutBadge value={item.shortcut} />
                        )}
                        {isSelected ? (
                          <span
                            className="flex items-center gap-1.5 text-[#0073EA]"
                            aria-hidden="true"
                          >
                            {item.shortcut && <ShortcutBadge value={item.shortcut} highlighted />}
                            <ArrowLeft
                              size={14}
                              className="opacity-90"
                            />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="px-4 py-2 border-t border-[#E6E9EF] flex items-center gap-4 text-[10px] text-[#9699A6] bg-[#F5F6F8]/30" dir="ltr">
          <span className="flex items-center gap-1">
            <Kbd>↑↓</Kbd>
            <span className="text-[#676879]">navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd>
            <span className="text-[#676879]">open</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd>
            <span className="text-[#676879]">close</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>?</Kbd>
            <span className="text-[#676879]">shortcuts</span>
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Kbd>{MOD}</Kbd>
            <Kbd>K</Kbd>
            <span className="text-[#676879]">toggle</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers — presentational
// ──────────────────────────────────────────────────────────────────────────

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] text-[10px] font-mono text-[#676879] shadow-[0_1px_0_rgba(0,0,0,0.04)] min-w-[18px] inline-flex items-center justify-center">
      {children}
    </kbd>
  );
}

function ShortcutBadge({
  value,
  highlighted,
}: {
  value: string;
  highlighted?: boolean;
}) {
  // Split tokens by space, show each as its own kbd chip.
  const parts = value.split(/\s+/).filter(Boolean);
  return (
    <span className="flex items-center gap-1" dir="ltr">
      {parts.map((p, i) => (
        <kbd
          key={i}
          className={
            highlighted
              ? "px-1.5 py-0.5 bg-white rounded border border-[#0073EA]/30 text-[10px] font-mono text-[#0073EA] shadow-[0_1px_0_rgba(0,0,0,0.04)] min-w-[18px] inline-flex items-center justify-center"
              : "px-1.5 py-0.5 bg-[#F5F6F8] rounded border border-[#E6E9EF] text-[10px] font-mono text-[#676879] min-w-[18px] inline-flex items-center justify-center"
          }
        >
          {p}
        </kbd>
      ))}
    </span>
  );
}
