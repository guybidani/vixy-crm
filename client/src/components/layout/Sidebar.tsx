import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  Inbox,
  CheckSquare,
  Clock,
  BarChart3,
  BarChart2,
  Ticket,
  Headphones,
  BookOpen,
  FileText,
  Settings,
  ChevronLeft,
  ChevronDown,
  Plus,
  Zap,
  Upload,
  Lock,
  LayoutGrid,
  Star,
  StarOff,
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";
import { NAV_ITEMS } from "../../lib/constants";
import { listBoards, updateBoard } from "../../api/boards";
import { getNavPermissions } from "../../api/settings";
import CreateBoardModal from "../boards/CreateBoardModal";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  Inbox,
  CheckSquare,
  Clock,
  BarChart3,
  BarChart2,
  Ticket,
  Headphones,
  BookOpen,
  FileText,
  Settings,
  Zap,
  Upload,
};

type ProductMode = "boards" | "crm";
const PRODUCT_MODE_KEY = "vixy-product-mode";
const NAV_LABELS_KEY = "vixy-nav-labels";
const BOARDS_OPEN_KEY = "vixy-boards-open";
const FAVORITES_KEY = "vixy-nav-favorites";
const FAVORITES_OPEN_KEY = "vixy-favorites-open";
const RECENT_OPEN_KEY = "vixy-recent-open";
const THEME_KEY = "vixy-theme";
// Shared with CommandPalette — do not rename without updating that component too
const RECENT_ITEMS_KEY = "vixy-crm:command-palette:recent";

function loadNavLabels(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NAV_LABELS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNavLabels(labels: Record<string, string>) {
  localStorage.setItem(NAV_LABELS_KEY, JSON.stringify(labels));
}

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveFavorites(keys: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

/* Recent items — shared with CommandPalette */
interface RecentItem {
  id: string;
  entity: "contact" | "deal" | "company" | "ticket";
  title: string;
  subtitle?: string;
  path: string;
  at: number;
}

function loadRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentItem =>
        x && typeof x.id === "string" && typeof x.path === "string" && typeof x.title === "string",
    );
  } catch {
    return [];
  }
}

const RECENT_ENTITY_ICON: Record<RecentItem["entity"], LucideIcon> = {
  contact: Users,
  deal: Handshake,
  company: Building2,
  ticket: Ticket,
};

/* ── Inline editable label ── */
function EditableLabel({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (newVal: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="bg-white border border-[#0073EA] rounded px-1.5 py-0.5 text-[13px] text-[#323338] outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] w-full min-w-0"
        aria-label="שנה שם"
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={() => {
          if (editVal.trim() && editVal !== value) {
            onSave(editVal.trim());
          }
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setEditVal(value);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onClick={(e) => e.preventDefault()}
      />
    );
  }

  return (
    <span
      className={cn("truncate cursor-default select-none", className)}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditVal(value);
        setEditing(true);
      }}
    >
      {value}
    </span>
  );
}

/* ── Tooltip shown on hover of collapsed rail items (RTL: appears to the LEFT of the rail) ── */
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#323338] text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150 delay-150 z-[60] shadow-lg"
    >
      {label}
    </span>
  );
}

/* ── Product rail icon button ── */
function ProductBtn({
  active,
  label,
  icon: Icon,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative group flex flex-col items-center justify-center w-10 h-10 rounded-[6px] transition-all duration-150",
        active ? "bg-white shadow-[0_1px_6px_rgba(0,0,0,0.12)]" : "hover:bg-white/60",
      )}
    >
      <Icon
        size={18}
        style={{ color: active ? color : "#9699A6" }}
        className="transition-colors duration-150"
      />
      <span
        className="text-[9px] font-semibold mt-0.5 leading-none"
        style={{ color: active ? color : "#9699A6" }}
      >
        {label}
      </span>
      {active && (
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-l-full"
          style={{ backgroundColor: color }}
        />
      )}
      <RailTooltip label={label} />
    </button>
  );
}

/* ── Shared styles for a nav row ── */
const navRowBase =
  "group relative flex items-center gap-2.5 rounded-[4px] text-[13px] px-2.5 py-2 mb-0.5 transition-colors duration-150";
const navRowIdle = "text-[#676879] font-medium hover:bg-[#F6F7FB] hover:text-[#323338]";
const navRowActive =
  "bg-[#F0F4FF] text-[#0073EA] font-semibold border-r-[3px] border-[#0073EA]";

/* ── Section header (11px uppercase, #676879, 0.6px tracking) ── */
function SectionHeader({
  label,
  icon: Icon,
  open,
  onToggle,
  rightSlot,
}: {
  label: string;
  icon?: LucideIcon;
  open: boolean;
  onToggle?: () => void;
  rightSlot?: React.ReactNode;
}) {
  const clickable = Boolean(onToggle);
  return (
    <div className="flex items-center justify-between px-2.5 pt-3 pb-1 group">
      <button
        onClick={onToggle}
        disabled={!clickable}
        className={cn(
          "flex items-center gap-1.5 flex-1 min-w-0 text-right",
          clickable ? "cursor-pointer" : "cursor-default",
        )}
        aria-expanded={open}
      >
        {clickable && (
          <ChevronDown
            size={11}
            className={cn(
              "text-[#9699A6] transition-transform duration-200 flex-shrink-0",
              open ? "" : "-rotate-90",
            )}
          />
        )}
        {Icon && <Icon size={12} className="text-[#9699A6] flex-shrink-0" />}
        <span
          className="text-[11px] font-semibold uppercase text-[#676879] truncate"
          style={{ letterSpacing: "0.6px" }}
        >
          {label}
        </span>
      </button>
      {rightSlot && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout, workspaces, currentWorkspaceId, selectWorkspace } = useAuth();
  const { moduleLabels, branding } = useWorkspaceOptions();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const logoUrl = branding.logoUrl;
  const brandColor = branding.brandColor || "#0073EA";
  const isOwner = currentWs?.role === "OWNER";

  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(() => {
    try {
      return localStorage.getItem(BOARDS_OPEN_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [favoritesExpanded, setFavoritesExpanded] = useState(() => {
    try {
      return localStorage.getItem(FAVORITES_OPEN_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [recentExpanded, setRecentExpanded] = useState(() => {
    try {
      return localStorage.getItem(RECENT_OPEN_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [navLabels, setNavLabels] = useState<Record<string, string>>(loadNavLabels);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [recents, setRecents] = useState<RecentItem[]>(() => loadRecents());
  const [productMode, setProductMode] = useState<ProductMode>(() => {
    return (localStorage.getItem(PRODUCT_MODE_KEY) as ProductMode) || "boards";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const wsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: listBoards,
  });

  const { data: navPermData } = useQuery({
    queryKey: ["nav-permissions", currentWorkspaceId],
    queryFn: getNavPermissions,
    enabled: !!currentWorkspaceId && !isOwner,
  });

  const filteredNavItems = useMemo(() => {
    if (isOwner || !navPermData?.navPermissions) return NAV_ITEMS;
    const memberId = currentWs?.memberId;
    if (!memberId) return NAV_ITEMS;
    const allowed = navPermData.navPermissions[memberId];
    if (!allowed) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => allowed.includes(item.key));
  }, [isOwner, navPermData, currentWs?.memberId]);

  const favoriteItems = useMemo(
    () =>
      favorites
        .map((key) => filteredNavItems.find((i) => i.key === key))
        .filter((x): x is (typeof NAV_ITEMS)[number] => Boolean(x)),
    [favorites, filteredNavItems],
  );

  const updateBoardMut = useMutation({
    mutationFn: (p: { id: string; name: string }) => updateBoard(p.id, { name: p.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: () => toast.error("שגיאה בעדכון לוח"),
  });

  const handleNavRename = (key: string, newLabel: string) => {
    const updated = { ...navLabels, [key]: newLabel };
    setNavLabels(updated);
    saveNavLabels(updated);
  };

  const getNavLabel = (item: (typeof NAV_ITEMS)[number]) => {
    // Priority: localStorage override > workspace moduleLabels > constant default
    return navLabels[item.key] || moduleLabels[item.key] || item.label;
  };

  const toggleFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      saveFavorites(next);
      return next;
    });
  }, []);

  const togglePersisted = (
    setter: (v: boolean) => void,
    current: boolean,
    storageKey: string,
  ) => {
    const next = !current;
    setter(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      /* ignore */
    }
  };

  const switchProduct = (mode: ProductMode) => {
    setProductMode(mode);
    try {
      localStorage.setItem(PRODUCT_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const applyTheme = (next: "light" | "dark") => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  };

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileOpen || !onMobileClose) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onMobileClose!();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen, onMobileClose]);

  // Refresh recents when storage changes (other tabs) and on window focus
  useEffect(() => {
    function refresh() {
      setRecents(loadRecents());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === RECENT_ITEMS_KEY) refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Close dropdown menus on outside click / Escape
  useEffect(() => {
    if (!wsMenuOpen && !userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (wsMenuOpen && wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) {
        setWsMenuOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setWsMenuOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [wsMenuOpen, userMenuOpen]);

  /* User initials for avatar */
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  const userRoleLabel =
    currentWs?.role === "OWNER"
      ? "בעלים"
      : currentWs?.role === "ADMIN"
        ? "מנהל"
        : currentWs?.role === "AGENT"
          ? "נציג"
          : "";

  const showPanel = !collapsed;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 h-screen bg-[#F5F6F8] z-50 flex flex-row overflow-hidden",
          // Smooth width animation for expand/collapse (200ms ease)
          "transition-[width,transform] duration-200 ease-in-out",
          showPanel ? "w-[288px]" : "w-12",
          // Mobile slide in/out
          mobileOpen ? "translate-x-0" : "translate-x-full",
          "md:translate-x-0",
        )}
        aria-label="תפריט ניווט"
      >
        {/* ── Main Nav Panel (240px when expanded, 0px when collapsed) ── */}
        <div
          className={cn(
            "flex flex-col min-w-0 bg-[#F5F6F8] overflow-hidden",
            // Subtle shadow separating panel from rail (RTL: shadow on the LEFT edge of panel, facing the rail)
            "shadow-[-1px_0_0_rgba(0,0,0,0.04),-4px_0_12px_-6px_rgba(0,0,0,0.06)]",
            "transition-[width,opacity] duration-200 ease-in-out",
            showPanel ? "w-[240px] opacity-100" : "w-0 opacity-0 pointer-events-none",
          )}
          aria-hidden={!showPanel}
        >
          {/* Workspace switcher */}
          <div className="px-2 pt-3 pb-2 border-b border-[#EEEFF3] relative" ref={wsMenuRef}>
            <button
              onClick={() => setWsMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[6px] hover:bg-[#F6F7FB] transition-colors"
              aria-haspopup="menu"
              aria-expanded={wsMenuOpen}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={currentWs?.name || "לוגו"}
                  className="flex-shrink-0 w-8 h-8 rounded-[8px] object-cover shadow-sm bg-white"
                />
              ) : (
                <div
                  className="flex-shrink-0 rounded-[8px] flex items-center justify-center shadow-sm w-8 h-8"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)`,
                  }}
                >
                  <span className="text-white font-bold text-sm">
                    {(currentWs?.name || "V").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0 text-right">
                <span className="text-[13px] font-bold text-[#323338] truncate block leading-tight">
                  {currentWs?.name || "Vixy CRM"}
                </span>
                <span className="text-[11px] text-[#9699A6] leading-tight block mt-0.5 truncate">
                  {productMode === "crm" ? "CRM" : "Work Management"}
                </span>
              </div>
              <ChevronsUpDown size={14} className="text-[#9699A6] flex-shrink-0" />
            </button>

            {wsMenuOpen && (
              <div
                role="menu"
                className="absolute top-full right-2 left-2 mt-1 bg-white border border-[#E6E9EF] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1 z-[60]"
              >
                {workspaces.length === 0 && (
                  <div className="px-3 py-2 text-[12px] text-[#9699A6]">אין סביבות עבודה</div>
                )}
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    role="menuitem"
                    onClick={() => {
                      if (ws.id !== currentWorkspaceId) selectWorkspace(ws.id);
                      setWsMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-[13px] text-right hover:bg-[#F6F7FB] transition-colors",
                      ws.id === currentWorkspaceId
                        ? "text-[#0073EA] font-semibold"
                        : "text-[#323338]",
                    )}
                  >
                    <div
                      className="w-5 h-5 rounded-[4px] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)`,
                      }}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate flex-1">{ws.name}</span>
                    {ws.id === currentWorkspaceId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0073EA] flex-shrink-0" />
                    )}
                  </button>
                ))}
                <div className="border-t border-[#E6E9EF] mt-1 pt-1">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setWsMenuOpen(false);
                      navigate("/settings?tab=workspaces");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#0073EA] hover:bg-[#F0F4FF] transition-colors text-right"
                  >
                    <Plus size={14} />
                    <span>צור סביבת עבודה חדשה</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nav Content (scrolls) */}
          <nav className="flex-1 overflow-y-auto px-1.5 pb-2" aria-label="ניווט ראשי">
            {/* ── Favorites section ── */}
            <SectionHeader
              label="מועדפים"
              icon={Star}
              open={favoritesExpanded}
              onToggle={() =>
                togglePersisted(setFavoritesExpanded, favoritesExpanded, FAVORITES_OPEN_KEY)
              }
            />
            {favoritesExpanded && (
              <div>
                {favoriteItems.length === 0 ? (
                  <p className="px-2.5 py-1.5 text-[11px] text-[#9699A6] leading-relaxed">
                    הוסף לכאן את המודולים המועדפים
                  </p>
                ) : (
                  favoriteItems.map((item) => {
                    const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                    const label = getNavLabel(item);
                    return (
                      <NavLink
                        key={`fav-${item.key}`}
                        to={item.path}
                        end={item.path === "/dashboard"}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          cn(navRowBase, isActive ? navRowActive : navRowIdle)
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              size={18}
                              className={cn(
                                "flex-shrink-0 transition-colors duration-150",
                                isActive
                                  ? "text-[#0073EA]"
                                  : "text-[#676879] group-hover:text-[#323338]",
                              )}
                            />
                            <span className="truncate flex-1">{label}</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(item.key);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white text-[#FDAB3D] transition-opacity flex-shrink-0"
                              aria-label="הסר ממועדפים"
                            >
                              <Star size={13} fill="currentColor" />
                            </button>
                          </>
                        )}
                      </NavLink>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Recent section (only shown if we have any) ── */}
            {recents.length > 0 && (
              <>
                <SectionHeader
                  label="אחרונים"
                  icon={Clock}
                  open={recentExpanded}
                  onToggle={() =>
                    togglePersisted(setRecentExpanded, recentExpanded, RECENT_OPEN_KEY)
                  }
                />
                {recentExpanded && (
                  <div>
                    {recents.slice(0, 3).map((r) => {
                      const Icon = RECENT_ENTITY_ICON[r.entity] || FileText;
                      return (
                        <NavLink
                          key={`recent-${r.id}`}
                          to={r.path}
                          onClick={onMobileClose}
                          className={({ isActive }) =>
                            cn(navRowBase, isActive ? navRowActive : navRowIdle)
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                size={18}
                                className={cn(
                                  "flex-shrink-0 transition-colors duration-150",
                                  isActive
                                    ? "text-[#0073EA]"
                                    : "text-[#676879] group-hover:text-[#323338]",
                                )}
                              />
                              <span className="truncate flex-1">{r.title}</span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Workspace section ── */}
            <SectionHeader
              label={currentWs?.name || "סביבת העבודה"}
              open={productMode === "boards" ? boardsExpanded : true}
              onToggle={
                productMode === "boards"
                  ? () => togglePersisted(setBoardsExpanded, boardsExpanded, BOARDS_OPEN_KEY)
                  : undefined
              }
              rightSlot={
                productMode === "boards" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateBoardOpen(true);
                    }}
                    className="p-0.5 rounded hover:bg-white text-[#676879] hover:text-[#0073EA] transition-colors"
                    aria-label="צור בורד חדש"
                  >
                    <Plus size={13} />
                  </button>
                ) : null
              }
            />

            {/* CRM Mode: all nav items */}
            {productMode === "crm" &&
              filteredNavItems.map((item) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                const label = getNavLabel(item);
                const isFav = favorites.includes(item.key);
                return (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    end={item.path === "/dashboard"}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      cn(navRowBase, isActive ? navRowActive : navRowIdle)
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          className={cn(
                            "flex-shrink-0 transition-colors duration-150",
                            isActive
                              ? "text-[#0073EA]"
                              : "text-[#676879] group-hover:text-[#323338]",
                          )}
                        />
                        <EditableLabel
                          value={label}
                          onSave={(newLabel) => handleNavRename(item.key, newLabel)}
                          className="flex-1"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(item.key);
                          }}
                          className={cn(
                            "p-0.5 rounded hover:bg-white transition-opacity flex-shrink-0",
                            isFav
                              ? "opacity-100 text-[#FDAB3D]"
                              : "opacity-0 group-hover:opacity-100 text-[#9699A6] hover:text-[#FDAB3D]",
                          )}
                          aria-label={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}
                          title={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}
                        >
                          {isFav ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
                        </button>
                      </>
                    )}
                  </NavLink>
                );
              })}

            {/* Boards Mode: boards list (nested, indented with vertical line on the right for RTL) */}
            {productMode === "boards" && boardsExpanded && (
              <div className="relative pr-3 pl-1">
                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 right-[14px] w-px bg-[#EEEFF3]"
                />
                {boards.length === 0 && (
                  <p className="px-2.5 py-2 text-[12px] text-[#9699A6]">אין בורדים עדיין</p>
                )}
                {boards.map((board) => (
                  <NavLink
                    key={board.id}
                    to={`/boards/${board.id}`}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      cn(navRowBase, isActive ? navRowActive : navRowIdle)
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: board.color }}
                    />
                    <EditableLabel
                      value={board.name}
                      onSave={(newName) => updateBoardMut.mutate({ id: board.id, name: newName })}
                      className="flex-1"
                    />
                    {board.isPrivate && (
                      <Lock size={11} className="flex-shrink-0 text-[#6161FF] opacity-60" />
                    )}
                  </NavLink>
                ))}
                <button
                  onClick={() => setCreateBoardOpen(true)}
                  className="flex items-center gap-2 px-2.5 py-1.5 w-full text-[12px] text-[#676879] hover:text-[#0073EA] hover:bg-[#F6F7FB] rounded-[4px] transition-colors duration-150 mt-0.5 font-medium"
                >
                  <Plus size={13} />
                  <span>בורד חדש</span>
                </button>
              </div>
            )}
          </nav>

          {/* ── Bottom: Settings + User profile ── */}
          <div className="border-t border-[#EEEFF3] p-1.5 space-y-0.5">
            <NavLink
              to="/settings"
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn(navRowBase, isActive ? navRowActive : navRowIdle)
              }
            >
              {({ isActive }) => (
                <>
                  <Settings
                    size={18}
                    className={cn(
                      "flex-shrink-0 transition-colors duration-150",
                      isActive
                        ? "text-[#0073EA]"
                        : "text-[#676879] group-hover:text-[#323338]",
                    )}
                  />
                  <span className="truncate">הגדרות</span>
                </>
              )}
            </NavLink>

            {/* User profile row with dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 hover:bg-[#F6F7FB] transition-colors duration-150"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0073EA] to-[#0060C2] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[11px] font-bold leading-none">
                    {userInitials}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className="text-[13px] text-[#323338] font-semibold truncate block leading-tight">
                    {user?.name || "משתמש"}
                  </span>
                  {userRoleLabel && (
                    <span className="text-[11px] text-[#9699A6] leading-tight block mt-0.5 truncate">
                      {userRoleLabel}
                    </span>
                  )}
                </div>
                <ChevronsUpDown size={13} className="text-[#9699A6] flex-shrink-0" />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#E6E9EF] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1 z-[60]"
                >
                  <div className="px-3 py-2 border-b border-[#E6E9EF] mb-1">
                    <p className="text-[13px] font-semibold text-[#323338] truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-[#9699A6] truncate">{user?.email}</p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/settings?tab=profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F6F7FB] transition-colors text-right"
                  >
                    <UserIcon size={14} className="text-[#676879]" />
                    <span>הפרופיל שלי</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F6F7FB] transition-colors text-right"
                  >
                    {theme === "dark" ? (
                      <Sun size={14} className="text-[#676879]" />
                    ) : (
                      <Moon size={14} className="text-[#676879]" />
                    )}
                    <span>{theme === "dark" ? "מצב בהיר" : "מצב כהה"}</span>
                  </button>
                  <div className="border-t border-[#E6E9EF] mt-1 pt-1">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#FB275D] hover:bg-[#FFEEF0] transition-colors text-right"
                    >
                      <LogOut size={14} />
                      <span>יציאה</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Product Rail (always visible, 48px) ── */}
        <div
          className="w-12 flex flex-col items-center py-2 gap-1 flex-shrink-0 bg-[#F5F6F8] border-l border-[#EEEFF3]"
          role="group"
          aria-label="בחירת מוצר"
        >
          {/* Workspace logo/avatar at top */}
          <button
            className="relative group flex-shrink-0"
            onClick={() => navigate("/")}
            aria-label={currentWs?.name || "דף הבית"}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={currentWs?.name || "לוגו"}
                className="w-8 h-8 mb-1 rounded-[8px] object-cover shadow-sm bg-white"
              />
            ) : (
              <div
                className="w-8 h-8 mb-1 rounded-[8px] flex items-center justify-center shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}CC)`,
                }}
              >
                <span className="text-white font-bold text-sm">
                  {(currentWs?.name || "V").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <RailTooltip label={currentWs?.name || "Vixy CRM"} />
          </button>

          {/* Product switcher */}
          <ProductBtn
            active={productMode === "boards"}
            label="Work"
            icon={LayoutGrid}
            color="#6161FF"
            onClick={() => switchProduct("boards")}
          />
          <ProductBtn
            active={productMode === "crm"}
            label="CRM"
            icon={Users}
            color="#0073EA"
            onClick={() => switchProduct("crm")}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings (shown in rail when collapsed) */}
          {collapsed && (
            <button
              onClick={() => navigate("/settings")}
              className="relative group w-10 h-10 flex items-center justify-center rounded-[6px] text-[#9699A6] hover:bg-white/60 hover:text-[#676879] transition-colors duration-150"
              aria-label="הגדרות"
            >
              <Settings size={18} />
              <RailTooltip label="הגדרות" />
            </button>
          )}

          {/* User avatar at bottom (shown in rail when collapsed) */}
          {collapsed && (
            <button
              onClick={onToggle}
              className="relative group w-8 h-8 rounded-full bg-gradient-to-br from-[#0073EA] to-[#0060C2] flex items-center justify-center flex-shrink-0 mb-1 hover:ring-2 hover:ring-[#0073EA]/30 hover:ring-offset-1 transition-all"
              aria-label={user?.name || "משתמש"}
            >
              <span className="text-white text-[10px] font-bold leading-none">
                {userInitials}
              </span>
              <RailTooltip label={user?.name || "משתמש"} />
            </button>
          )}

          {/* Collapse / Expand toggle — chevron between rail and panel */}
          <button
            onClick={onToggle}
            className="relative group w-10 h-10 flex items-center justify-center rounded-[6px] text-[#9699A6] hover:bg-white/60 hover:text-[#676879] transition-colors duration-150"
            aria-label={collapsed ? "פתח תפריט" : "כווץ תפריט"}
          >
            <ChevronLeft
              size={16}
              className={cn("transition-transform duration-200", collapsed ? "rotate-180" : "")}
            />
            <RailTooltip label={collapsed ? "פתח" : "כווץ"} />
          </button>
        </div>
      </aside>

      {/* Create Board Modal */}
      <CreateBoardModal open={createBoardOpen} onClose={() => setCreateBoardOpen(false)} />
    </>
  );
}
