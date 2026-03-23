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
  Ticket,
  BookOpen,
  FileText,
  Settings,
  ChevronLeft,
  Plus,
  Zap,
  Lock,
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
  Ticket,
  BookOpen,
  FileText,
  Settings,
  Zap,
};

const NAV_LABELS_KEY = "vixy-nav-labels";

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
        className="bg-white border border-[#0073EA] rounded px-1.5 py-0.5 text-sm text-[#323338] outline-none focus-visible:ring-2 focus-visible:ring-primary w-full min-w-0"
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
      className={cn("truncate cursor-default", className)}
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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { workspaces, currentWorkspaceId, selectWorkspace } = useAuth();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const isOwner = currentWs?.role === "OWNER";
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [navLabels, setNavLabels] =
    useState<Record<string, string>>(loadNavLabels);
  const qc = useQueryClient();

  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: listBoards,
  });

  // Fetch nav permissions to filter visible items
  const { data: navPermData } = useQuery({
    queryKey: ["nav-permissions", currentWorkspaceId],
    queryFn: getNavPermissions,
    enabled: !!currentWorkspaceId && !isOwner,
  });

  const filteredNavItems = useMemo(() => {
    // Owner always sees everything
    if (isOwner || !navPermData?.navPermissions) return NAV_ITEMS;

    const memberId = currentWs?.memberId;
    if (!memberId) return NAV_ITEMS;

    const allowed = navPermData.navPermissions[memberId];
    // No permissions set = full access (default)
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
          "fixed top-0 right-0 h-screen bg-gradient-to-b from-[#F7F7F9] to-[#F0F0F5] z-50 transition-all duration-300 ease-in-out flex flex-col border-l border-border-light/50",
          collapsed ? "w-16" : "w-60",
          // Mobile: hidden by default, shown as overlay when mobileOpen
          mobileOpen ? "translate-x-0" : "translate-x-full",
          "md:translate-x-0",
        )}
      >
        {/* Logo / Workspace */}
        <div className="p-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-lg font-bold">V</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                {workspaces.length > 1 ? (
                  <select
                    value={currentWorkspaceId || ""}
                    onChange={(e) => selectWorkspace(e.target.value)}
                    className="w-full text-sm font-bold text-text-primary bg-transparent border-none focus:outline-none cursor-pointer truncate"
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-bold text-text-primary truncate block">
                    {currentWs?.name || "Vixy CRM"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation - Flat Monday-style list */}
        <nav className="flex-1 overflow-y-auto py-1 px-2">
          {filteredNavItems.map((item) => {
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
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative mb-0.5",
                    isActive
                      ? "bg-white shadow-sm border-r-[3px] border-primary font-semibold text-text-primary"
                      : "text-text-secondary hover:bg-white/80 hover:text-text-primary hover:translate-x-[-2px]",
                    collapsed && "justify-center px-0 hover:translate-x-0",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {!collapsed && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.dot }}
                      />
                    )}
                    <Icon
                      size={18}
                      className={cn(
                        "flex-shrink-0 transition-colors duration-200",
                        isActive
                          ? "text-primary"
                          : "text-text-tertiary group-hover:text-primary/70",
                      )}
                    />
                    {!collapsed && (
                      <EditableLabel
                        value={label}
                        onSave={(newLabel) =>
                          handleNavRename(item.key, newLabel)
                        }
                      />
                    )}
                    {collapsed && (
                      <div className="absolute left-full mr-2 px-2 py-1 bg-text-primary text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity delay-300 z-50">
                        {label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* ── Dynamic Boards Section ── */}
          {!collapsed && (
            <div className="mt-4 pt-3 border-t border-[#E6E9EF]">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
                  הבורדים שלי
                </span>
                <button
                  onClick={() => setCreateBoardOpen(true)}
                  className="p-0.5 hover:bg-white/60 rounded transition-colors text-text-tertiary hover:text-primary"
                  aria-label="צור בורד חדש"
                >
                  <Plus size={14} />
                </button>
              </div>
              {boards.map((board) => (
                <NavLink
                  key={board.id}
                  to={`/boards/${board.id}`}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative mb-0.5",
                      isActive
                        ? "bg-white shadow-sm border-r-[3px] border-primary font-semibold text-text-primary"
                        : "text-text-secondary hover:bg-white/80 hover:text-text-primary hover:translate-x-[-2px]",
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
                    <Lock size={12} className="flex-shrink-0 text-[#6161FF] opacity-60" />
                  )}
                </NavLink>
              ))}
              {boards.length === 0 && (
                <button
                  onClick={() => setCreateBoardOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-tertiary hover:text-primary transition-colors w-full"
                >
                  <Plus size={14} />
                  <span>צור בורד ראשון</span>
                </button>
              )}
            </div>
          )}

          {/* Collapsed: just show + button */}
          {collapsed && (
            <div className="mt-4 pt-3 border-t border-[#E6E9EF] flex justify-center">
              <button
                onClick={() => setCreateBoardOpen(true)}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors text-text-tertiary hover:text-primary group relative"
                aria-label="צור בורד חדש"
              >
                <Plus size={18} />
                <div className="absolute left-full mr-2 px-2 py-1 bg-text-primary text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity delay-300 z-50">
                  בורד חדש
                </div>
              </button>
            </div>
          )}
        </nav>

        {/* Bottom: Settings + Collapse */}
        <div className="p-2">
          <NavLink
            to="/settings"
            onClick={onMobileClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative",
                isActive
                  ? "bg-white shadow-sm border-r-[3px] border-primary font-semibold text-text-primary"
                  : "text-text-secondary hover:bg-white/80 hover:text-text-primary hover:translate-x-[-2px]",
                collapsed && "justify-center px-0 hover:translate-x-0",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  size={18}
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    isActive
                      ? "text-primary"
                      : "text-text-tertiary group-hover:text-primary/70",
                  )}
                />
                {!collapsed && <span className="truncate">הגדרות</span>}
                {collapsed && (
                  <div className="absolute left-full mr-2 px-2 py-1 bg-text-primary text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity delay-300 z-50">
                    הגדרות
                  </div>
                )}
              </>
            )}
          </NavLink>
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-text-tertiary hover:bg-white/80 hover:text-text-secondary transition-all duration-200 mt-1"
          >
            <ChevronLeft
              size={16}
              className={cn(
                "transition-transform",
                collapsed ? "rotate-180" : "",
              )}
            />
            {!collapsed && <span className="text-xs">כיווץ</span>}
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
