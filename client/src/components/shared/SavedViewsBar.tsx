import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Star,
  Trash2,
  Pencil,
  RefreshCw,
  Undo2,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  listViews,
  createView,
  updateView,
  deleteView,
  setViewDefault,
  type SavedView,
} from "../../api/views";
import SaveViewDialog, { type SaveViewPreview } from "./SaveViewDialog";
import ConfirmDialog from "./ConfirmDialog";

/**
 * Rich state that a saved view can capture. Anything not provided is considered
 * "not set" and won't be written/compared.
 */
export interface ViewState {
  /** Flat API-style filters (legacy path — Contacts uses { status }, Deals uses { stage }, etc.) */
  filters?: Record<string, unknown>;
  /** MondayBoard column filters */
  boardFilters?: Array<{ column: string; values: string[] }>;
  /** Sort column key */
  sortBy?: string | null;
  /** Sort direction */
  sortDir?: "asc" | "desc" | null;
  /** Group-by column key */
  groupByKey?: string | null;
}

interface SavedViewsBarProps {
  entity: string;
  activeViewId: string | null;
  /** Called when user selects a view tab (including "All") or wants to restore a view's state */
  onSelectView: (view: SavedView | null) => void;
  /** Called when a saved view is activated so the page can apply its captured state */
  onApplyView?: (state: ViewState, view: SavedView) => void;

  /** ── Current state the user sees right now ──
   * These get compared against the active view to detect unsaved changes,
   * and get written when saving / updating a view. */
  currentFilters?: Record<string, unknown>;
  boardFilters?: Array<{ column: string; values: string[] }>;
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  groupByKey?: string | null;

  /** Optional column labels for nicer preview chips */
  columnLabels?: Record<string, string>;

  /** Kept for backward compatibility — if omitted, computed from currentFilters + boardFilters */
  hasActiveFilters?: boolean;
}

/** How many filters/sort/group settings are active in a given state */
function countActive(s: ViewState): number {
  let n = 0;
  for (const v of Object.values(s.filters ?? {})) {
    if (v != null && v !== "") n++;
  }
  for (const bf of s.boardFilters ?? []) {
    if (bf.values && bf.values.length > 0) n++;
  }
  if (s.sortBy) n++;
  if (s.groupByKey) n++;
  return n;
}

/** Stable JSON for deep compare — ignores key order inside objects */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Normalize state so compare/persist are deterministic (drop empty values) */
function normalizeState(s: ViewState): ViewState {
  const filters: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s.filters ?? {})) {
    if (v != null && v !== "") filters[k] = v;
  }
  const boardFilters = (s.boardFilters ?? [])
    .filter((bf) => bf.values && bf.values.length > 0)
    .map((bf) => ({ column: bf.column, values: [...bf.values].sort() }))
    .sort((a, b) => a.column.localeCompare(b.column));
  return {
    filters,
    boardFilters,
    sortBy: s.sortBy || null,
    sortDir: s.sortBy ? s.sortDir || "asc" : null,
    groupByKey: s.groupByKey || null,
  };
}

/** Extract the rich state out of a SavedView row */
function stateFromView(view: SavedView): ViewState {
  const raw = (view.filters ?? {}) as Record<string, unknown>;
  // New-format views store the rich state under these keys; everything else is
  // treated as legacy flat API filters.
  const {
    __boardFilters,
    __groupByKey,
    ...rest
  } = raw;
  return {
    filters: rest,
    boardFilters: Array.isArray(__boardFilters)
      ? (__boardFilters as Array<{ column: string; values: string[] }>)
      : [],
    sortBy: view.sortBy,
    sortDir: (view.sortDir as "asc" | "desc" | null) ?? null,
    groupByKey: typeof __groupByKey === "string" ? __groupByKey : null,
  };
}

/** Build the payload that goes to the API from the current UI state */
function statePayload(s: ViewState) {
  const norm = normalizeState(s);
  const filters: Record<string, unknown> = { ...(norm.filters ?? {}) };
  if ((norm.boardFilters ?? []).length > 0) {
    filters.__boardFilters = norm.boardFilters;
  }
  if (norm.groupByKey) {
    filters.__groupByKey = norm.groupByKey;
  }
  return {
    filters,
    sortBy: norm.sortBy ?? undefined,
    sortDir: (norm.sortDir ?? undefined) as "asc" | "desc" | undefined,
  };
}

export default function SavedViewsBar({
  entity,
  activeViewId,
  onSelectView,
  onApplyView,
  currentFilters,
  boardFilters,
  sortBy,
  sortDir,
  groupByKey,
  columnLabels,
  hasActiveFilters: hasActiveFiltersProp,
}: SavedViewsBarProps) {
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [renameViewId, setRenameViewId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    viewId: string;
    x: number;
    y: number;
  } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  const { data: views = [] } = useQuery({
    queryKey: ["saved-views", entity],
    queryFn: () => listViews(entity),
  });

  const currentState: ViewState = {
    filters: currentFilters,
    boardFilters,
    sortBy: sortBy ?? null,
    sortDir: sortDir ?? null,
    groupByKey: groupByKey ?? null,
  };

  const normCurrent = useMemo(
    () => normalizeState(currentState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stableStringify(currentFilters),
      stableStringify(boardFilters),
      sortBy,
      sortDir,
      groupByKey,
    ],
  );

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) || null,
    [views, activeViewId],
  );

  // Does the current on-screen state differ from the saved view?
  const isDirty = useMemo(() => {
    if (!activeView) return false;
    const normSaved = normalizeState(stateFromView(activeView));
    return stableStringify(normSaved) !== stableStringify(normCurrent);
  }, [activeView, normCurrent]);

  const hasActiveFilters =
    hasActiveFiltersProp ?? countActive(currentState) > 0;

  const currentCount = countActive(currentState);

  // ── Mutations ─────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { name: string; isDefault: boolean }) => {
      const payload = statePayload(currentState);
      return createView({
        entity,
        name: data.name,
        filters: payload.filters,
        sortBy: payload.sortBy,
        sortDir: payload.sortDir,
        isDefault: data.isDefault,
      });
    },
    onSuccess: (newView) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("תצוגה נשמרה");
      setShowSaveDialog(false);
      onSelectView(newView);
    },
    onError: () => toast.error("שגיאה בשמירת תצוגה"),
  });

  const renameMutation = useMutation({
    mutationFn: (data: { id: string; name: string; isDefault: boolean }) =>
      updateView(data.id, { name: data.name, isDefault: data.isDefault }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("שם התצוגה עודכן");
      setRenameViewId(null);
    },
    onError: () => toast.error("שגיאה בעדכון שם"),
  });

  const updateFiltersMutation = useMutation({
    mutationFn: (id: string) => {
      const payload = statePayload(currentState);
      return updateView(id, {
        filters: payload.filters,
        sortBy: payload.sortBy ?? null,
        sortDir: payload.sortDir ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("התצוגה עודכנה");
      setContextMenu(null);
    },
    onError: () => toast.error("שגיאה בעדכון תצוגה"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setViewDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("תצוגת ברירת המחדל עודכנה");
      setContextMenu(null);
    },
    onError: () => toast.error("שגיאה בהגדרת ברירת מחדל"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("תצוגה נמחקה");
      if (deletedId === activeViewId) {
        onSelectView(null);
      }
      setConfirmDeleteId(null);
      setContextMenu(null);
    },
    onError: () => toast.error("שגיאה במחיקת תצוגה"),
  });

  // ── Effects ────────────────────────────────────

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  // Adjust context menu position if it would overflow viewport
  useEffect(() => {
    if (!contextMenu || !contextRef.current) return;
    const rect = contextRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = contextMenu;
    if (x + rect.width > vw) x = vw - rect.width - 8;
    if (y + rect.height > vh) y = vh - rect.height - 8;
    if (x < 0) x = 8;
    if (y < 0) y = 8;
    if (x !== contextMenu.x || y !== contextMenu.y) {
      contextRef.current.style.left = `${x}px`;
      contextRef.current.style.top = `${y}px`;
    }
  }, [contextMenu]);

  // Find default view on mount
  useEffect(() => {
    if (views.length > 0 && activeViewId === null) {
      const defaultView = views.find((v) => v.isDefault);
      if (defaultView) {
        handleSelectViewRich(defaultView);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views]);

  // ── Handlers ───────────────────────────────────

  function handleContextMenu(e: React.MouseEvent, viewId: string) {
    e.preventDefault();
    setContextMenu({ viewId, x: e.clientX, y: e.clientY });
  }

  /** Select a view AND broadcast its full captured state so the page can apply it */
  function handleSelectViewRich(view: SavedView | null) {
    onSelectView(view);
    if (view && onApplyView) {
      onApplyView(stateFromView(view), view);
    }
  }

  /** Re-apply the saved view's state, discarding local changes */
  function handleRestore() {
    if (activeView) handleSelectViewRich(activeView);
  }

  const contextMenuView = contextMenu
    ? views.find((v) => v.id === contextMenu.viewId)
    : null;

  const renameView = renameViewId
    ? views.find((v) => v.id === renameViewId)
    : null;

  return (
    <>
      <div
        className="flex items-center gap-0 mb-3 border-b border-[#E6E9EF] -mx-0 overflow-x-auto"
        dir="rtl"
      >
        {/* "All" tab */}
        <button
          onClick={() => onSelectView(null)}
          className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-[2px] -mb-px whitespace-nowrap ${
            activeViewId === null
              ? "text-[#0073EA] border-[#0073EA]"
              : "text-[#676879] border-transparent hover:text-[#323338] hover:bg-[#F6F7FB]"
          }`}
        >
          הכל
        </button>

        {/* Saved view tabs */}
        {views.map((view) => {
          const count = countActive(stateFromView(view));
          const isActive = activeViewId === view.id;
          return (
            <button
              key={view.id}
              onClick={() => handleSelectViewRich(view)}
              onContextMenu={(e) => handleContextMenu(e, view.id)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-[2px] -mb-px whitespace-nowrap flex items-center gap-1.5 group/tab ${
                isActive
                  ? "text-[#0073EA] border-[#0073EA]"
                  : "text-[#676879] border-transparent hover:text-[#323338] hover:bg-[#F6F7FB]"
              }`}
            >
              {view.isDefault && (
                <Star
                  size={11}
                  className={
                    isActive
                      ? "fill-[#0073EA] text-[#0073EA]"
                      : "fill-[#FDAB3D] text-[#FDAB3D]"
                  }
                />
              )}
              <span>{view.name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] font-semibold rounded-full px-1.5 py-[1px] ${
                    isActive
                      ? "bg-[#0073EA]/10 text-[#0073EA]"
                      : "bg-[#F6F7FB] text-[#676879]"
                  }`}
                  title={`${count} הגדרות פעילות`}
                >
                  {count}
                </span>
              )}
              {isActive && isDirty && (
                <span
                  className="text-[10px] font-semibold rounded-full px-1.5 py-[1px] bg-[#FFF3E0] text-[#FDAB3D]"
                  title="ישנם שינויים שלא נשמרו"
                >
                  משתנה
                </span>
              )}
              {/* Context trigger (hover only) */}
              <span
                role="button"
                tabIndex={-1}
                aria-label="אפשרויות תצוגה"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setContextMenu({
                    viewId: view.id,
                    x: rect.left,
                    y: rect.bottom + 4,
                  });
                }}
                className="opacity-0 group-hover/tab:opacity-100 ms-0.5 p-0.5 rounded hover:bg-black/5 transition-opacity"
              >
                <MoreHorizontal size={13} />
              </span>
            </button>
          );
        })}

        {/* Save-current / new view button */}
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-3 py-2 text-[13px] text-[#676879] hover:text-[#323338] hover:bg-[#F6F7FB] transition-colors flex items-center gap-1 border-b-[2px] border-transparent -mb-px whitespace-nowrap"
          title={hasActiveFilters ? "שמור תצוגה נוכחית" : "שמור תצוגה חדשה"}
        >
          <Plus size={13} />
          שמור תצוגה
        </button>

        {/* Dirty-state actions for the active view */}
        {activeView && isDirty && (
          <div className="flex items-center gap-1 pe-2 ms-auto">
            <button
              onClick={handleRestore}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-[#676879] hover:text-[#323338] hover:bg-[#F6F7FB] rounded-[4px] transition-colors whitespace-nowrap"
              title="שחזר את התצוגה השמורה"
            >
              <Undo2 size={12} />
              שחזר
            </button>
            <button
              onClick={() => updateFiltersMutation.mutate(activeView.id)}
              disabled={updateFiltersMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-white bg-[#0073EA] hover:bg-[#0060C2] rounded-[4px] transition-colors disabled:opacity-50 whitespace-nowrap"
              title="שמור שינויים בתצוגה"
            >
              <RefreshCw size={12} />
              עדכן תצוגה
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextMenuView && (
        <div
          ref={contextRef}
          role="menu"
          dir="rtl"
          className="fixed z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#E6E9EF] py-1 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            role="menuitem"
            onClick={() => {
              updateFiltersMutation.mutate(contextMenuView.id);
            }}
            disabled={!hasActiveFilters && currentCount === 0}
            className="w-full px-3 py-2 text-[13px] text-right flex items-center gap-2 hover:bg-[#F6F7FB] text-[#323338] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className="text-[#676879]" />
            עדכן מסננים נוכחיים
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setRenameViewId(contextMenuView.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-[13px] text-right flex items-center gap-2 hover:bg-[#F6F7FB] text-[#323338] transition-colors"
          >
            <Pencil size={14} className="text-[#676879]" />
            שנה שם
          </button>
          <button
            role="menuitem"
            onClick={() => setDefaultMutation.mutate(contextMenuView.id)}
            disabled={contextMenuView.isDefault}
            className="w-full px-3 py-2 text-[13px] text-right flex items-center gap-2 hover:bg-[#F6F7FB] text-[#323338] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Star
              size={14}
              className={
                contextMenuView.isDefault
                  ? "fill-[#FDAB3D] text-[#FDAB3D]"
                  : "text-[#676879]"
              }
            />
            {contextMenuView.isDefault ? "תצוגת ברירת מחדל" : "הגדר כברירת מחדל"}
          </button>
          <div className="border-t border-[#E6E9EF] my-1" />
          <button
            role="menuitem"
            onClick={() => {
              setConfirmDeleteId(contextMenuView.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-[13px] text-right flex items-center gap-2 hover:bg-[#FFEEF0] text-[#E44258] transition-colors"
          >
            <Trash2 size={14} />
            מחק תצוגה
          </button>
        </div>
      )}

      {/* Save dialog (create) */}
      <SaveViewDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={(name, isDefault) => createMutation.mutate({ name, isDefault })}
        saving={createMutation.isPending}
        mode="create"
        preview={
          {
            filters: currentState.filters,
            boardFilters: currentState.boardFilters,
            sortBy: currentState.sortBy,
            sortDir: currentState.sortDir,
            groupByKey: currentState.groupByKey,
            columnLabels,
          } as SaveViewPreview
        }
      />

      {/* Rename dialog */}
      <SaveViewDialog
        open={!!renameView}
        onClose={() => setRenameViewId(null)}
        onSave={(name, isDefault) => {
          if (renameView)
            renameMutation.mutate({ id: renameView.id, name, isDefault });
        }}
        saving={renameMutation.isPending}
        mode="rename"
        initialName={renameView?.name ?? ""}
        initialIsDefault={renameView?.isDefault ?? false}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onConfirm={() => {
          if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
        title="מחיקת תצוגה"
        message="האם למחוק את התצוגה השמורה? לא ניתן לבטל פעולה זו."
        confirmText="מחק"
        variant="danger"
      />
    </>
  );
}
