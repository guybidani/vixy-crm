import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  search?: string;
  onSearchChange?: (search: string) => void;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortChange?: (key: string) => void;
  loading?: boolean;
  groupColor?: string;
  groupLabel?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  searchPlaceholder = "חיפוש...",
  search,
  onSearchChange,
  pagination,
  onPageChange,
  sortBy,
  sortDir,
  onSortChange,
  loading,
  groupColor,
  groupLabel,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      {/* Search toolbar */}
      {onSearchChange && (
        <div className="px-4 py-3 border-b border-border-light flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pr-9 pl-4 py-2 bg-surface-secondary rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* Optional group header */}
            {groupColor && groupLabel && (
              <tr>
                <th
                  colSpan={columns.length}
                  className="px-4 py-2 text-right text-sm font-bold text-white"
                  style={{ backgroundColor: groupColor }}
                >
                  <span className="flex items-center gap-2">
                    {groupLabel}
                    <span className="text-white/70 text-xs font-normal">
                      {data.length} פריטים
                    </span>
                  </span>
                </th>
              </tr>
            )}
            <tr className="bg-surface-secondary/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-right text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border",
                    col.sortable &&
                      "cursor-pointer hover:text-text-primary hover:bg-surface-secondary",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={
                    col.sortable && onSortChange
                      ? () => onSortChange(col.key)
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortBy === col.key && (
                      <span className="text-primary">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-text-tertiary text-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    טוען...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-text-tertiary text-sm"
                >
                  לא נמצאו תוצאות
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border-light last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[#F5F6FF]",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-2.5 text-sm text-text-primary border-l border-border-light first:border-l-0"
                    >
                      {col.render
                        ? col.render(row)
                        : (row as any)[col.key]?.toString() || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light">
          <span className="text-xs text-text-tertiary">
            {pagination.total} תוצאות | עמוד {pagination.page} מתוך{" "}
            {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="עמוד הקודם"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="עמוד הבא"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
