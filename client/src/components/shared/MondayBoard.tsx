import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Palette,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  EyeOff,
  Layers,
  GripVertical,
} from "lucide-react";
import RowContextMenu, { type ContextMenuItem } from "./RowContextMenu";
import { cn } from "../../lib/utils";

/* ── Types ──────────────────────────────────────────── */

export interface StatusOption {
  label: string;
  color: string;
}

export type ColumnSummary = "count" | "sum" | "avg" | "min" | "max" | "none";

export interface MondayColumn<T> {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => any;
  /** Summary aggregation to show at bottom of group */
  summary?: ColumnSummary;
  /** Custom summary value extractor (defaults to row[key]) */
  summaryValue?: (row: T) => number | null;
  /** Remove cell padding so the rendered content fills the full cell (e.g. status cells) */
  noPadding?: boolean;
}

export interface MondayGroup<T> {
  key: string;
  label: string;
  color: string;
  items: T[];
}

const GROUP_COLORS = [
  "#579BFC",
  "#00CA72",
  "#FDAB3D",
  "#FB275D",
  "#A25DDC",
  "#6161FF",
  "#FF642E",
  "#66CCFF",
  "#C4C4C4",
  "#333333",
  "#9D99B9",
  "#D974B0",
  "#4ECCC6",
  "#CAB641",
];

interface MondayBoardProps<T extends { id: string }> {
  groups: MondayGroup<T>[];
  columns: MondayColumn<T>[];
  onRowClick?: (row: T) => void;
  onNewItem?: () => void;
  onNewItemInGroup?: (groupKey: string) => void;
  newItemLabel?: string;
  /** Optional new item dropdown menu items */
  newItemMenuItems?: Array<{ label: string; icon?: ReactNode; onClick: () => void }>;
  /** Optional "Add group" callback */
  onAddGroup?: () => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  /** Field name to use for status distribution bar */
  statusKey?: keyof T & string;
  /** Status options for the distribution bar colors */
  statusOptions?: Record<string, StatusOption>;
  /** Group management callbacks */
  onGroupRename?: (groupKey: string, newName: string) => void;
  onGroupDelete?: (groupKey: string) => void;
  onGroupColorChange?: (groupKey: string, color: string) => void;
  /** Column management callbacks */
  onColumnRename?: (colKey: string, newLabel: string) => void;
  onColumnDelete?: (colKey: string) => void;
  /** Called when column order changes (keys in new order) */
  onColumnReorder?: (orderedKeys: string[]) => void;
  /** Called when user clicks the + add column button */
  onAddColumn?: () => void;
  /** Row delete */
  onDeleteItem?: (row: T) => void;
  /** Move item to a different group */
  onMoveItem?: (itemId: string, targetGroupKey: string) => void;
  /** Context menu items builder */
  contextMenuItems?: (row: T) => ContextMenuItem[];
  /** Columns available for dynamic grouping */
  groupByColumns?: Array<{ key: string; label: string }>;
  /** Controlled group-by key (lifted state for persistence) */
  groupByKey?: string | null;
  /** Called when user changes group-by selection */
  onGroupByChange?: (key: string | null) => void;
  /** Controlled active filters (lifted state for persistence) */
  activeFilters?: Array<{ column: string; values: string[] }>;
  /** Called when filters change */
  onFiltersChange?: (filters: Array<{ column: string; values: string[] }>) => void;
  /** Bulk selection */
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** ID of the most recently added item — triggers slide-in animation */
  newItemId?: string | null;
}

/* ── Main Board ─────────────────────────────────────── */

export default function MondayBoard<T extends { id: string }>({
  groups,
  columns,
  onRowClick,
  onNewItem,
  onNewItemInGroup,
  newItemLabel = "פריט חדש",
  newItemMenuItems,
  onAddGroup,
  search,
  onSearchChange,
  searchPlaceholder = "חיפוש...",
  loading,
  pagination,
  onPageChange,
  statusKey,
  statusOptions,
  onGroupRename,
  onGroupDelete,
  onGroupColorChange,
  onColumnRename,
  onColumnDelete,
  onColumnReorder,
  onAddColumn,
  onDeleteItem,
  onMoveItem,
  contextMenuItems,
  groupByColumns,
  groupByKey: controlledGroupByKey,
  onGroupByChange,
  activeFilters: controlledActiveFilters,
  onFiltersChange,
  selectedIds,
  onSelectionChange,
  newItemId,
}: MondayBoardProps<T>) {
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [groupMenuKey, setGroupMenuKey] = useState<string | null>(null);
  const [groupColorKey, setGroupColorKey] = useState<string | null>(null);
  const [editingColKey, setEditingColKey] = useState<string | null>(null);
  const [editingColLabel, setEditingColLabel] = useState("");
  const [colMenuKey, setColMenuKey] = useState<string | null>(null);

  // ── Column drag-to-reorder state ──
  const [colOrder, setColOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const dragColRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // ── Row drag-to-move state ──
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverGroupKey, setDragOverGroupKey] = useState<string | null>(null);

  // Keep colOrder in sync when columns prop changes (new col added / removed)
  useEffect(() => {
    setColOrder((prev) => {
      const newKeys = columns.map((c) => c.key);
      const kept = prev.filter((k) => newKeys.includes(k));
      const added = newKeys.filter((k) => !kept.includes(k));
      return [...kept, ...added];
    });
  }, [columns]);

  // ── Sort state ──
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // ── Context menu state ──
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: T;
  } | null>(null);

  // ── Group By state (controlled or internal) ──
  const [internalGroupByKey, setInternalGroupByKey] = useState<string | null>(null);
  const groupByKey = controlledGroupByKey !== undefined ? controlledGroupByKey : internalGroupByKey;
  const setGroupByKey = (key: string | null) => {
    if (onGroupByChange) {
      onGroupByChange(key);
    } else {
      setInternalGroupByKey(key);
    }
  };
  const [groupByOpen, setGroupByOpen] = useState(false);

  // ── Column Visibility state ──
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [hideColsOpen, setHideColsOpen] = useState(false);

  // ── Keyboard navigation state ──
  const [focusedCell, setFocusedCell] = useState<{
    groupIdx: number;
    rowIdx: number;
    colIdx: number;
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // ── Filter state (controlled or internal) ──
  const [filterOpen, setFilterOpen] = useState(false);
  const [internalActiveFilters, setInternalActiveFilters] = useState<
    Array<{ column: string; values: string[] }>
  >([]);
  const activeFilters = controlledActiveFilters !== undefined ? controlledActiveFilters : internalActiveFilters;
  const setActiveFilters = (
    updater: Array<{ column: string; values: string[] }> | ((prev: Array<{ column: string; values: string[] }>) => Array<{ column: string; values: string[] }>)
  ) => {
    const newFilters = typeof updater === "function" ? updater(activeFilters) : updater;
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    } else {
      setInternalActiveFilters(newFilters);
    }
  };
  const [filterColKey, setFilterColKey] = useState<string | null>(null);

  // Compute unique values per column with counts (for filter picker)
  const columnValues = useMemo(() => {
    const map: Record<string, Map<string, number>> = {};
    for (const g of groups) {
      for (const item of g.items) {
        for (const col of columns) {
          if (col.key === "__add_col") continue;
          const val = (item as any)[col.key];
          if (val != null && val !== "") {
            if (!map[col.key]) map[col.key] = new Map();
            const strVal = String(val);
            map[col.key].set(strVal, (map[col.key].get(strVal) || 0) + 1);
          }
        }
      }
    }
    return map;
  }, [groups, columns]);

  // Apply filters to groups
  const filteredGroups = useMemo(() => {
    if (activeFilters.length === 0) return groups;
    return groups.map((g) => ({
      ...g,
      items: g.items.filter((item) =>
        activeFilters.every((f) => {
          const val = String((item as any)[f.column] ?? "");
          return f.values.includes(val);
        }),
      ),
    }));
  }, [groups, activeFilters]);

  // Apply sort to groups
  const sortedGroups = useMemo(() => {
    if (!sortColumn) return filteredGroups;
    const col = columns.find((c) => c.key === sortColumn);
    if (!col) return filteredGroups;

    return filteredGroups.map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => {
        const aVal = col.sortValue ? col.sortValue(a) : (a as any)[sortColumn];
        const bVal = col.sortValue ? col.sortValue(b) : (b as any)[sortColumn];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let cmp: number;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else if (aVal instanceof Date && bVal instanceof Date) {
          cmp = aVal.getTime() - bVal.getTime();
        } else {
          cmp = String(aVal).localeCompare(String(bVal), "he");
        }

        return sortDirection === "desc" ? -cmp : cmp;
      }),
    }));
  }, [filteredGroups, sortColumn, sortDirection, columns]);

  // Apply dynamic group-by (replaces original groups with regrouped data)
  const groupedData = useMemo(() => {
    if (!groupByKey) return sortedGroups;

    const allItems = sortedGroups.flatMap((g) => g.items);
    const byValue = new Map<string, T[]>();

    for (const item of allItems) {
      const rawVal = (item as any)[groupByKey];
      const val = rawVal != null && rawVal !== "" ? String(rawVal) : "—";
      if (!byValue.has(val)) byValue.set(val, []);
      byValue.get(val)!.push(item);
    }

    const colorList = GROUP_COLORS;
    let idx = 0;
    const result: MondayGroup<T>[] = [];
    for (const [val, items] of byValue) {
      // Try to get status color if available
      const statusColor = statusOptions?.[val]?.color;
      result.push({
        key: `groupby_${val}`,
        label: statusOptions?.[val]?.label || val,
        color: statusColor || colorList[idx % colorList.length],
        items,
      });
      idx++;
    }
    return result;
  }, [sortedGroups, groupByKey, statusOptions]);

  // Filter visible columns (hide hidden ones) + apply drag order
  const visibleColumns = useMemo(() => {
    const ordered = colOrder
      .map((k) => columns.find((c) => c.key === k))
      .filter(Boolean) as typeof columns;
    if (hiddenColumns.size === 0) return ordered;
    return ordered.filter((c) => !hiddenColumns.has(c.key));
  }, [columns, hiddenColumns, colOrder]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function addFilter(colKey: string, value: string) {
    setActiveFilters((prev) => {
      const existing = prev.find((f) => f.column === colKey);
      if (existing) {
        if (existing.values.includes(value)) {
          // Remove value
          const newValues = existing.values.filter((v) => v !== value);
          if (newValues.length === 0)
            return prev.filter((f) => f.column !== colKey);
          return prev.map((f) =>
            f.column === colKey ? { ...f, values: newValues } : f,
          );
        }
        // Add value
        return prev.map((f) =>
          f.column === colKey ? { ...f, values: [...f.values, value] } : f,
        );
      }
      return [...prev, { column: colKey, values: [value] }];
    });
  }

  function removeFilter(colKey: string) {
    setActiveFilters((prev) => prev.filter((f) => f.column !== colKey));
  }

  function clearAllFilters() {
    setActiveFilters([]);
    setFilterOpen(false);
    setFilterColKey(null);
  }

  function toggleSort(colKey: string) {
    if (sortColumn === colKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(colKey);
      setSortDirection("asc");
    }
  }

  function clearSort() {
    setSortColumn(null);
    setSortDirection("asc");
  }

  // ── Keyboard navigation helpers ──
  const cellKey = (gIdx: number, rIdx: number, cIdx: number) =>
    `${gIdx}-${rIdx}-${cIdx}`;

  const setCellRef = useCallback(
    (
      gIdx: number,
      rIdx: number,
      cIdx: number,
      el: HTMLTableCellElement | null,
    ) => {
      const key = cellKey(gIdx, rIdx, cIdx);
      if (el) {
        cellRefs.current.set(key, el);
      } else {
        cellRefs.current.delete(key);
      }
    },
    [],
  );

  // Scroll focused cell into view
  useEffect(() => {
    if (!focusedCell) return;
    const key = cellKey(
      focusedCell.groupIdx,
      focusedCell.rowIdx,
      focusedCell.colIdx,
    );
    const el = cellRefs.current.get(key);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusedCell]);

  const handleBoardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't handle if an input/textarea is focused (user is editing)
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const expandedGroups = groupedData.filter(
        (g) => !collapsedGroups[g.key] && g.items.length > 0,
      );
      if (expandedGroups.length === 0) return;
      const colCount = visibleColumns.length;
      if (colCount === 0) return;

      // Map expanded groups back to their original groupedData indices
      const expandedMap = groupedData
        .map((g, i) => ({ group: g, originalIdx: i }))
        .filter(
          (x) => !collapsedGroups[x.group.key] && x.group.items.length > 0,
        );

      if (e.key === "Escape") {
        setFocusedCell(null);
        return;
      }

      if (!focusedCell) {
        // First arrow key press: focus first cell
        if (
          ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          setFocusedCell({
            groupIdx: expandedMap[0].originalIdx,
            rowIdx: 0,
            colIdx: 0,
          });
        }
        return;
      }

      const { groupIdx, rowIdx, colIdx } = focusedCell;
      const currentExpandedIdx = expandedMap.findIndex(
        (x) => x.originalIdx === groupIdx,
      );
      if (currentExpandedIdx === -1) {
        setFocusedCell(null);
        return;
      }
      const currentGroup = expandedMap[currentExpandedIdx];

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (rowIdx < currentGroup.group.items.length - 1) {
            setFocusedCell({ groupIdx, rowIdx: rowIdx + 1, colIdx });
          } else if (currentExpandedIdx < expandedMap.length - 1) {
            // Jump to first row of next expanded group
            const next = expandedMap[currentExpandedIdx + 1];
            setFocusedCell({ groupIdx: next.originalIdx, rowIdx: 0, colIdx });
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (rowIdx > 0) {
            setFocusedCell({ groupIdx, rowIdx: rowIdx - 1, colIdx });
          } else if (currentExpandedIdx > 0) {
            const prev = expandedMap[currentExpandedIdx - 1];
            setFocusedCell({
              groupIdx: prev.originalIdx,
              rowIdx: prev.group.items.length - 1,
              colIdx,
            });
          }
          break;
        }
        case "ArrowLeft": {
          // RTL: left = next column
          e.preventDefault();
          if (colIdx < colCount - 1) {
            setFocusedCell({ groupIdx, rowIdx, colIdx: colIdx + 1 });
          }
          break;
        }
        case "ArrowRight": {
          // RTL: right = previous column
          e.preventDefault();
          if (colIdx > 0) {
            setFocusedCell({ groupIdx, rowIdx, colIdx: colIdx - 1 });
          }
          break;
        }
        case "Tab": {
          e.preventDefault();
          if (e.shiftKey) {
            // Previous cell
            if (colIdx > 0) {
              setFocusedCell({ groupIdx, rowIdx, colIdx: colIdx - 1 });
            } else if (rowIdx > 0) {
              setFocusedCell({
                groupIdx,
                rowIdx: rowIdx - 1,
                colIdx: colCount - 1,
              });
            } else if (currentExpandedIdx > 0) {
              const prev = expandedMap[currentExpandedIdx - 1];
              setFocusedCell({
                groupIdx: prev.originalIdx,
                rowIdx: prev.group.items.length - 1,
                colIdx: colCount - 1,
              });
            }
          } else {
            // Next cell
            if (colIdx < colCount - 1) {
              setFocusedCell({ groupIdx, rowIdx, colIdx: colIdx + 1 });
            } else if (rowIdx < currentGroup.group.items.length - 1) {
              setFocusedCell({ groupIdx, rowIdx: rowIdx + 1, colIdx: 0 });
            } else if (currentExpandedIdx < expandedMap.length - 1) {
              const next = expandedMap[currentExpandedIdx + 1];
              setFocusedCell({
                groupIdx: next.originalIdx,
                rowIdx: 0,
                colIdx: 0,
              });
            }
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          // On any focused row: open detail panel via onRowClick
          const currentRow = expandedMap[currentExpandedIdx]?.group.items[rowIdx];
          if (currentRow && onRowClick) {
            onRowClick(currentRow);
          } else {
            // Fallback: simulate click on the focused cell
            const key = cellKey(groupIdx, rowIdx, colIdx);
            const cellEl = cellRefs.current.get(key);
            if (cellEl) {
              const clickable = cellEl.querySelector<HTMLElement>(
                "button, input, [tabindex], [role='button']",
              );
              if (clickable) {
                clickable.click();
                clickable.focus();
              } else {
                cellEl.click();
              }
            }
          }
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusedCell, groupedData, collapsedGroups, visibleColumns.length, onRowClick],
  );

  // Global "N" shortcut: open new item when no input is focused
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "n" || e.key === "N") {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          onNewItem?.();
        }
      }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [onNewItem]);

  const hasNewItem = !!(onNewItem || onNewItemInGroup);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setFilterColKey(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  return (
    <div
      className="flex flex-col gap-0 outline-none"
      ref={boardRef}
      tabIndex={0}
      onKeyDown={handleBoardKeyDown}
    >
      {/* ── Toolbar ──────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {onNewItem && (
          <NewItemButton
            label={newItemLabel}
            onClick={onNewItem}
            menuItems={newItemMenuItems}
          />
        )}

        {onSearchChange && (
          <div className="relative">
            <Search
              size={15}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#676879]"
            />
            <input
              type="text"
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pr-8 pl-3 py-[7px] text-[13px] border border-[#D0D4E4] rounded-[4px] text-[#323338] placeholder:text-[#C3C6D4] focus:outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]/20 w-[200px]"
            />
          </div>
        )}

        {/* Filter button */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => {
              setFilterOpen(!filterOpen);
              setFilterColKey(null);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-[7px] text-[13px] rounded-[4px] transition-colors",
              activeFilters.length > 0
                ? "bg-[#E6F4FF] text-[#0073EA] border border-[#0073EA]/30"
                : "text-[#323338] hover:bg-[#F5F6F8]",
            )}
          >
            <Filter
              size={15}
              className={
                activeFilters.length > 0 ? "text-[#0073EA]" : "text-[#676879]"
              }
            />
            סינון
            {activeFilters.length > 0 && (
              <span className="bg-[#0073EA] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Filter dropdown */}
          {filterOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] min-w-[300px]">
              <div className="p-3 border-b border-[#E6E9EF] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#323338]">
                  סינון לפי עמודה
                </span>
                {activeFilters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[11px] text-[#FB275D] hover:underline"
                  >
                    נקה הכל
                  </button>
                )}
              </div>

              {!filterColKey ? (
                /* Column list */
                <div className="max-h-[300px] overflow-y-auto py-1">
                  {columns
                    .filter(
                      (c) => c.key !== "__add_col" && columnValues[c.key]?.size,
                    )
                    .map((col) => {
                      const active = activeFilters.find(
                        (f) => f.column === col.key,
                      );
                      const totalValues = columnValues[col.key]?.size || 0;
                      return (
                        <button
                          key={col.key}
                          onClick={() => setFilterColKey(col.key)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                        >
                          <span>{col.label}</span>
                          <div className="flex items-center gap-2">
                            {active ? (
                              <span className="text-[11px] text-[#0073EA] bg-[#E6F4FF] px-1.5 py-0.5 rounded">
                                {active.values.length} נבחרו
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#9699A6]">
                                {totalValues}
                              </span>
                            )}
                            <ChevronDown
                              size={14}
                              className="text-[#9699A6] -rotate-90"
                            />
                          </div>
                        </button>
                      );
                    })}
                </div>
              ) : (
                /* Value picker for selected column */
                <div>
                  <button
                    onClick={() => setFilterColKey(null)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#0073EA] hover:bg-[#F5F6F8] w-full border-b border-[#E6E9EF]"
                  >
                    <ChevronDown size={14} className="rotate-90" />
                    {columns.find((c) => c.key === filterColKey)?.label}
                  </button>
                  <div className="max-h-[250px] overflow-y-auto py-1">
                    {[
                      ...(columnValues[filterColKey] ||
                        new Map<string, number>()),
                    ]
                      .sort(([a], [b]) => a.localeCompare(b, "he"))
                      .map(([val, count]) => {
                        const isChecked = activeFilters
                          .find((f) => f.column === filterColKey)
                          ?.values.includes(val);
                        // Try to get status label/color
                        const statusOpt = statusOptions?.[val];
                        return (
                          <label
                            key={val}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F6F8] cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={!!isChecked}
                              onChange={() => addFilter(filterColKey, val)}
                              className="w-4 h-4 rounded accent-[#0073EA]"
                            />
                            {statusOpt ? (
                              <span
                                className="flex-1 px-2 py-0.5 text-[12px] font-medium text-white rounded-sm text-center"
                                style={{ backgroundColor: statusOpt.color }}
                              >
                                {statusOpt.label}
                              </span>
                            ) : (
                              <span className="flex-1 text-[13px] text-[#323338]">
                                {val || "—"}
                              </span>
                            )}
                            <span className="text-[11px] text-[#9699A6] tabular-nums min-w-[20px] text-left">
                              {count}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sort button */}
        {columns.some((c) => c.sortable) && (
          <div className="relative">
            <button
              onClick={() => {
                if (sortColumn) {
                  clearSort();
                } else {
                  // Sort by first sortable column
                  const firstSortable = columns.find((c) => c.sortable);
                  if (firstSortable) toggleSort(firstSortable.key);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-[7px] text-[13px] rounded-[4px] transition-colors",
                sortColumn
                  ? "bg-[#E6F4FF] text-[#0073EA] border border-[#0073EA]/30"
                  : "text-[#323338] hover:bg-[#F5F6F8]",
              )}
            >
              <ArrowUpDown
                size={15}
                className={sortColumn ? "text-[#0073EA]" : "text-[#676879]"}
              />
              מיון
              {sortColumn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSort();
                  }}
                  className="p-0.5 hover:bg-[#0073EA]/10 rounded-full transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </button>
          </div>
        )}

        {/* Hide columns button */}
        <div className="relative">
          <button
            onClick={() => setHideColsOpen(!hideColsOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-[7px] text-[13px] rounded-[4px] transition-colors",
              hiddenColumns.size > 0
                ? "bg-[#E6F4FF] text-[#0073EA] border border-[#0073EA]/30"
                : "text-[#323338] hover:bg-[#F5F6F8]",
            )}
          >
            {hiddenColumns.size > 0 ? (
              <EyeOff size={15} className="text-[#0073EA]" />
            ) : (
              <Eye size={15} className="text-[#676879]" />
            )}
            הסתר
            {hiddenColumns.size > 0 && (
              <span className="bg-[#0073EA] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {hiddenColumns.size}
              </span>
            )}
          </button>

          {hideColsOpen && (
            <HideColumnsDropdown
              columns={columns}
              hiddenColumns={hiddenColumns}
              onToggle={(colKey) => {
                setHiddenColumns((prev) => {
                  const next = new Set(prev);
                  if (next.has(colKey)) next.delete(colKey);
                  else next.add(colKey);
                  return next;
                });
              }}
              onShowAll={() => setHiddenColumns(new Set())}
              onClose={() => setHideColsOpen(false)}
            />
          )}
        </div>

        {/* Group By button */}
        {groupByColumns && groupByColumns.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setGroupByOpen(!groupByOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-[7px] text-[13px] rounded-[4px] transition-colors",
                groupByKey
                  ? "bg-[#E6F4FF] text-[#0073EA] border border-[#0073EA]/30"
                  : "text-[#323338] hover:bg-[#F5F6F8]",
              )}
            >
              <Layers
                size={15}
                className={groupByKey ? "text-[#0073EA]" : "text-[#676879]"}
              />
              קבץ לפי
              {groupByKey && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupByKey(null);
                  }}
                  className="p-0.5 hover:bg-[#0073EA]/10 rounded-full transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </button>

            {groupByOpen && (
              <GroupByDropdown
                groupByColumns={groupByColumns}
                activeGroupBy={groupByKey}
                onSelect={(key) => {
                  setGroupByKey(key === groupByKey ? null : key);
                  setGroupByOpen(false);
                }}
                onClose={() => setGroupByOpen(false)}
              />
            )}
          </div>
        )}

        <button
          aria-label="אפשרויות נוספות"
          className="p-[7px] text-[#676879] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>

        {/* Keyboard shortcuts tooltip */}
        <KeyboardShortcutsButton />
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] text-[#9699A6]">מסוננים:</span>
          {activeFilters.map((f) => {
            const col = columns.find((c) => c.key === f.column);
            return (
              <div
                key={f.column}
                className="flex items-center gap-1 bg-[#E6F4FF] text-[#0073EA] text-[12px] px-2 py-1 rounded-full"
              >
                <span className="font-medium">{col?.label}</span>
                <span className="text-[#0073EA]/60">({f.values.length})</span>
                <button
                  onClick={() => removeFilter(f.column)}
                  aria-label={`הסר סינון ${col?.label}`}
                  className="p-0.5 hover:bg-[#0073EA]/10 rounded-full transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          <button
            onClick={clearAllFilters}
            className="text-[11px] text-[#676879] hover:text-[#FB275D] transition-colors"
          >
            נקה הכל
          </button>
        </div>
      )}

      {/* Active sort chip */}
      {sortColumn && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-[#9699A6]">ממוין לפי:</span>
          <div className="flex items-center gap-1 bg-[#E6F4FF] text-[#0073EA] text-[12px] px-2 py-1 rounded-full">
            {sortDirection === "asc" ? (
              <ArrowUp size={12} />
            ) : (
              <ArrowDown size={12} />
            )}
            <span className="font-medium">
              {columns.find((c) => c.key === sortColumn)?.label}
            </span>
            <span className="text-[#0073EA]/60">
              ({sortDirection === "asc" ? "עולה" : "יורד"})
            </span>
            <button
              onClick={clearSort}
              className="p-0.5 hover:bg-[#0073EA]/10 rounded-full transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Groups ───────────────────────────── */}
      {loading ? (
        <BoardSkeleton columns={columns} />
      ) : (
        groupedData.map((group, groupIdx) => (
          <div key={group.key} className="mb-6">
            {/* Group Header */}
            <div className="flex items-center gap-1.5 mb-1 select-none group/header pr-[6px]" style={{ borderRight: `3px solid ${group.color}` }}>
              <button
                onClick={() => toggleGroup(group.key)}
                aria-expanded={!collapsedGroups[group.key]}
                aria-label={`${collapsedGroups[group.key] ? "הרחב" : "כווץ"} קבוצה ${group.label}`}
                className="p-0.5 hover:bg-black/5 rounded transition-colors cursor-pointer"
                style={{ color: group.color }}
              >
                {collapsedGroups[group.key] ? (
                  <ChevronRight size={18} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={18} strokeWidth={2.5} />
                )}
              </button>

              {/* Editable group name */}
              {editingGroupKey === group.key && onGroupRename ? (
                <input
                  autoFocus
                  className="text-[15px] font-bold bg-transparent outline-none border-b-2 py-0"
                  style={{ color: group.color, borderColor: group.color }}
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onBlur={() => {
                    if (
                      editingGroupName.trim() &&
                      editingGroupName !== group.label
                    ) {
                      onGroupRename(group.key, editingGroupName.trim());
                    }
                    setEditingGroupKey(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingGroupKey(null);
                  }}
                />
              ) : (
                <span
                  className={cn(
                    "text-[15px] font-bold",
                    onGroupRename && "cursor-pointer hover:opacity-70",
                  )}
                  style={{ color: group.color }}
                  onDoubleClick={() => {
                    if (onGroupRename) {
                      setEditingGroupKey(group.key);
                      setEditingGroupName(group.label);
                    }
                  }}
                >
                  {group.label}
                </span>
              )}

              <span className="text-[12px] text-[#676879] font-normal mr-1">
                {group.items.length} פריטים
              </span>

              {/* Group actions menu */}
              {(onGroupRename || onGroupDelete || onGroupColorChange) && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupMenuKey(
                        groupMenuKey === group.key ? null : group.key,
                      );
                      setGroupColorKey(null);
                    }}
                    aria-label={`תפריט קבוצה ${group.label}`}
                    className="p-1 rounded hover:bg-black/5 opacity-0 group-hover/header:opacity-100 transition-all text-[#676879]"
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {groupMenuKey === group.key && (
                    <GroupMenu
                      groupKey={group.key}
                      groupColor={group.color}
                      onRename={
                        onGroupRename
                          ? () => {
                              setEditingGroupKey(group.key);
                              setEditingGroupName(group.label);
                              setGroupMenuKey(null);
                            }
                          : undefined
                      }
                      onDelete={
                        onGroupDelete
                          ? () => {
                              onGroupDelete(group.key);
                              setGroupMenuKey(null);
                            }
                          : undefined
                      }
                      onColorChange={onGroupColorChange}
                      showColorPicker={groupColorKey === group.key}
                      onToggleColorPicker={() =>
                        setGroupColorKey(
                          groupColorKey === group.key ? null : group.key,
                        )
                      }
                      onClose={() => {
                        setGroupMenuKey(null);
                        setGroupColorKey(null);
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {!collapsedGroups[group.key] && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Column Headers */}
                  <thead>
                    <tr>
                      {/* Group color indicator + checkbox */}
                      <th
                        className="w-[6px] p-0"
                        style={{ backgroundColor: group.color }}
                      />
                      {onMoveItem && <th className="w-[20px] p-0 bg-white border-b border-[#D0D4E4]" />}
                      <th className="w-[36px] px-1 py-2 bg-white border-b border-[#D0D4E4]">
                        <input
                          type="checkbox"
                          aria-label="בחר הכל"
                          className="w-[15px] h-[15px] rounded-[3px] border-[#C3C6D4] accent-[#0073EA]"
                          checked={
                            selectedIds !== undefined &&
                            group.items.length > 0 &&
                            group.items.every((item) =>
                              selectedIds.has(item.id),
                            )
                          }
                          onChange={() => {
                            if (!onSelectionChange || !selectedIds) return;
                            const allGroupIds = group.items.map((i) => i.id);
                            const allSelected = allGroupIds.every((id) =>
                              selectedIds.has(id),
                            );
                            const next = new Set(selectedIds);
                            if (allSelected) {
                              allGroupIds.forEach((id) => next.delete(id));
                            } else {
                              allGroupIds.forEach((id) => next.add(id));
                            }
                            onSelectionChange(next);
                          }}
                          readOnly={!onSelectionChange}
                        />
                      </th>
                      {visibleColumns.map((col, i) => (
                        <th
                          key={col.key}
                          draggable={col.key !== "__add_col"}
                          onDragStart={() => { dragColRef.current = col.key; }}
                          onDragOver={(e) => {
                            if (col.key === "__add_col") return;
                            e.preventDefault();
                            setDragOverCol(col.key);
                          }}
                          onDragLeave={() => setDragOverCol(null)}
                          onDrop={() => {
                            const from = dragColRef.current;
                            const to = col.key;
                            if (!from || from === to || to === "__add_col") {
                              setDragOverCol(null);
                              return;
                            }
                            setColOrder((prev) => {
                              const next = [...prev];
                              const fi = next.indexOf(from);
                              const ti = next.indexOf(to);
                              next.splice(fi, 1);
                              next.splice(ti, 0, from);
                              onColumnReorder?.(next);
                              return next;
                            });
                            dragColRef.current = null;
                            setDragOverCol(null);
                          }}
                          onDragEnd={() => { dragColRef.current = null; setDragOverCol(null); }}
                          className={cn(
                            "px-3 py-2 text-right text-[12px] font-normal text-[#676879] bg-white border-b border-[#D0D4E4] group/col relative select-none",
                            i < visibleColumns.length - 1 &&
                              "border-l border-[#E6E9EF]",
                            i === 0 && "sticky right-[42px] z-10 after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-[#E6E9EF]",
                            col.key === "__add_col" && onAddColumn && "cursor-pointer hover:bg-[#F5F6F8] transition-colors",
                            col.key !== "__add_col" && "cursor-grab",
                            dragOverCol === col.key && "bg-[#EEF4FF] border-r-2 border-r-[#0073EA]",
                          )}
                          style={col.width ? { width: col.width } : undefined}
                          onClick={col.key === "__add_col" && onAddColumn ? onAddColumn : undefined}
                        >
                          {/* Editable column label */}
                          {editingColKey === col.key && onColumnRename ? (
                            <input
                              autoFocus
                              className="w-full text-[12px] font-normal text-[#676879] bg-transparent outline-none border-b border-[#0073EA]"
                              value={editingColLabel}
                              onChange={(e) =>
                                setEditingColLabel(e.target.value)
                              }
                              onBlur={() => {
                                if (
                                  editingColLabel.trim() &&
                                  editingColLabel !== col.label
                                ) {
                                  onColumnRename(
                                    col.key,
                                    editingColLabel.trim(),
                                  );
                                }
                                setEditingColKey(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  (e.target as HTMLInputElement).blur();
                                if (e.key === "Escape") setEditingColKey(null);
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "flex items-center gap-1",
                                  col.sortable &&
                                    "cursor-pointer hover:text-[#323338]",
                                  onColumnRename &&
                                    !col.sortable &&
                                    "cursor-pointer hover:text-[#323338]",
                                )}
                                onClick={() => {
                                  if (col.sortable) toggleSort(col.key);
                                }}
                                onDoubleClick={() => {
                                  if (onColumnRename) {
                                    setEditingColKey(col.key);
                                    setEditingColLabel(col.label);
                                  }
                                }}
                              >
                                {col.label}
                                {/* Sort indicator */}
                                {sortColumn === col.key && (
                                  <span className="text-[#0073EA]">
                                    {sortDirection === "asc" ? (
                                      <ArrowUp size={12} />
                                    ) : (
                                      <ArrowDown size={12} />
                                    )}
                                  </span>
                                )}
                                {col.sortable && sortColumn !== col.key && (
                                  <span className="text-[#C3C6D4] opacity-0 group-hover/col:opacity-100 transition-opacity">
                                    <ArrowUpDown size={11} />
                                  </span>
                                )}
                              </span>
                              {/* Column menu */}
                              {col.key !== "__add_col" && (
                                <div className="relative inline-block">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setColMenuKey(
                                        colMenuKey === col.key ? null : col.key,
                                      );
                                    }}
                                    aria-label={`תפריט עמודה ${col.label}`}
                                    className="p-0.5 rounded hover:bg-[#F5F6F8] opacity-0 group-hover/col:opacity-100 transition-all text-[#9699A6] hover:text-[#323338]"
                                  >
                                    <ChevronDown size={12} />
                                  </button>
                                  {colMenuKey === col.key && (
                                    <ColumnMenu
                                      colKey={col.key}
                                      colLabel={col.label}
                                      isSortable={col.sortable}
                                      isSorted={sortColumn === col.key}
                                      sortDirection={sortDirection}
                                      onSort={
                                        col.sortable
                                          ? () => toggleSort(col.key)
                                          : undefined
                                      }
                                      onFilter={() => {
                                        setFilterOpen(true);
                                        setFilterColKey(col.key);
                                        setColMenuKey(null);
                                      }}
                                      onHide={() => {
                                        setHiddenColumns((prev) => {
                                          const next = new Set(prev);
                                          next.add(col.key);
                                          return next;
                                        });
                                        setColMenuKey(null);
                                      }}
                                      onRename={
                                        onColumnRename
                                          ? () => {
                                              setEditingColKey(col.key);
                                              setEditingColLabel(col.label);
                                              setColMenuKey(null);
                                            }
                                          : undefined
                                      }
                                      onDelete={
                                        onColumnDelete
                                          ? () => {
                                              onColumnDelete(col.key);
                                              setColMenuKey(null);
                                            }
                                          : undefined
                                      }
                                      onClose={() => setColMenuKey(null)}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                      {/* Delete column placeholder */}
                      {onDeleteItem && (
                        <th className="w-[36px] bg-white border-b border-[#D0D4E4]" />
                      )}
                    </tr>
                  </thead>

                  {/* Rows */}
                  <tbody
                    onDragOver={(e) => { if (dragItemId) { e.preventDefault(); setDragOverGroupKey(group.key); } }}
                    onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOverGroupKey(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragItemId && dragOverGroupKey === group.key) {
                        const sourceGroup = groups.find((g) => g.items.some((i) => i.id === dragItemId));
                        if (sourceGroup?.key !== group.key) onMoveItem?.(dragItemId, group.key);
                      }
                      setDragItemId(null);
                      setDragOverGroupKey(null);
                    }}
                    className={cn(dragOverGroupKey === group.key && dragItemId && "bg-[#EEF4FF]")}
                  >
                    {group.items.length === 0 ? (
                      <tr>
                        <td
                          className="w-[6px] p-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <td
                          colSpan={
                            visibleColumns.length + 1 + (onDeleteItem ? 1 : 0) + (onMoveItem ? 1 : 0)
                          }
                          className="px-4 py-8 text-center text-[13px] text-[#676879]"
                        >
                          אין פריטים בקבוצה
                        </td>
                      </tr>
                    ) : (
                      group.items.map((row, rowIdx) => (
                        <tr
                          key={row.id}
                          draggable={!!onMoveItem}
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragItemId(row.id); }}
                          onDragEnd={() => { setDragItemId(null); setDragOverGroupKey(null); }}
                          className={cn(
                            "group/row border-b border-[#E6E9EF] transition-colors hover:bg-[#F5F6F8]",
                            newItemId === row.id && "animate-row-slide-in",
                            dragItemId === row.id && "opacity-40",
                          )}
                          onContextMenu={(e) => {
                            if (contextMenuItems) {
                              e.preventDefault();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                row,
                              });
                            }
                          }}
                        >
                          {/* Group color indicator */}
                          <td
                            className="w-[6px] p-0"
                            style={{ backgroundColor: group.color }}
                          />
                          {/* Drag handle */}
                          {onMoveItem && (
                            <td className="w-[20px] p-0 bg-white group-hover/row:bg-[#F5F6F8]">
                              <span className="flex items-center justify-center text-[#C3C6D4] opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing">
                                <GripVertical size={13} />
                              </span>
                            </td>
                          )}
                          {/* Checkbox */}
                          <td className="w-[36px] px-1 py-0 bg-white group-hover/row:bg-[#F5F6F8]">
                            <input
                              type="checkbox"
                              aria-label="בחר פריט"
                              className={cn(
                                "w-[15px] h-[15px] rounded-[3px] border-[#C3C6D4] accent-[#0073EA] transition-opacity cursor-pointer",
                                selectedIds?.has(row.id)
                                  ? "opacity-100"
                                  : "opacity-0 group-hover/row:opacity-100",
                              )}
                              checked={selectedIds?.has(row.id) ?? false}
                              onChange={() => {
                                if (!onSelectionChange || !selectedIds) return;
                                const next = new Set(selectedIds);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                onSelectionChange(next);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              readOnly={!onSelectionChange}
                            />
                          </td>
                          {/* Data cells */}
                          {visibleColumns.map((col, colIdx) => {
                            const isFocused =
                              focusedCell?.groupIdx === groupIdx &&
                              focusedCell?.rowIdx === rowIdx &&
                              focusedCell?.colIdx === colIdx;
                            return (
                              <td
                                key={col.key}
                                ref={(el) =>
                                  setCellRef(groupIdx, rowIdx, colIdx, el)
                                }
                                className={cn(
                                  "text-[13px] text-[#323338] bg-white group-hover/row:bg-[#F5F6F8] transition-shadow",
                                  col.noPadding ? "p-0 overflow-hidden" : "px-3 py-[7px]",
                                  colIdx < visibleColumns.length - 1 &&
                                    "border-l border-[#E6E9EF]",
                                  isFocused &&
                                    "ring-2 ring-inset ring-[#0073EA] z-10 relative",
                                  colIdx === 0 && "sticky right-[42px] z-[5] after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-[#E6E9EF]",
                                )}
                                style={
                                  col.width ? { width: col.width } : undefined
                                }
                                onClick={() => {
                                  // Set focus on click too
                                  setFocusedCell({ groupIdx, rowIdx, colIdx });
                                }}
                              >
                                {col.render
                                  ? col.render(row)
                                  : (row as any)[col.key]?.toString() || "—"}
                              </td>
                            );
                          })}
                          {/* Delete button */}
                          {onDeleteItem && (
                            <td className="w-[36px] px-1 py-0 bg-white group-hover/row:bg-[#F5F6F8]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteItem(row);
                                }}
                                aria-label="מחק פריט"
                                className="p-1 rounded hover:bg-[#FFEEF0] text-transparent group-hover/row:text-[#C3C6D4] hover:!text-[#FB275D] transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}

                    {/* + Add item row (per-group or global) */}
                    {hasNewItem && (
                      <tr>
                        <td
                          className="w-[6px] p-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <td
                          colSpan={
                            visibleColumns.length + 1 + (onDeleteItem ? 1 : 0) + (onMoveItem ? 1 : 0)
                          }
                          className="p-0"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNewItemInGroup) {
                                onNewItemInGroup(group.key);
                              } else {
                                onNewItem?.();
                              }
                            }}
                            className="w-full text-right px-3 py-[8px] text-[13px] text-[#9699A6] hover:text-[#0073EA] hover:bg-[#E6F4FF]/40 transition-colors flex items-center gap-1.5"
                          >
                            <span className="text-[16px] leading-none font-light">+</span>
                            <span>{newItemLabel}</span>
                          </button>
                        </td>
                      </tr>
                    )}

                    {/* Summary row */}
                    {visibleColumns.some(
                      (c) => c.summary && c.summary !== "none",
                    ) &&
                      group.items.length > 0 && (
                        <tr className="bg-[#F5F6F8] border-t border-[#D0D4E4]">
                          <td
                            className="w-[6px] p-0"
                            style={{
                              backgroundColor: group.color,
                              opacity: 0.5,
                            }}
                          />
                          <td className="w-[36px] px-1 py-1.5" />
                          {visibleColumns.map((col, i) => (
                            <td
                              key={col.key}
                              className={cn(
                                "px-3 py-1.5 text-[11px] font-medium text-[#676879]",
                                i < visibleColumns.length - 1 &&
                                  "border-l border-[#E6E9EF]",
                              )}
                            >
                              <ColumnSummaryCell
                                items={group.items}
                                column={col}
                              />
                            </td>
                          ))}
                          {onDeleteItem && <td className="w-[36px]" />}
                        </tr>
                      )}

                    {/* Group summary footer row */}
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="w-[6px] p-0" />
                      <td
                        colSpan={
                          1 +
                          visibleColumns.length +
                          (onMoveItem ? 1 : 0) +
                          (onDeleteItem ? 1 : 0)
                        }
                        className="px-3 py-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 font-medium">
                            {group.items.length} פריטים
                          </span>
                          {statusKey && statusOptions && group.items.length > 0 && (() => {
                            const counts: Record<string, number> = {};
                            for (const item of group.items) {
                              const val = (item as any)[statusKey] as string;
                              if (val) counts[val] = (counts[val] || 0) + 1;
                            }
                            const pills = Object.entries(counts).map(([key, count]) => ({
                              key,
                              count,
                              label: statusOptions[key]?.label || key,
                              color: statusOptions[key]?.color || "#C4C4C4",
                            }));
                            if (pills.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {pills.map((pill) => (
                                  <span
                                    key={pill.key}
                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      backgroundColor: `${pill.color}1A`,
                                      color: pill.color,
                                    }}
                                  >
                                    {pill.count} {pill.label}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Status distribution bar */}
                <StatusBar
                  items={group.items}
                  color={group.color}
                  statusKey={statusKey}
                  statusOptions={statusOptions}
                />
              </div>
            )}
          </div>
        ))
      )}

      {/* ── Add Group button ──────────────────── */}
      {onAddGroup && !loading && (
        <button
          onClick={onAddGroup}
          className="flex items-center gap-1.5 px-3 py-2 mt-1 text-[13px] text-[#676879] hover:text-[#0073EA] hover:bg-[#F5F6F8] rounded-[4px] transition-colors w-fit"
        >
          <Plus size={15} strokeWidth={2} />
          הוסף קבוצה
        </button>
      )}

      {/* Context Menu */}
      {contextMenu && contextMenuItems && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems(contextMenu.row)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
          <span className="text-[12px] text-[#676879]">
            {pagination.total} תוצאות | עמוד {pagination.page} מתוך{" "}
            {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-[12px] text-[#323338] bg-white border border-[#D0D4E4] rounded hover:bg-[#F5F6F8] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              הקודם
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-[12px] text-[#323338] bg-white border border-[#D0D4E4] rounded hover:bg-[#F5F6F8] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              הבא
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── New Item Split Button ─────────────────────────── */

function NewItemButton({
  label,
  onClick,
  menuItems,
}: {
  label: string;
  onClick: () => void;
  menuItems?: Array<{ label: string; icon?: ReactNode; onClick: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!menuItems || menuItems.length === 0) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 pl-2 pr-3 py-[7px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
      >
        <Plus size={16} strokeWidth={2.5} />
        {label}
      </button>
    );
  }

  return (
    <div className="relative flex" ref={ref}>
      {/* Main action */}
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 pl-2 pr-3 py-[7px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-r-[4px] transition-colors"
      >
        <Plus size={16} strokeWidth={2.5} />
        {label}
      </button>
      {/* Dropdown trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-1.5 py-[7px] bg-[#0073EA] hover:bg-[#0060C2] text-white transition-colors rounded-l-[4px] border-r border-white/25"
        aria-label="עוד אפשרויות"
      >
        <ChevronDown size={13} strokeWidth={2.5} />
      </button>
      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.18)] border border-[#E6E9EF] py-1 min-w-[180px]">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Group Context Menu ────────────────────────────── */

function GroupMenu({
  groupKey,
  groupColor,
  onRename,
  onDelete,
  onColorChange,
  showColorPicker,
  onToggleColorPicker,
  onClose,
}: {
  groupKey: string;
  groupColor: string;
  onRename?: () => void;
  onDelete?: () => void;
  onColorChange?: (groupKey: string, color: string) => void;
  showColorPicker: boolean;
  onToggleColorPicker: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-[#E6E9EF] py-1 min-w-[160px]"
    >
      {onRename && (
        <button
          onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
        >
          <Pencil size={14} className="text-[#676879]" />
          שנה שם
        </button>
      )}
      {onColorChange && (
        <div className="relative">
          <button
            onClick={onToggleColorPicker}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
          >
            <Palette size={14} className="text-[#676879]" />
            שנה צבע
          </button>
          {showColorPicker && (
            <div className="absolute top-0 left-full mr-1 z-[60] bg-white shadow-xl border border-[#E6E9EF] rounded-[4px] p-2 grid grid-cols-5 gap-1.5">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`צבע ${c}`}
                  className={cn(
                    "w-6 h-6 rounded-md transition-transform hover:scale-110",
                    c === groupColor && "ring-2 ring-offset-1 ring-[#323338]",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    onColorChange(groupKey, c);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#FB275D] hover:bg-[#FFEEF0] transition-colors text-right"
        >
          <Trash2 size={14} />
          מחק קבוצה
        </button>
      )}
    </div>
  );
}

/* ── Column Context Menu ───────────────────────────── */

function ColumnMenu({
  colKey,
  colLabel: _colLabel,
  onRename,
  onDelete,
  onSort,
  onFilter,
  onHide,
  isSortable,
  isSorted,
  sortDirection,
  onClose,
}: {
  colKey: string;
  colLabel: string;
  onRename?: () => void;
  onDelete?: () => void;
  onSort?: () => void;
  onFilter?: () => void;
  onHide?: () => void;
  isSortable?: boolean;
  isSorted?: boolean;
  sortDirection?: "asc" | "desc";
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 left-0 z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-[#E6E9EF] py-1 min-w-[160px]"
    >
      {isSortable && onSort && (
        <button
          onClick={() => {
            onSort();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
        >
          {isSorted ? (
            sortDirection === "asc" ? (
              <ArrowDown size={13} className="text-[#0073EA]" />
            ) : (
              <X size={13} className="text-[#676879]" />
            )
          ) : (
            <ArrowUp size={13} className="text-[#676879]" />
          )}
          {isSorted
            ? sortDirection === "asc"
              ? "מיון יורד"
              : "הסר מיון"
            : "מיון עולה"}
        </button>
      )}
      {onFilter && (
        <button
          onClick={() => {
            onFilter();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
        >
          <Filter size={13} className="text-[#676879]" />
          סנן לפי עמודה
        </button>
      )}
      {onHide && (
        <button
          onClick={() => {
            onHide();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
        >
          <EyeOff size={13} className="text-[#676879]" />
          הסתר עמודה
        </button>
      )}
      {(isSortable || onFilter || onHide) && (onRename || onDelete) && (
        <div className="border-t border-[#E6E9EF] my-1" />
      )}
      {onRename && (
        <button
          onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors text-right"
        >
          <Pencil size={13} className="text-[#676879]" />
          שנה שם
        </button>
      )}
      {onDelete && colKey !== "name" && (
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#FB275D] hover:bg-[#FFEEF0] transition-colors text-right"
        >
          <Trash2 size={13} />
          מחק עמודה
        </button>
      )}
    </div>
  );
}

/* ── Keyboard Shortcuts Tooltip ────────────────────── */

function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="קיצורי מקלדת"
        title="קיצורי מקלדת"
        className="flex items-center gap-1 px-2.5 py-[7px] text-[12px] text-[#9699A6] hover:text-[#323338] hover:bg-[#F5F6F8] rounded-[4px] transition-colors select-none"
      >
        <span className="font-mono text-[11px] border border-[#D0D4E4] rounded px-1 py-0.5 bg-white leading-none">?</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-white border border-[#E6E9EF] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] p-4 min-w-[240px]" dir="rtl">
          <p className="text-[12px] font-semibold text-[#323338] mb-3">קיצורי מקלדת</p>
          <div className="space-y-2">
            {([
              ["↑ / ↓", "ניווט בין שורות"],
              ["Enter", "פתח פרטי פריט"],
              ["Escape", "סגור פאנל / בטל בחירה"],
              ["N", "פריט חדש"],
              ["Tab / Shift+Tab", "תא הבא / הקודם"],
            ] as const).map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-[12px] text-[#676879]">{desc}</span>
                <kbd className="font-mono text-[11px] bg-[#F5F6F8] border border-[#D0D4E4] rounded px-1.5 py-0.5 text-[#323338] whitespace-nowrap flex-shrink-0">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Monday-style Status Cell ──────────────────────── */

const LABEL_COLORS = [
  "#00CA72",
  "#FDAB3D",
  "#FB275D",
  "#579BFC",
  "#A25DDC",
  "#6161FF",
  "#FF642E",
  "#66CCFF",
  "#C4C4C4",
  "#333333",
  "#9D99B9",
  "#9AADBD",
  "#D974B0",
  "#4ECCC6",
  "#CAB641",
];

export function MondayStatusCell({
  value,
  options,
  onChange,
  onEditLabels,
}: {
  value: string;
  options: Record<string, StatusOption>;
  onChange?: (value: string) => void;
  onEditLabels?: (updated: Record<string, StatusOption>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editOptions, setEditOptions] = useState<
    Array<{ key: string; label: string; color: string }>
  >([]);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  const prevValueRef = useRef(value);
  const ref = useRef<HTMLDivElement>(null);
  const current = options[value];

  // Trigger flash when value changes
  useEffect(() => {
    if (prevValueRef.current !== value && value) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 550);
      prevValueRef.current = value;
      return () => clearTimeout(t);
    }
    prevValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setColorPickerIdx(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function enterEditMode() {
    setEditOptions(
      Object.entries(options).map(([key, opt]) => ({
        key,
        label: opt.label,
        color: opt.color,
      })),
    );
    setEditing(true);
    setColorPickerIdx(null);
  }

  function saveLabels() {
    if (!onEditLabels) return;
    const updated: Record<string, StatusOption> = {};
    for (const opt of editOptions) {
      if (opt.label.trim()) {
        updated[opt.key] = { label: opt.label.trim(), color: opt.color };
      }
    }
    onEditLabels(updated);
    setEditing(false);
    setOpen(false);
    setColorPickerIdx(null);
  }

  if (!current) return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-full h-full min-h-[36px] flex items-center justify-center bg-[#C4C4C4] text-white text-[11px] font-semibold hover:opacity-85 transition-opacity"
      >
        לא הוגדר
      </button>
      {open && !editing && (
        <div className="absolute top-full left-0 z-50 bg-white rounded-[8px] shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#E6E9EF] py-1.5 min-w-[160px]">
          {Object.entries(options).map(([key, opt]) => (
            <button
              key={key}
              onClick={(e) => { e.stopPropagation(); onChange?.(key); setOpen(false); }}
              className="w-full px-2 py-1 hover:bg-[#F5F6F8] flex items-center gap-2 text-[13px] text-[#323338]"
            >
              <span className="inline-block w-full py-0.5 rounded-[4px] text-white text-[12px] font-semibold text-center" style={{ backgroundColor: opt.color }}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      {/* Full-colored status cell */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onChange) setOpen(!open);
        }}
        className={cn(
          "w-full h-full min-h-[36px] px-2 text-[13px] font-medium text-white text-center transition-opacity select-none flex items-center justify-center",
          onChange && "cursor-pointer hover:opacity-85",
          flashing && "animate-status-flash",
        )}
        style={{ backgroundColor: current.color }}
      >
        {current.label}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 right-1/2 translate-x-1/2 z-50 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-[#E6E9EF] p-3 min-w-[280px] animate-in fade-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {!editing ? (
            <>
              {/* Selection grid */}
              <div className="grid grid-cols-3 gap-[6px]">
                {Object.entries(options).map(([key, opt]) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.(key);
                      setOpen(false);
                    }}
                    className={cn(
                      "py-[7px] px-2 text-[12px] font-medium text-white rounded-[3px] transition-all hover:opacity-85 hover:scale-[1.03] text-center truncate",
                      key === value && "ring-2 ring-offset-1 ring-[#323338]",
                    )}
                    style={{ backgroundColor: opt.color }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-[#E6E9EF] flex items-center justify-center">
                <button
                  onClick={enterEditMode}
                  className="text-[12px] text-[#676879] cursor-pointer hover:text-[#0073EA] transition-colors"
                >
                  ✏️ ערוך תוויות
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Edit mode */}
              <div className="text-[13px] font-semibold text-[#323338] mb-3">
                ערוך תוויות
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {editOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {/* Color button */}
                    <div className="relative">
                      <button
                        aria-label={`שנה צבע תווית ${opt.label || "חדשה"}`}
                        className="w-7 h-7 rounded-md flex-shrink-0 border border-black/10 transition-transform hover:scale-110"
                        style={{ backgroundColor: opt.color }}
                        onClick={() =>
                          setColorPickerIdx(colorPickerIdx === i ? null : i)
                        }
                      />
                      {/* Color picker popover */}
                      {colorPickerIdx === i && (
                        <div className="absolute top-full mt-1 right-0 z-[60] bg-white shadow-xl border border-[#E6E9EF] rounded-[4px] p-2 grid grid-cols-5 gap-1.5 min-w-[150px]">
                          {LABEL_COLORS.map((c) => (
                            <button
                              key={c}
                              aria-label={`צבע ${c}`}
                              className={cn(
                                "w-6 h-6 rounded-md transition-transform hover:scale-110",
                                c === opt.color &&
                                  "ring-2 ring-offset-1 ring-[#323338]",
                              )}
                              style={{ backgroundColor: c }}
                              onClick={() => {
                                const updated = [...editOptions];
                                updated[i] = { ...updated[i], color: c };
                                setEditOptions(updated);
                                setColorPickerIdx(null);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Label input */}
                    <input
                      className="flex-1 px-2 py-1 text-[12px] border border-[#D0D4E4] rounded-md focus:outline-none focus:border-[#0073EA] bg-white"
                      value={opt.label}
                      onChange={(e) => {
                        const updated = [...editOptions];
                        updated[i] = { ...updated[i], label: e.target.value };
                        setEditOptions(updated);
                      }}
                    />
                    {/* Delete */}
                    {editOptions.length > 1 && (
                      <button
                        onClick={() =>
                          setEditOptions(editOptions.filter((_, j) => j !== i))
                        }
                        aria-label={`מחק תווית ${opt.label || "חדשה"}`}
                        className="p-1 text-[#C3C6D4] hover:text-[#FB275D] transition-colors flex-shrink-0"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new option */}
              <button
                onClick={() =>
                  setEditOptions([
                    ...editOptions,
                    {
                      key: `opt_${Date.now()}`,
                      label: "",
                      color:
                        LABEL_COLORS[editOptions.length % LABEL_COLORS.length],
                    },
                  ])
                }
                className="flex items-center gap-1 mt-2 text-[12px] text-[#0073EA] hover:underline"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                הוסף תווית
              </button>

              {/* Save / Cancel */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#E6E9EF]">
                <button
                  onClick={saveLabels}
                  disabled={!onEditLabels}
                  className="flex-1 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] disabled:opacity-40 text-white text-[12px] font-medium rounded-md transition-colors"
                >
                  שמור
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setColorPickerIdx(null);
                  }}
                  className="flex-1 py-1.5 bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#323338] text-[12px] font-medium rounded-md transition-colors"
                >
                  ביטול
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton Loader ────────────────────────────────── */

// Stable widths to avoid hydration mismatch (no Math.random in render)
const SKELETON_WIDTHS = [72, 55, 88, 63, 79, 50, 95, 68, 83, 57, 75, 91];

function BoardSkeleton<T>({ columns }: { columns: MondayColumn<T>[] }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 rounded animate-shimmer" />
        <div className="w-32 h-5 rounded animate-shimmer" />
        <div className="w-16 h-4 rounded animate-shimmer opacity-60" />
      </div>
      <div className="rounded-t overflow-hidden border border-[#E6E9EF]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white">
              <th className="w-[6px] p-0 bg-[#E6E9EF]" />
              <th className="w-[36px] px-1 py-2.5 bg-white border-b border-[#D0D4E4]" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 bg-white border-b border-[#D0D4E4]"
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div className="w-16 h-3 rounded animate-shimmer" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-[#E6E9EF] bg-white">
                <td className="w-[6px] p-0 bg-[#E6E9EF] opacity-40" />
                <td className="w-[36px] px-1 py-2.5">
                  <div className="w-3.5 h-3.5 rounded animate-shimmer" />
                </td>
                {columns.map((col, colIdx) => (
                  <td key={col.key} className="px-3 py-2.5">
                    <div
                      className="h-4 rounded animate-shimmer"
                      style={{ width: `${SKELETON_WIDTHS[(i * columns.length + colIdx) % SKELETON_WIDTHS.length]}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Status distribution bar ────────────────────────── */

function StatusBar<T>({
  items,
  color,
  statusKey,
  statusOptions,
}: {
  items: T[];
  color: string;
  statusKey?: string;
  statusOptions?: Record<string, StatusOption>;
}) {
  if (items.length === 0) return null;

  // If we have status info, show multi-color distribution
  if (statusKey && statusOptions) {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const val = (item as any)[statusKey] as string;
      if (val) counts[val] = (counts[val] || 0) + 1;
    }
    const total = items.length;
    const segments = Object.entries(counts).map(([key, count]) => ({
      key,
      color: statusOptions[key]?.color || "#C4C4C4",
      width: (count / total) * 100,
    }));

    return (
      <div className="flex h-[8px] rounded-b overflow-hidden mt-0">
        {segments.map((seg) => (
          <div
            key={seg.key}
            style={{ backgroundColor: seg.color, width: `${seg.width}%` }}
          />
        ))}
      </div>
    );
  }

  // Fallback: single color bar
  return (
    <div className="flex h-[8px] rounded-b overflow-hidden mt-0">
      <div
        className="flex-1"
        style={{ backgroundColor: color, opacity: 0.6 }}
      />
    </div>
  );
}

/* ── Reusable layout icon ──────────────────────────── */

/* ── Column Summary Cell ───────────────────────────── */

function ColumnSummaryCell<T>({
  items,
  column,
}: {
  items: T[];
  column: MondayColumn<T>;
}) {
  if (!column.summary || column.summary === "none") return null;

  const values = items
    .map((item) =>
      column.summaryValue
        ? column.summaryValue(item)
        : typeof (item as any)[column.key] === "number"
          ? (item as any)[column.key]
          : null,
    )
    .filter((v): v is number => v != null);

  if (values.length === 0) return null;

  let result: string;
  switch (column.summary) {
    case "count":
      result = `${items.length}`;
      break;
    case "sum":
      result = values.reduce((a, b) => a + b, 0).toLocaleString();
      break;
    case "avg":
      result = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      break;
    case "min":
      result = Math.min(...values).toLocaleString();
      break;
    case "max":
      result = Math.max(...values).toLocaleString();
      break;
    default:
      return null;
  }

  const labels: Record<string, string> = {
    count: "סה״כ",
    sum: "סכום",
    avg: "ממוצע",
    min: "מינימום",
    max: "מקסימום",
  };

  return (
    <span className="text-[#676879]">
      <span className="text-[#9699A6]">{labels[column.summary]}: </span>
      {result}
    </span>
  );
}

/* ── Hide Columns Dropdown ──────────────────────────── */

function HideColumnsDropdown<T>({
  columns,
  hiddenColumns,
  onToggle,
  onShowAll,
  onClose,
}: {
  columns: MondayColumn<T>[];
  hiddenColumns: Set<string>;
  onToggle: (colKey: string) => void;
  onShowAll: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const toggleable = columns.filter((c) => c.key !== "__add_col");

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] min-w-[220px]"
    >
      <div className="p-3 border-b border-[#E6E9EF] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#323338]">
          הצג/הסתר עמודות
        </span>
        {hiddenColumns.size > 0 && (
          <button
            onClick={onShowAll}
            className="text-[11px] text-[#0073EA] hover:underline"
          >
            הצג הכל
          </button>
        )}
      </div>
      <div className="max-h-[300px] overflow-y-auto py-1">
        {toggleable.map((col) => (
          <label
            key={col.key}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F5F6F8] cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={!hiddenColumns.has(col.key)}
              onChange={() => onToggle(col.key)}
              className="w-4 h-4 rounded accent-[#0073EA]"
            />
            <span className="text-[13px] text-[#323338]">{col.label}</span>
            {hiddenColumns.has(col.key) && (
              <EyeOff size={12} className="text-[#C3C6D4] mr-auto" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── Group By Dropdown ─────────────────────────────── */

function GroupByDropdown({
  groupByColumns,
  activeGroupBy,
  onSelect,
  onClose,
}: {
  groupByColumns: Array<{ key: string; label: string }>;
  activeGroupBy: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] min-w-[200px]"
    >
      <div className="p-3 border-b border-[#E6E9EF]">
        <span className="text-[13px] font-semibold text-[#323338]">
          קבץ לפי
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto py-1">
        {groupByColumns.map((col) => (
          <button
            key={col.key}
            onClick={() => onSelect(col.key)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 text-[13px] transition-colors text-right",
              activeGroupBy === col.key
                ? "bg-[#E6F4FF] text-[#0073EA] font-medium"
                : "text-[#323338] hover:bg-[#F5F6F8]",
            )}
          >
            <span>{col.label}</span>
            {activeGroupBy === col.key && (
              <span className="text-[#0073EA] text-[11px]">פעיל</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
