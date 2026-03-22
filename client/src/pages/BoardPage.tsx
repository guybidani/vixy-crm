import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Lock, Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import BoardPermissionsModal from "../components/boards/BoardPermissionsModal";
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
import ViewToggle from "../components/shared/ViewToggle";
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
  type Board,
  type BoardItem,
  type BoardColumn,
} from "../api/boards";

// Flattened row type for MondayBoard
interface BoardRow {
  id: string;
  _item: BoardItem;
  _groupId: string;
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
        name: item.name,
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
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    colKey: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [addingItemGroup, setAddingItemGroup] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  // Board name inline editing
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameValue, setBoardNameValue] = useState("");

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", id],
    queryFn: () => getBoard(id!),
    enabled: !!id,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
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

  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) => deleteBoardItem(id!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
  });

  const addGroupMut = useMutation({
    mutationFn: () => addBoardGroup(id!, { name: "קבוצה חדשה" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", id] }),
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
          <p className="text-text-secondary mb-4">הבורד המבוקש לא נמצא</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary hover:underline text-sm"
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
              <span
                className="text-[13px] font-medium text-[#323338] cursor-text hover:text-[#0073EA] transition-colors"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingCell({ itemId: row.id, colKey: "name" });
                  setEditValue(row.name);
                }}
              >
                {row.name || "—"}
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
                      className="text-[13px] text-[#323338] cursor-text"
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

            // TEXT, EMAIL, PHONE, LINK, PERSON — inline text edit
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
                if (col.type === "LINK" && val) {
                  return (
                    <a
                      href={val}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] text-[#0073EA] hover:underline truncate block"
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingCell({ itemId: row.id, colKey: col.key });
                        setEditValue(String(val || ""));
                      }}
                    >
                      {val}
                    </a>
                  );
                }
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
    <span
      className="group cursor-pointer flex items-center gap-2"
      onClick={() => {
        setEditingBoardName(true);
        setBoardNameValue(board?.name || "");
      }}
    >
      {board?.isPrivate && (
        <Lock size={14} className="text-[#6161FF] flex-shrink-0" />
      )}
      {board?.name || "טוען..."}
      <Pencil
        size={14}
        className="text-[#9699A6] opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </span>
  );

  return (
    <PageShell
      title={boardTitle}
      actions={
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
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
            onClick={() => setColumnEditorOpen(true)}
            className="px-3 py-1.5 text-[13px] text-[#323338] bg-white border border-[#D0D4E4] rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
          >
            + עמודה חדשה
          </button>
          <button
            onClick={() => addGroupMut.mutate()}
            className="px-3 py-1.5 text-[13px] text-[#323338] bg-white border border-[#D0D4E4] rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
          >
            + קבוצה חדשה
          </button>
        </div>
      }
    >
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
          onDeleteItem={(row: BoardRow) => {
            deleteItemMut.mutate(row.id);
          }}
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
    </PageShell>
  );
}
