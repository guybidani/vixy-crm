import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Lock, Shield, PanelRightOpen, Link2, List, Columns2, CalendarDays, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import BoardPermissionsModal from "../components/boards/BoardPermissionsModal";
import BoardItemDetailPanel from "../components/boards/BoardItemDetailPanel";
import BoardAutomationsPanel from "../components/boards/BoardAutomationsPanel";
import PageShell from "../components/layout/PageShell";
import MondayBoard, {
  MondayStatusCell,
  type MondayColumn,
  type MondayGroup,
  type StatusOption,
} from "../components/shared/MondayBoard";
import KanbanBoard, {
  type KanbanColumn,
} from "../components/shared/KanbanBoard";
import ColumnEditorModal from "../components/boards/ColumnEditorModal";
import {
  getBoard,
  updateBoard,
  addBoardItem,
  updateBoardItem,
  updateBoardItemValues,
  addBoardGroup,
  updateBoardGroup,
  deleteBoardGroup,
  updateBoardColumn,
  deleteBoardColumn,
  deleteBoardItem,
  saveBoardAutomations,
  type Board,
  type BoardItem,
  type BoardColumn,
  type AutomationConfig,
} from "../api/boards";
import { getWorkspaceMembers } from "../api/auth";

// ── Avatar helpers ────────────────────────────────────────────────

function hashColor(name: string): string {
  const palette = [
    "#0073EA", "#00CA72", "#A25DDC", "#FF642E", "#FDAB3D",
    "#6161FF", "#FB275D", "#579BFC", "#33D391", "#FF7575",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

interface WorkspaceMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface PersonCellProps {
  value: string; // comma-separated memberIds
  members: WorkspaceMember[];
  onChange: (val: string) => void;
}

function PersonCell({ value, members, onChange }: PersonCellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = value ? value.split(",").filter(Boolean) : [];
  const selectedMembers = selectedIds
    .map((id) => members.find((m) => m.memberId === id))
    .filter((m): m is WorkspaceMember => !!m);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function toggle(memberId: string) {
    const ids = new Set(selectedIds);
    if (ids.has(memberId)) ids.delete(memberId);
    else ids.add(memberId);
    onChange([...ids].join(","));
  }

  const avatarSize = "w-6 h-6 text-[10px]";

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Stacked avatars */}
      <button
        className="flex items-center -space-x-1.5 focus:outline-none"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        title="שנה אחראי"
      >
        {selectedMembers.length === 0 ? (
          <span className={`${avatarSize} rounded-full border-2 border-dashed border-[#C3C6D4] flex items-center justify-center text-[#C3C6D4] hover:border-[#0073EA] hover:text-[#0073EA] transition-colors`}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1c-3.3 0-6 1.8-6 4v.5h12V13c0-2.2-2.7-4-6-4z"/></svg>
          </span>
        ) : (
          <>
            {selectedMembers.slice(0, 3).map((m, i) => (
              <span
                key={m.memberId}
                className={`${avatarSize} rounded-full border-2 border-white flex items-center justify-center font-semibold text-white`}
                style={{ backgroundColor: hashColor(m.name), zIndex: 3 - i }}
                title={m.name}
              >
                {initials(m.name)}
              </span>
            ))}
            {selectedMembers.length > 3 && (
              <span className={`${avatarSize} rounded-full border-2 border-white bg-[#E6E9EF] text-[#676879] flex items-center justify-center font-semibold`}>
                +{selectedMembers.length - 3}
              </span>
            )}
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E6E9EF] rounded-xl shadow-xl min-w-[180px] py-1" onClick={(e) => e.stopPropagation()}>
          {members.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-[#9699A6]">אין חברי צוות</p>
          ) : (
            members.map((m) => {
              const selected = selectedIds.includes(m.memberId);
              return (
                <button
                  key={m.memberId}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F5F6F8] text-left ${selected ? "bg-[#EEF4FF]" : ""}`}
                  onClick={() => toggle(m.memberId)}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: hashColor(m.name) }}
                  >
                    {initials(m.name)}
                  </span>
                  <span className="text-[12px] text-[#323338] truncate flex-1">{m.name}</span>
                  {selected && (
                    <svg className="w-3.5 h-3.5 text-[#0073EA] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 12L2 7.5l1.4-1.4 3.1 3.1 5.6-5.6L13.5 5z"/></svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface LinkCellProps {
  value: string;
  onEdit: () => void;
}

function LinkCell({ value, onEdit }: LinkCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  let domain = "";
  try {
    const url = value.startsWith("http") ? value : `https://${value}`;
    domain = new URL(url).hostname;
  } catch {
    domain = value;
  }
  const href = value.startsWith("http") ? value : `https://${value}`;

  return (
    <div className="relative flex items-center min-w-0">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 px-2 py-0.5 bg-[#EEF4FF] hover:bg-[#DDEEFF] border border-[#C3D9FF] rounded-full text-[11px] font-medium text-[#0073EA] truncate max-w-full transition-colors"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Link2 size={10} className="flex-shrink-0" />
        <span className="truncate">{domain || value}</span>
      </a>
      {showTooltip && domain && (
        <div className="absolute bottom-full left-0 mb-1 z-50 bg-[#323338] text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
          {domain}
          <div className="absolute top-full left-4 border-4 border-transparent border-t-[#323338]" />
        </div>
      )}
    </div>
  );
}

// ── Flattened row type for MondayBoard ───────────────────────────

// Flattened row type for MondayBoard
interface BoardRow {
  id: string;
  _item: BoardItem;
  _groupId: string;
  _groupColor: string;
  name: string;
  [key: string]: any;
}

function buildRows(board: Board): MondayGroup<BoardRow>[] {
  return board.groups.map((group) => ({
    key: group.id,
    label: group.name,
    color: group.color,
    items: group.items.map((item) => {
      const row: BoardRow = {
        id: item.id,
        _item: item,
        _groupId: group.id,
        _groupColor: group.color,
        name: item.name,
        __lastActivityAt: item.lastActivityAt ?? item.updatedAt ?? null,
      };
      for (const val of item.values) {
        const colDef = board.columns.find((c) => c.id === val.columnId);
        if (!colDef) continue;
        switch (colDef.type) {
          case "NUMBER":
            row[colDef.key] = val.numberValue;
            break;
          case "DATE":
            row[colDef.key] = val.dateValue;
            break;
          case "STATUS":
          case "PRIORITY":
            row[colDef.key] = val.textValue;
            break;
          case "CHECKBOX":
            row[colDef.key] = val.jsonValue;
            break;
          case "PERSON":
            row[colDef.key] = val.textValue; // comma-separated memberIds
            break;
          default:
            row[colDef.key] = val.textValue;
        }
      }
      return row;
    }),
  }));
}

function buildStatusOptions(
  col: BoardColumn,
): Record<string, StatusOption> | undefined {
  if (
    (col.type === "STATUS" || col.type === "PRIORITY") &&
    col.options &&
    Array.isArray(col.options)
  ) {
    const opts: Record<string, StatusOption> = {};
    for (const o of col.options as Array<{
      key: string;
      label: string;
      color: string;
    }>) {
      opts[o.key] = { label: o.label, color: o.color };
    }
    return opts;
  }
  return undefined;
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { workspaces, currentWorkspaceId } = useAuth();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const userRole = currentWs?.role;
  const canManagePermissions = userRole === "OWNER" || userRole === "ADMIN";
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // ── View mode — persisted per board ──
  const [viewMode, setViewMode] = useState<"kanban" | "table">(() => {
    try {
      const stored = localStorage.getItem(`board:${id}:viewMode`);
      return (stored === "kanban" ? "kanban" : "table") as "kanban" | "table";
    } catch {
      return "table";
    }
  });
  const handleViewModeChange = (mode: "kanban" | "table") => {
    setViewMode(mode);
    try { localStorage.setItem(`board:${id}:viewMode`, mode); } catch {}
  };

  // ── Group by — persisted per board ──
  const [groupByKey, setGroupByKey] = useState<string | null>(() => {
    try { return localStorage.getItem(`board:${id}:groupBy`) || null; } catch { return null; }
  });
  const handleGroupByChange = (key: string | null) => {
    setGroupByKey(key);
    try {
      if (key) localStorage.setItem(`board:${id}:groupBy`, key);
      else localStorage.removeItem(`board:${id}:groupBy`);
    } catch {}
  };

  // ── Active filters — persisted per board ──
  const [activeFilters, setActiveFilters] = useState<Array<{ column: string; values: string[] }>>(() => {
    try {
      const stored = localStorage.getItem(`board:${id}:filters`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const handleFiltersChange = (filters: Array<{ column: string; values: string[] }>) => {
    setActiveFilters(filters);
    try { localStorage.setItem(`board:${id}:filters`, JSON.stringify(filters)); } catch {}
  };
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    colKey: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [addingItemGroup, setAddingItemGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  // Board name inline editing
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameValue, setBoardNameValue] = useState("");
  const [newItemId, setNewItemId] = useState<string | null>(null);

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", id],
    queryFn: () => getBoard(id!),
    enabled: !!id,
  });

  const { data: wsMembers = [] } = useQuery({
    queryKey: ["workspaceMembers", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
    staleTime: 60_000,
  });

  // ── Mutations ──

  const updateBoardMut = useMutation({
    mutationFn: (data: { name: string }) => updateBoard(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", id] });
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const addItemMut = useMutation({
    mutationFn: (p: { groupId: string; name: string }) =>
      addBoardItem(id!, p.groupId, { name: p.name }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["board", id] });
      // Track newly added item for slide-in animation
      if (data?.id) {
        setNewItemId(data.id);
        setTimeout(() => setNewItemId(null), 1000);
      }
    },
  });

  const updateValuesMut = useMutation({
    mutationFn: (p: {
      itemId: string;
      values: Array<{
        columnId: string;
        textValue?: string | null;
        numberValue?: number | null;
        dateValue?: string | null;
        jsonValue?: any;
      }>;
    }) => updateBoardItemValues(id!, p.itemId, p.values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const updateItemMut = useMutation({
    mutationFn: (p: { itemId: string; name: string }) =>
      updateBoardItem(id!, p.itemId, { name: p.name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const moveItemMut = useMutation({
    mutationFn: (p: { itemId: string; groupId: string }) =>
      updateBoardItem(id!, p.itemId, { groupId: p.groupId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) => deleteBoardItem(id!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const addGroupMut = useMutation({
    mutationFn: () => addBoardGroup(id!, { name: "קבוצה חדשה" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const saveAutomationsMut = useMutation({
    mutationFn: (automations: AutomationConfig[]) => saveBoardAutomations(id!, automations),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", id] });
      setAutomationsOpen(false);
    },
  });

  const updateGroupMut = useMutation({
    mutationFn: (p: {
      groupId: string;
      data: Partial<{ name: string; color: string }>;
    }) => updateBoardGroup(id!, p.groupId, p.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const deleteGroupMut = useMutation({
    mutationFn: (groupId: string) => deleteBoardGroup(id!, groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const updateColMut = useMutation({
    mutationFn: (p: {
      columnId: string;
      data: Partial<{
        label: string;
        options: Array<{ key: string; label: string; color: string }>;
      }>;
    }) => updateBoardColumn(id!, p.columnId, p.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const deleteColMut = useMutation({
    mutationFn: (columnId: string) => deleteBoardColumn(id!, columnId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  // ── Handlers ──

  const handleCellEdit = useCallback(
    (itemId: string, col: BoardColumn, newValue: string | number | boolean) => {
      const payload: {
        columnId: string;
        textValue?: string | null;
        numberValue?: number | null;
        dateValue?: string | null;
        jsonValue?: any;
      } = { columnId: col.id };

      switch (col.type) {
        case "NUMBER":
          payload.numberValue =
            typeof newValue === "number"
              ? newValue
              : parseFloat(String(newValue)) || 0;
          break;
        case "DATE":
          payload.dateValue = String(newValue);
          break;
        case "CHECKBOX":
          payload.jsonValue = newValue;
          break;
        default:
          payload.textValue = String(newValue);
      }

      updateValuesMut.mutate({ itemId, values: [payload] });
    },
    [updateValuesMut],
  );

  // Map column key → column id (for rename/delete which need the real id)
  const colKeyToId = (key: string): string | null => {
    if (!board) return null;
    const col = board.columns.find((c) => c.key === key);
    return col?.id || null;
  };

  // ── Not found ──

  if (!board && !isLoading) {
    return (
      <PageShell title="בורד לא נמצא">
        <div className="text-center py-16">
          <p className="text-[#676879] mb-4">הבורד המבוקש לא נמצא</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-[#0073EA] hover:underline text-[13px]"
          >
            חזור לדשבורד
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Data prep ──

  const statusCol = board?.columns.find(
    (c) => c.type === "STATUS" || c.type === "PRIORITY",
  );
  const statusOpts = statusCol ? buildStatusOptions(statusCol) : undefined;

  // Build Monday columns
  const mondayColumns: MondayColumn<BoardRow>[] = board
    ? [
        // Name column (always first)
        {
          key: "name",
          label: board.columns.find((c) => c.key === "name")?.label || "שם",
          width: "220px",
          sortable: true,
          render: (row: BoardRow) => {
            if (
              editingCell?.itemId === row.id &&
              editingCell?.colKey === "name"
            ) {
              return (
                <input
                  autoFocus
                  className="w-full bg-transparent text-[13px] text-[#323338] outline-none border-b border-[#0073EA] py-0.5"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim() && editValue !== row.name) {
                      updateItemMut.mutate({
                        itemId: row.id,
                        name: editValue.trim(),
                      });
                    }
                    setEditingCell(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingCell(null);
                  }}
                />
              );
            }
            return (
              <span className="group/name flex items-center gap-1.5 w-full min-w-0">
                {/* Group color dot */}
                <span
                  className="flex-shrink-0 w-[10px] h-[10px] rounded-sm"
                  style={{ backgroundColor: row._groupColor }}
                />
                {/* Open panel icon — appears on hover, to the LEFT of the name */}
                <button
                  className="flex-shrink-0 text-[#9699A6] opacity-0 group-hover/name:opacity-100 hover:text-[#0073EA] transition-all cursor-pointer p-0 leading-none focus:outline-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-[#0073EA] rounded"
                  title="פתח פרטים"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(row.id);
                  }}
                  aria-label="פתח פרטי פריט"
                >
                  <PanelRightOpen size={13} />
                </button>
                {/* Item name — single click opens panel, double click edits */}
                <button
                  className="text-[13px] font-medium text-[#323338] cursor-pointer hover:text-[#0073EA] transition-colors flex-1 truncate text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0073EA] rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(row.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingCell({ itemId: row.id, colKey: "name" });
                    setEditValue(row.name);
                  }}
                  title="לחץ לפתיחה, לחץ פעמיים לעריכה"
                >
                  {row.name || "—"}
                </button>
              </span>
            );
          },
        },
        // All other columns
        ...board.columns
          .filter((c) => c.key !== "name")
          .map((col): MondayColumn<BoardRow> => {
            if (col.type === "STATUS" || col.type === "PRIORITY") {
              const opts = buildStatusOptions(col);
              if (opts) {
                return {
                  key: col.key,
                  label: col.label,
                  width: col.width || "140px",
                  sortable: true,
                  noPadding: true,
                  render: (row: BoardRow) => (
                    <MondayStatusCell
                      value={row[col.key] || ""}
                      options={opts}
                      onChange={(val) => handleCellEdit(row.id, col, val)}
                      onEditLabels={(updated) => {
                        const newOptions = Object.entries(updated).map(
                          ([key, o]) => ({
                            key,
                            label: o.label,
                            color: o.color,
                          }),
                        );
                        updateColMut.mutate({
                          columnId: col.id,
                          data: { options: newOptions },
                        });
                      }}
                    />
                  ),
                };
              }
            }

            if (col.type === "DATE") {
              return {
                key: col.key,
                label: col.label,
                width: col.width || "130px",
                sortable: true,
                render: (row: BoardRow) => {
                  const val = row[col.key];
                  return (
                    <input
                      type="date"
                      className="w-full bg-transparent text-[13px] text-[#323338] outline-none cursor-pointer"
                      value={
                        val ? new Date(val).toISOString().split("T")[0] : ""
                      }
                      onChange={(e) =>
                        handleCellEdit(row.id, col, e.target.value)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  );
                },
              };
            }

            if (col.type === "NUMBER") {
              return {
                key: col.key,
                label: col.label,
                width: col.width || "100px",
                sortable: true,
                render: (row: BoardRow) => {
                  if (
                    editingCell?.itemId === row.id &&
                    editingCell?.colKey === col.key
                  ) {
                    return (
                      <input
                        autoFocus
                        type="number"
                        className="w-full bg-transparent text-[13px] text-[#323338] outline-none border-b border-[#0073EA] py-0.5"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          handleCellEdit(
                            row.id,
                            col,
                            parseFloat(editValue) || 0,
                          );
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                      />
                    );
                  }
                  return (
                    <span
                      className="block w-full text-right text-[13px] cursor-text"
                      style={{ color: row[col.key] != null ? "#323338" : "#C3C6D4" }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ itemId: row.id, colKey: col.key });
                        setEditValue(String(row[col.key] ?? ""));
                      }}
                    >
                      {row[col.key] != null ? row[col.key] : "—"}
                    </span>
                  );
                },
              };
            }

            if (col.type === "CHECKBOX") {
              return {
                key: col.key,
                label: col.label,
                width: col.width || "80px",
                render: (row: BoardRow) => (
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#0073EA]"
                    checked={!!row[col.key]}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCellEdit(row.id, col, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ),
              };
            }

            // PERSON column — avatar picker
            if (col.type === "PERSON") {
              return {
                key: col.key,
                label: col.label,
                width: col.width || "120px",
                render: (row: BoardRow) => (
                  <PersonCell
                    value={row[col.key] || ""}
                    members={wsMembers}
                    onChange={(val) => handleCellEdit(row.id, col, val)}
                  />
                ),
              };
            }

            // LINK column — chip with tooltip, double-click to edit
            if (col.type === "LINK") {
              return {
                key: col.key,
                label: col.label,
                width: col.width || "160px",
                render: (row: BoardRow) => {
                  const val = row[col.key];
                  if (
                    editingCell?.itemId === row.id &&
                    editingCell?.colKey === col.key
                  ) {
                    return (
                      <input
                        autoFocus
                        className="w-full bg-transparent text-[13px] text-[#323338] outline-none border-b border-[#0073EA] py-0.5"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          if (editValue !== (val || "")) {
                            handleCellEdit(row.id, col, editValue);
                          }
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                      />
                    );
                  }
                  if (val) {
                    return (
                      <LinkCell
                        value={val}
                        onEdit={() => {
                          setEditingCell({ itemId: row.id, colKey: col.key });
                          setEditValue(String(val || ""));
                        }}
                      />
                    );
                  }
                  return (
                    <span
                      className="text-[13px] text-[#9699A6] cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ itemId: row.id, colKey: col.key });
                        setEditValue("");
                      }}
                    >
                      —
                    </span>
                  );
                },
              };
            }

            // TEXT, EMAIL, PHONE — inline text edit
            return {
              key: col.key,
              label: col.label,
              width: col.width || "150px",
              render: (row: BoardRow) => {
                if (
                  editingCell?.itemId === row.id &&
                  editingCell?.colKey === col.key
                ) {
                  return (
                    <input
                      autoFocus
                      className="w-full bg-transparent text-[13px] text-[#323338] outline-none border-b border-[#0073EA] py-0.5"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (editValue !== (row[col.key] || "")) {
                          handleCellEdit(row.id, col, editValue);
                        }
                        setEditingCell(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingCell(null);
                      }}
                    />
                  );
                }
                const val = row[col.key];
                return (
                  <span
                    className="text-[13px] text-[#323338] cursor-text truncate block"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingCell({ itemId: row.id, colKey: col.key });
                      setEditValue(String(val || ""));
                    }}
                  >
                    {val || "—"}
                  </span>
                );
              },
            };
          }),
        // Last activity column
        {
          key: "__lastActivityAt",
          label: "פעולה אחרונה",
          width: "130px",
          sortable: true,
          sortValue: (row: BoardRow) => row.__lastActivityAt ? new Date(row.__lastActivityAt).getTime() : 0,
          render: (row: BoardRow) => {
            if (!row.__lastActivityAt) return <span className="text-[#C3C6D4] text-[12px]">—</span>;
            const d = new Date(row.__lastActivityAt);
            const now = Date.now();
            const diff = now - d.getTime();
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            let label: string;
            if (mins < 1) label = "עכשיו";
            else if (mins < 60) label = `לפני ${mins}ד'`;
            else if (hours < 24) label = `לפני ${hours}ש'`;
            else if (days === 1) label = "אתמול";
            else if (days < 7) label = `לפני ${days} ימים`;
            else label = d.toLocaleDateString("he-IL");
            return (
              <span
                className="text-[12px] text-[#676879]"
                title={d.toLocaleString("he-IL")}
              >
                {label}
              </span>
            );
          },
        },
        // "+" column to add new columns
        {
          key: "__add_col",
          label: "+",
          width: "40px",
          render: () => null,
        },
      ]
    : [];

  const mondayGroups = board ? buildRows(board) : [];

  // Filter by search
  const filtered = search
    ? mondayGroups.map((g) => ({
        ...g,
        items: g.items.filter((row) =>
          Object.values(row).some(
            (v) =>
              typeof v === "string" &&
              v.toLowerCase().includes(search.toLowerCase()),
          ),
        ),
      }))
    : mondayGroups;

  // ── Kanban data ──
  // Find first STATUS/PRIORITY column for kanban columns
  const kanbanStatusCol = board?.columns.find(
    (c) => c.type === "STATUS" || c.type === "PRIORITY",
  );

  const kanbanColumns: KanbanColumn<BoardRow>[] = (() => {
    if (!kanbanStatusCol || !board) return [];
    const opts = kanbanStatusCol.options as Array<{
      key: string;
      label: string;
      color: string;
    }> | null;
    if (!opts || opts.length === 0) return [];

    // Flatten all items from all groups
    const allRows: BoardRow[] = [];
    for (const g of mondayGroups) {
      for (const row of g.items) {
        allRows.push(row);
      }
    }

    // Build columns based on status options
    return opts.map((opt) => {
      const items = allRows.filter(
        (row) => row[kanbanStatusCol.key] === opt.key,
      );
      return {
        key: opt.key,
        label: opt.label,
        color: opt.color,
        items,
      };
    });
  })();

  const handleKanbanDragEnd = (
    itemId: string,
    _fromColumn: string,
    toColumn: string,
  ) => {
    if (!kanbanStatusCol || !board) return;
    const colDef = board.columns.find((c) => c.id === kanbanStatusCol.id);
    if (!colDef) return;
    handleCellEdit(itemId, colDef, toColumn);
  };

  // ── Board name editing ──
  const boardTitle = editingBoardName ? (
    <input
      autoFocus
      className="text-xl font-bold bg-transparent outline-none border-b-2 border-[#0073EA] text-[#323338] py-0.5 min-w-[200px]"
      value={boardNameValue}
      onChange={(e) => setBoardNameValue(e.target.value)}
      onBlur={() => {
        if (boardNameValue.trim() && boardNameValue !== board?.name) {
          updateBoardMut.mutate({ name: boardNameValue.trim() });
        }
        setEditingBoardName(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditingBoardName(false);
      }}
    />
  ) : (
    <button
      className="group cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
      onClick={() => {
        setEditingBoardName(true);
        setBoardNameValue(board?.name || "");
      }}
      title="לחץ לשינוי שם"
    >
      {board?.isPrivate && (
        <Lock size={14} className="text-[#6161FF] flex-shrink-0" />
      )}
      {board?.name || "טוען..."}
      <Pencil
        size={14}
        className="text-[#9699A6] opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </button>
  );

  return (
    <PageShell
      title={
        <button
          className="cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
          onClick={() => {
            setEditingBoardName(true);
            setBoardNameValue(board?.name || "");
          }}
          title="לחץ לשינוי שם"
        >
          {board?.isPrivate && <Lock size={14} className="text-[#6161FF]" />}
          {board?.name || "טוען..."}
          <Pencil size={13} className="text-[#9699A6] opacity-0 group-hover:opacity-100" />
        </button>
      }
      emoji="📋"
      boardStyle
      views={[
        { key: "table", label: "טבלה" },
        { key: "kanban", label: "קנבאן" },
        { key: "calendar", label: "לוח שנה" },
      ]}
      activeView={viewMode === "kanban" ? "kanban" : "table"}
      onViewChange={(key) => {
        if (key === "table" || key === "kanban") handleViewModeChange(key);
      }}
      actions={
        <div className="flex items-center gap-2">
          {canManagePermissions && (
            <button
              onClick={() => setPermissionsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#323338] bg-white border border-[#D0D4E4] rounded-[4px] hover:bg-[#F5F6F8] hover:border-[#6161FF] hover:text-[#6161FF] transition-colors"
            >
              <Shield size={14} />
              הרשאות
            </button>
          )}
          <button
            onClick={() => setAutomationsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#323338] bg-white border border-[#D0D4E4] rounded-[4px] hover:bg-[#F5F6F8] hover:border-[#FDAB3D] hover:text-[#FDAB3D] transition-colors"
          >
            <Zap size={14} />
            אוטומציות
          </button>
          <button
            onClick={() => setColumnEditorOpen(true)}
            className="px-3 py-1.5 text-[13px] text-[#323338] bg-white border border-[#D0D4E4] rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
          >
            + עמודה חדשה
          </button>
        </div>
      }
    >
      {/* Board name inline editing — shown in board content area */}
      {editingBoardName && (
        <div className="mb-4">
          <input
            autoFocus
            className="text-[18px] font-bold bg-transparent outline-none border-b-2 border-[#0073EA] text-[#323338] py-0.5 min-w-[200px]"
            value={boardNameValue}
            onChange={(e) => setBoardNameValue(e.target.value)}
            onBlur={() => {
              if (boardNameValue.trim() && boardNameValue !== board?.name) {
                updateBoardMut.mutate({ name: boardNameValue.trim() });
              }
              setEditingBoardName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingBoardName(false);
            }}
          />
        </div>
      )}

      {/* Board empty state */}
      {!isLoading &&
        board &&
        !search &&
        mondayGroups.every((g) => g.items.length === 0) && (
          <BoardEmptyState
            onAddItem={() => {
              if (board.groups.length > 0) {
                setAddingItemGroup(board.groups[0].id);
                setNewItemName("");
              }
            }}
          />
        )}

      {viewMode === "table" ? (
        <MondayBoard
          groups={filtered}
          columns={mondayColumns}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="חיפוש בבורד..."
          loading={isLoading}
          newItemLabel="פריט חדש"
          onNewItem={() => {
            if (board && board.groups.length > 0) {
              setAddingItemGroup(board.groups[0].id);
              setNewItemName("");
            }
          }}
          onNewItemInGroup={(groupKey) => {
            setAddingItemGroup(groupKey);
            setNewItemName("");
          }}
          onGroupRename={(groupKey, newName) => {
            updateGroupMut.mutate({
              groupId: groupKey,
              data: { name: newName },
            });
          }}
          onGroupDelete={(groupKey) => {
            deleteGroupMut.mutate(groupKey);
          }}
          onGroupColorChange={(groupKey, color) => {
            updateGroupMut.mutate({
              groupId: groupKey,
              data: { color },
            });
          }}
          onColumnRename={(colKey, newLabel) => {
            const colId = colKeyToId(colKey);
            if (colId) {
              updateColMut.mutate({
                columnId: colId,
                data: { label: newLabel },
              });
            }
          }}
          onColumnDelete={(colKey) => {
            const colId = colKeyToId(colKey);
            if (colId) {
              deleteColMut.mutate(colId);
            }
          }}
          onRowClick={(row: BoardRow) => setSelectedItemId(row.id)}
          onDeleteItem={(row: BoardRow) => {
            deleteItemMut.mutate(row.id);
          }}
          newItemId={newItemId}
          statusKey={statusCol?.key as any}
          statusOptions={statusOpts}
          groupByColumns={
            board?.columns
              .filter(
                (c) =>
                  c.type === "STATUS" ||
                  c.type === "PRIORITY" ||
                  c.type === "TEXT",
              )
              .map((c) => ({ key: c.key, label: c.label })) || []
          }
          groupByKey={groupByKey}
          onGroupByChange={handleGroupByChange}
          activeFilters={activeFilters}
          onFiltersChange={handleFiltersChange}
          onAddGroup={() => addGroupMut.mutate()}
          onAddColumn={() => setColumnEditorOpen(true)}
          onMoveItem={(itemId, targetGroupKey) => {
            moveItemMut.mutate({ itemId, groupId: targetGroupKey });
          }}
        />
      ) : /* Kanban View */
      kanbanColumns.length > 0 ? (
        <KanbanBoard<BoardRow>
          columns={kanbanColumns}
          renderCard={(row, isDragging) => (
            <div
              className={`bg-white rounded-lg p-3 border border-[#E6E9EF] shadow-sm ${
                isDragging ? "shadow-lg ring-2 ring-[#0073EA]/20" : ""
              }`}
            >
              <p className="text-[13px] font-medium text-[#323338] mb-1">
                {row.name}
              </p>
              {/* Show 2-3 extra column values as preview */}
              {board?.columns
                .filter(
                  (c) =>
                    c.key !== "name" &&
                    c.key !== kanbanStatusCol?.key &&
                    row[c.key] != null &&
                    row[c.key] !== "",
                )
                .slice(0, 3)
                .map((c) => (
                  <p
                    key={c.key}
                    className="text-[11px] text-[#676879] truncate"
                  >
                    <span className="text-[#9699A6]">{c.label}:</span>{" "}
                    {String(row[c.key])}
                  </p>
                ))}
            </div>
          )}
          onDragEnd={handleKanbanDragEnd}
          onCardClick={(row: BoardRow) => setSelectedItemId(row.id)}
          loading={isLoading}
          emptyText="אין פריטים"
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-[#676879]">
          <p className="text-sm mb-2">
            תצוגת קנבאן דורשת עמודת סטטוס או עדיפות
          </p>
          <button
            onClick={() => {
              setColumnEditorOpen(true);
            }}
            className="text-sm text-[#0073EA] hover:underline"
          >
            + הוסף עמודת סטטוס
          </button>
        </div>
      )}

      {/* Inline add item input */}
      {addingItemGroup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.15)] rounded-xl px-4 py-3 flex items-center gap-3 border border-[#D0D4E4]">
          <input
            autoFocus
            className="w-[300px] text-sm border border-[#D0D4E4] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#0073EA]"
            placeholder="שם הפריט..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItemName.trim()) {
                addItemMut.mutate(
                  { groupId: addingItemGroup!, name: newItemName.trim() },
                  { onSuccess: () => setAddingItemGroup(null) },
                );
              }
              if (e.key === "Escape") setAddingItemGroup(null);
            }}
          />
          <button
            onClick={() => {
              if (newItemName.trim()) {
                addItemMut.mutate(
                  { groupId: addingItemGroup!, name: newItemName.trim() },
                  { onSuccess: () => setAddingItemGroup(null) },
                );
              }
            }}
            className="px-4 py-2 bg-[#0073EA] text-white text-sm font-medium rounded-[4px] hover:bg-[#0060C2] transition-colors"
          >
            הוסף
          </button>
          <button
            onClick={() => setAddingItemGroup(null)}
            className="px-3 py-2 text-sm text-[#676879] hover:text-[#323338] transition-colors"
          >
            ביטול
          </button>
        </div>
      )}

      {/* Column Editor Modal */}
      {board && (
        <ColumnEditorModal
          open={columnEditorOpen}
          onClose={() => setColumnEditorOpen(false)}
          boardId={board.id}
        />
      )}

      {/* Board Permissions Modal */}
      {board && canManagePermissions && (
        <BoardPermissionsModal
          open={permissionsOpen}
          onClose={() => setPermissionsOpen(false)}
          boardId={board.id}
          boardName={board.name}
          isPrivate={board.isPrivate ?? false}
        />
      )}

      {/* Board Automations Panel */}
      {board && (
        <BoardAutomationsPanel
          open={automationsOpen}
          onClose={() => setAutomationsOpen(false)}
          columns={board.columns}
          automations={(board.automations as AutomationConfig[]) ?? []}
          onSave={(automations) => saveAutomationsMut.mutate(automations)}
          saving={saveAutomationsMut.isPending}
        />
      )}

      {/* Board Item Detail Panel */}
      {selectedItemId && board && (
        <BoardItemDetailPanel
          boardId={id!}
          itemId={selectedItemId}
          columns={board.columns}
          onClose={() => setSelectedItemId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ["board", id] })}
          onDelete={(itemId) => {
            deleteItemMut.mutate(itemId);
            setSelectedItemId(null);
          }}
          allItems={board.groups.flatMap((g) => g.items.map((i) => ({ id: i.id, name: i.name })))}
          onNavigate={(itemId) => setSelectedItemId(itemId)}
        />
      )}
    </PageShell>
  );
}

// ──────────────────────────────────────────────────────────────
// Board Empty State
// ──────────────────────────────────────────────────────────────
function BoardEmptyState({ onAddItem }: { onAddItem: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center pointer-events-none">
      {/* Table illustration */}
      <div className="mb-5">
        <div className="w-24 h-24 rounded-full bg-[#E3EFFE] flex items-center justify-center shadow-sm pointer-events-auto">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Table grid */}
            <rect x="6" y="10" width="40" height="6" rx="2" fill="#0073EA" opacity="0.3"/>
            <rect x="6" y="19" width="40" height="5" rx="2" fill="#0073EA" opacity="0.15"/>
            <rect x="6" y="27" width="40" height="5" rx="2" fill="#0073EA" opacity="0.15"/>
            <rect x="6" y="35" width="40" height="5" rx="2" fill="#0073EA" opacity="0.15"/>
            {/* Column separators */}
            <line x1="20" y1="10" x2="20" y2="40" stroke="#0073EA" strokeWidth="1" opacity="0.3"/>
            <line x1="34" y1="10" x2="34" y2="40" stroke="#0073EA" strokeWidth="1" opacity="0.3"/>
            {/* Plus badge */}
            <circle cx="42" cy="12" r="7" fill="#00CA72"/>
            <line x1="42" y1="9" x2="42" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="39" y1="12" x2="45" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-bold text-[#323338] mb-2 pointer-events-auto">
        הבורד ריק
      </h3>
      <p className="text-sm text-[#676879] max-w-xs mb-5 leading-relaxed pointer-events-auto">
        הוסף פריט ראשון לבורד — עקוב אחרי משימות, פרויקטים או כל מידע שחשוב לך.
      </p>

      <button
        onClick={onAddItem}
        className="flex items-center gap-2 px-5 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] shadow-sm hover:shadow-md transition-all active:scale-[0.97] pointer-events-auto"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="7" y1="1" x2="7" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="1" y1="7" x2="13" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        הוסף פריט ראשון
      </button>
    </div>
  );
}
