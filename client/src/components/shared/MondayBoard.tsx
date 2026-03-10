import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Palette,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";

/* ── Types ──────────────────────────────────────────── */

export interface StatusOption {
  label: string;
  color: string;
}

export interface MondayColumn<T> {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => ReactNode;
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
  /** Row delete */
  onDeleteItem?: (row: T) => void;
}

/* ── Main Board ─────────────────────────────────────── */

export default function MondayBoard<T extends { id: string }>({
  groups,
  columns,
  onRowClick,
  onNewItem,
  onNewItemInGroup,
  newItemLabel = "פריט חדש",
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
  onDeleteItem,
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

  // ── Filter state ──
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Array<{ column: string; values: string[] }>
  >([]);
  const [filterColKey, setFilterColKey] = useState<string | null>(null);

  // Compute unique values per column (for filter picker)
  const columnValues = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const g of groups) {
      for (const item of g.items) {
        for (const col of columns) {
          if (col.key === "__add_col") continue;
          const val = (item as any)[col.key];
          if (val != null && val !== "") {
            if (!map[col.key]) map[col.key] = new Set();
            map[col.key].add(String(val));
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
    <div className="flex flex-col gap-0">
      {/* ── Toolbar ──────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {onNewItem && (
          <button
            onClick={onNewItem}
            className="flex items-center gap-1.5 pl-2 pr-3 py-[7px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            {newItemLabel}
          </button>
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
            <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] min-w-[300px]">
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
                      return (
                        <button
                          key={col.key}
                          onClick={() => setFilterColKey(col.key)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                        >
                          <span>{col.label}</span>
                          <div className="flex items-center gap-2">
                            {active && (
                              <span className="text-[11px] text-[#0073EA] bg-[#E6F4FF] px-1.5 py-0.5 rounded">
                                {active.values.length} נבחרו
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
                    {[...(columnValues[filterColKey] || [])]
                      .sort()
                      .map((val) => {
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
                                className="px-2 py-0.5 text-[12px] font-medium text-white rounded-sm"
                                style={{ backgroundColor: statusOpt.color }}
                              >
                                {statusOpt.label}
                              </span>
                            ) : (
                              <span className="text-[13px] text-[#323338]">
                                {val || "—"}
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          aria-label="אפשרויות נוספות"
          className="p-[7px] text-[#676879] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
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

      {/* ── Groups ───────────────────────────── */}
      {loading ? (
        <BoardSkeleton columns={columns} />
      ) : (
        filteredGroups.map((group) => (
          <div key={group.key} className="mb-6">
            {/* Group Header */}
            <div className="flex items-center gap-1.5 mb-1 select-none group/header">
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
                      <th className="w-[36px] px-1 py-2 bg-white border-b border-[#D0D4E4]">
                        <input
                          type="checkbox"
                          aria-label="בחר הכל"
                          className="w-[15px] h-[15px] rounded-[3px] border-[#C3C6D4] accent-[#0073EA]"
                          readOnly
                        />
                      </th>
                      {columns.map((col, i) => (
                        <th
                          key={col.key}
                          className={cn(
                            "px-3 py-2 text-right text-[12px] font-normal text-[#676879] bg-white border-b border-[#D0D4E4] group/col relative",
                            i < columns.length - 1 &&
                              "border-l border-[#E6E9EF]",
                          )}
                          style={col.width ? { width: col.width } : undefined}
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
                                  onColumnRename &&
                                    "cursor-pointer hover:text-[#323338]",
                                )}
                                onDoubleClick={() => {
                                  if (onColumnRename) {
                                    setEditingColKey(col.key);
                                    setEditingColLabel(col.label);
                                  }
                                }}
                              >
                                {col.label}
                              </span>
                              {/* Column menu */}
                              {(onColumnRename || onColumnDelete) &&
                                col.key !== "__add_col" && (
                                  <div className="relative inline-block">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setColMenuKey(
                                          colMenuKey === col.key
                                            ? null
                                            : col.key,
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
                  <tbody>
                    {group.items.length === 0 ? (
                      <tr>
                        <td
                          className="w-[6px] p-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <td
                          colSpan={columns.length + 1 + (onDeleteItem ? 1 : 0)}
                          className="px-4 py-8 text-center text-[13px] text-[#676879]"
                        >
                          אין פריטים בקבוצה
                        </td>
                      </tr>
                    ) : (
                      group.items.map((row) => (
                        <tr
                          key={row.id}
                          className={cn(
                            "group/row border-b border-[#E6E9EF] transition-colors",
                            onRowClick && "cursor-pointer hover:bg-[#F5F6F8]",
                          )}
                          onClick={() => onRowClick?.(row)}
                        >
                          {/* Group color indicator */}
                          <td
                            className="w-[6px] p-0"
                            style={{ backgroundColor: group.color }}
                          />
                          {/* Checkbox */}
                          <td className="w-[36px] px-1 py-0 bg-white">
                            <input
                              type="checkbox"
                              aria-label="בחר פריט"
                              className="w-[15px] h-[15px] rounded-[3px] border-[#C3C6D4] accent-[#0073EA] opacity-0 group-hover/row:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                              readOnly
                            />
                          </td>
                          {/* Data cells */}
                          {columns.map((col, i) => (
                            <td
                              key={col.key}
                              className={cn(
                                "px-3 py-[7px] text-[13px] text-[#323338] bg-white group-hover/row:bg-[#F5F6F8]",
                                i < columns.length - 1 &&
                                  "border-l border-[#E6E9EF]",
                              )}
                              style={
                                col.width ? { width: col.width } : undefined
                              }
                            >
                              {col.render
                                ? col.render(row)
                                : (row as any)[col.key]?.toString() || "—"}
                            </td>
                          ))}
                          {/* Delete button */}
                          {onDeleteItem && (
                            <td className="w-[36px] px-1 py-0 bg-white group-hover/row:bg-[#F5F6F8]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteItem(row);
                                }}
                                aria-label="מחק פריט"
                                className="p-1 rounded hover:bg-red-50 text-transparent group-hover/row:text-[#C3C6D4] hover:!text-[#FB275D] transition-all"
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
                      <tr className="border-b border-[#E6E9EF]">
                        <td
                          className="w-[6px] p-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <td
                          colSpan={columns.length + 1 + (onDeleteItem ? 1 : 0)}
                          className="px-3 py-[7px]"
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
                            className="text-[13px] text-[#C3C6D4] hover:text-[#0073EA] transition-colors"
                          >
                            + {newItemLabel}
                          </button>
                        </td>
                      </tr>
                    )}
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
      className="absolute top-full mt-1 right-0 z-50 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-[#E6E9EF] py-1 min-w-[160px]"
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
            <div className="absolute top-0 left-full mr-1 z-[60] bg-white shadow-xl border border-[#E6E9EF] rounded-lg p-2 grid grid-cols-5 gap-1.5">
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
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#FB275D] hover:bg-red-50 transition-colors text-right"
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
  colLabel,
  onRename,
  onDelete,
  onClose,
}: {
  colKey: string;
  colLabel: string;
  onRename?: () => void;
  onDelete?: () => void;
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
      className="absolute top-full mt-1 left-0 z-50 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-[#E6E9EF] py-1 min-w-[140px]"
    >
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
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#FB275D] hover:bg-red-50 transition-colors text-right"
        >
          <Trash2 size={13} />
          מחק עמודה
        </button>
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
  const ref = useRef<HTMLDivElement>(null);
  const current = options[value];

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

  if (!current) return <span className="text-[#C3C6D4]">—</span>;

  return (
    <div className="relative" ref={ref}>
      {/* Full-colored status cell */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onChange) setOpen(!open);
        }}
        className={cn(
          "w-full py-[6px] px-2 text-[13px] font-medium text-white text-center rounded-[2px] transition-opacity select-none",
          onChange && "cursor-pointer hover:opacity-85",
        )}
        style={{ backgroundColor: current.color }}
      >
        {current.label}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 right-1/2 translate-x-1/2 z-50 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-[#E6E9EF] p-3 min-w-[280px] animate-in fade-in slide-in-from-top-1 duration-150"
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
                        <div className="absolute top-full mt-1 right-0 z-[60] bg-white shadow-xl border border-[#E6E9EF] rounded-lg p-2 grid grid-cols-5 gap-1.5 min-w-[150px]">
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

function BoardSkeleton<T>({ columns }: { columns: MondayColumn<T>[] }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-4 h-4 bg-[#E6E9EF] rounded animate-pulse" />
        <div className="w-32 h-5 bg-[#E6E9EF] rounded animate-pulse" />
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-[6px] p-0 bg-[#E6E9EF]" />
            <th className="w-[36px] px-1 py-2 bg-white border-b border-[#D0D4E4]" />
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 bg-white border-b border-[#D0D4E4]"
              >
                <div className="w-16 h-3 bg-[#E6E9EF] rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-[#E6E9EF]">
              <td className="w-[6px] p-0 bg-[#E6E9EF]" />
              <td className="w-[36px] px-1 py-2.5" />
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2.5">
                  <div
                    className="h-4 bg-[#F5F6F8] rounded animate-pulse"
                    style={{ width: `${50 + Math.random() * 50}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

function LayoutGridIcon(props: { size: number; className?: string }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
