import { Search, ChevronRight, ChevronLeft, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
  rowStyle?: (row: T) => React.CSSProperties | undefined;
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
  rowStyle,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Search toolbar */}
      {onSearchChange && (
        <div className="px-4 py-2.5 border-b border-[#E6E9EF] flex items-center gap-3">
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
              className="pr-8 pl-3 py-[6px] text-[13px] border border-[#D0D4E4] rounded-[4px] text-[#323338] placeholder:text-[#C3C6D4] focus:outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]/20 w-[220px] bg-white"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Optional group header */}
            {groupColor && groupLabel && (
              <tr>
                <th
                  colSpan={columns.length}
                  className="px-4 py-2 text-right text-[13px] font-bold"
                  style={{ backgroundColor: groupColor, color: "#fff" }}
                >
                  <span className="flex items-center gap-2">
                    {groupLabel}
                    <span className="text-white/70 text-[11px] font-normal">
                      {data.length} פריטים
                    </span>
                  </span>
                </th>
              </tr>
            )}
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-[9px] text-right text-[12px] font-normal text-[#676879] bg-white border-b border-[#D0D4E4] select-none group/col",
                    i < columns.length - 1 && "border-l border-[#E6E9EF]",
                    col.sortable && "cursor-pointer hover:text-[#323338]",
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
                    {col.sortable && sortBy === col.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp size={12} className="text-[#0073EA]" />
                      ) : (
                        <ArrowDown size={12} className="text-[#0073EA]" />
                      )
                    ) : col.sortable ? (
                      <ArrowUpDown size={11} className="text-[#C3C6D4] opacity-0 group-hover/col:opacity-100 transition-opacity" />
                    ) : null}
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
                  className="px-4 py-12 text-center text-[#676879] text-[13px]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#0073EA] border-t-transparent rounded-full animate-spin" />
                    טוען...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[#676879] text-[13px]"
                >
                  לא נמצאו תוצאות
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "group border-b border-[#E6E9EF] last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[#F5F6F8]",
                  )}
                  style={rowStyle?.(row)}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-[7px] text-[13px] text-[#323338]",
                        i < columns.length - 1 && "border-l border-[#E6E9EF]",
                      )}
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
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E6E9EF]">
          <span className="text-[12px] text-[#676879]">
            {pagination.total} תוצאות | עמוד {pagination.page} מתוך{" "}
            {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-[12px] text-[#323338] bg-white border border-[#D0D4E4] rounded hover:bg-[#F5F6F8] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="עמוד הקודם"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-[12px] text-[#323338] bg-white border border-[#D0D4E4] rounded hover:bg-[#F5F6F8] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="עמוד הבא"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
