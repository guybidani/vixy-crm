import { useState, useEffect, useRef, useMemo } from "react";
import { NavLink } from "react-router-dom";
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
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

/* ── Tooltip for collapsed items ── */
function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute right-full mr-2 px-2.5 py-1.5 bg-[#323338] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150 delay-200 z-50 shadow-lg">
      {label}
    </div>
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
      title={label}
      className={cn(
        "relative group flex flex-col items-center justify-center w-10 h-10 rounded-[6px] transition-all duration-150",
        active
          ? "bg-white shadow-[0_1px_6px_rgba(0,0,0,0.12)]"
          : "hover:bg-white/60",
      )}
    >
      <Icon
        size={18}
        style={{ color: active ? color : "#9699A6" }}
        className="transition-colors duration-150 group-hover:opacity-100"
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
    </button>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, workspaces, currentWorkspaceId, selectWorkspace } = useAuth();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const isOwner = currentWs?.role === "OWNER";
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(() => {
    try {
      return localStorage.getItem(BOARDS_OPEN_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [navLabels, setNavLabels] = useState<Record<string, string>>(loadNavLabels);
  const [productMode, setProductMode] = useState<ProductMode>(() => {
    return (localStorage.getItem(PRODUCT_MODE_KEY) as ProductMode) || "boards";
  });
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

  const updateBoardMut = useMutation({
    mutationFn: (p: { id: string; name: string }) =>
      updateBoard(p.id, { name: p.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const handleNavRename = (key: string, newLabel: string) => {
    const updated = { ...navLabels, [key]: newLabel };
    setNavLabels(updated);
    saveNavLabels(updated);
  };

  const getNavLabel = (item: (typeof NAV_ITEMS)[number]) => {
    return navLabels[item.key] || item.label;
  };

  const toggleBoards = () => {
    const next = !boardsExpanded;
    setBoardsExpanded(next);
    try {
      localStorage.setItem(BOARDS_OPEN_KEY, String(next));
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

  /* User initials for avatar */
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

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
          "fixed top-0 right-0 h-screen bg-[#F5F6F8] z-50 transition-all duration-300 ease-in-out flex flex-row border-l border-[#EEEFF3]",
          collapsed ? "w-12" : "w-[220px]",
          mobileOpen ? "translate-x-0" : "translate-x-full",
          "md:translate-x-0",
        )}
      >
        {/* ── Nav Panel (hidden when collapsed) ── */}
        {!collapsed && (
          <div className="flex-1 flex flex-col min-w-0 border-l border-[#EEEFF3]">

            {/* Logo / Workspace */}
            <div className="flex items-center gap-2.5 px-3 py-4 border-b border-[#EEEFF3]">
              <div className="flex-shrink-0 bg-gradient-to-br from-[#0073EA] to-[#0060C2] rounded-xl flex items-center justify-center shadow-sm w-8 h-8">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <div className="flex-1 min-w-0">
                {workspaces.length > 1 ? (
                  <select
                    value={currentWorkspaceId || ""}
                    onChange={(e) => selectWorkspace(e.target.value)}
                    className="w-full text-[13px] font-bold text-[#323338] bg-transparent border-none focus:outline-none cursor-pointer truncate leading-tight"
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[13px] font-bold text-[#323338] truncate block leading-tight">
                    {currentWs?.name || "Vixy CRM"}
                  </span>
                )}
                <span className="text-[11px] text-[#9699A6] leading-tight block mt-0.5">
                  {productMode === "crm" ? "CRM" : "Work Management"}
                </span>
              </div>
            </div>

            {/* ── Nav Content ── */}
            <nav className="flex-1 overflow-y-auto py-2 px-1.5" aria-label="ניווט ראשי">

              {/* CRM Mode: all nav items */}
              {productMode === "crm" && filteredNavItems.map((item) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                const label = getNavLabel(item);
                return (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    end={item.path === "/dashboard"}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-[4px] text-[13px] transition-colors duration-150 group relative mb-0.5 px-2.5 py-2",
                        isActive
                          ? "bg-[#0073EA]/10 text-[#0073EA] font-semibold border-r-[3px] border-[#0073EA]"
                          : "text-[#676879] hover:bg-[#EAEAEF] hover:text-[#323338]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={16}
                          className={cn(
                            "flex-shrink-0 transition-colors duration-150",
                            isActive ? "text-[#0073EA]" : "text-[#676879] group-hover:text-[#323338]",
                          )}
                        />
                        <EditableLabel
                          value={label}
                          onSave={(newLabel) => handleNavRename(item.key, newLabel)}
                        />
                      </>
                    )}
                  </NavLink>
                );
              })}

              {/* Boards Mode: boards section */}
              {productMode === "boards" && (
                <>
                  {/* Section header */}
                  <button
                    onClick={toggleBoards}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-[#676879] hover:bg-[#EAEAEF] hover:text-[#323338] transition-colors duration-150 group"
                    aria-expanded={boardsExpanded}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={15} className="text-[#676879] group-hover:text-[#323338]" />
                      <span className="text-[11px] font-semibold text-[#676879] uppercase tracking-wide">
                        בורדים
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateBoardOpen(true);
                        }}
                        className="p-0.5 rounded hover:bg-white/80 hover:text-[#0073EA] transition-colors text-[#9699A6]"
                        aria-label="צור בורד חדש"
                      >
                        <Plus size={13} />
                      </button>
                      <ChevronDown
                        size={13}
                        className={cn(
                          "text-[#9699A6] transition-transform duration-200",
                          boardsExpanded ? "" : "-rotate-90",
                        )}
                      />
                    </div>
                  </button>

                  {boardsExpanded && (
                    <div className="mt-0.5">
                      {boards.length === 0 && (
                        <p className="px-2.5 py-2 text-[12px] text-[#9699A6]">אין בורדים עדיין</p>
                      )}
                      {boards.map((board) => (
                        <NavLink
                          key={board.id}
                          to={`/boards/${board.id}`}
                          onClick={onMobileClose}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[13px] transition-colors duration-150 group relative mb-0.5",
                              isActive
                                ? "bg-[#0073EA]/10 text-[#0073EA] font-semibold border-r-[3px] border-[#0073EA]"
                                : "text-[#676879] hover:bg-[#EAEAEF] hover:text-[#323338]",
                            )
                          }
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: board.color }}
                          />
                          <EditableLabel
                            value={board.name}
                            onSave={(newName) =>
                              updateBoardMut.mutate({ id: board.id, name: newName })
                            }
                          />
                          {board.isPrivate && (
                            <Lock size={11} className="flex-shrink-0 text-[#6161FF] opacity-50 mr-auto" />
                          )}
                        </NavLink>
                      ))}

                      <button
                        onClick={() => setCreateBoardOpen(true)}
                        className="flex items-center gap-2 px-2.5 py-1.5 w-full text-[12px] text-[#9699A6] hover:text-[#0073EA] hover:bg-[#EAEAEF] rounded-[4px] transition-colors duration-150 mt-0.5"
                      >
                        <Plus size={13} />
                        <span>+ בורד חדש</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </nav>

            {/* ── Bottom: Settings + User + Collapse ── */}
            <div className="border-t border-[#EEEFF3] p-1.5 space-y-0.5">
              <NavLink
                to="/settings"
                onClick={onMobileClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-[4px] text-[13px] transition-colors duration-150 group relative px-2.5 py-2",
                    isActive
                      ? "bg-[#0073EA]/10 text-[#0073EA] font-semibold border-r-[3px] border-[#0073EA]"
                      : "text-[#676879] hover:bg-[#EAEAEF] hover:text-[#323338]",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Settings
                      size={16}
                      className={cn(
                        "flex-shrink-0",
                        isActive ? "text-[#0073EA]" : "text-[#676879] group-hover:text-[#323338]",
                      )}
                    />
                    <span className="truncate">הגדרות</span>
                  </>
                )}
              </NavLink>

              <div
                className="flex items-center gap-2 rounded-[4px] px-2.5 py-2 hover:bg-[#EAEAEF] transition-colors duration-150 cursor-default"
                title={user?.name}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0073EA] to-[#0060C2] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold leading-none">{userInitials}</span>
                </div>
                <span className="text-[13px] text-[#323338] font-medium truncate flex-1 min-w-0">
                  {user?.name || "משתמש"}
                </span>
              </div>

              <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 rounded-[4px] px-2.5 py-2 text-[#9699A6] hover:bg-[#EAEAEF] hover:text-[#676879] transition-colors duration-150"
                aria-label="כווץ תפריט"
              >
                <ChevronLeft size={15} />
                <span className="text-[12px]">כיווץ</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Product Rail (always visible, 48px) ── */}
        <div className="w-12 flex flex-col items-center py-2 gap-1 flex-shrink-0">
          {/* Logo icon */}
          <div className="w-8 h-8 mb-1 bg-gradient-to-br from-[#0073EA] to-[#0060C2] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white font-bold text-sm">V</span>
          </div>

          {/* Work Management */}
          <ProductBtn
            active={productMode === "boards"}
            label="Work"
            icon={LayoutGrid}
            color="#6161FF"
            onClick={() => switchProduct("boards")}
          />

          {/* CRM */}
          <ProductBtn
            active={productMode === "crm"}
            label="CRM"
            icon={Users}
            color="#0073EA"
            onClick={() => switchProduct("crm")}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Collapse / Expand toggle */}
          <button
            onClick={onToggle}
            className="w-10 h-10 flex items-center justify-center rounded-[6px] text-[#9699A6] hover:bg-white/60 hover:text-[#676879] transition-colors duration-150"
            aria-label={collapsed ? "פתח תפריט" : "כווץ תפריט"}
            title={collapsed ? "פתח" : "כווץ"}
          >
            <ChevronLeft
              size={16}
              className={cn("transition-transform duration-300", collapsed ? "rotate-180" : "")}
            />
          </button>
        </div>
      </aside>

      {/* Create Board Modal */}
      <CreateBoardModal
        open={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
      />
    </>
  );
}
