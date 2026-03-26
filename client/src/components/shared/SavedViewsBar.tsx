import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  listViews,
  createView,
  deleteView,
  type SavedView,
} from "../../api/views";
import SaveViewDialog from "./SaveViewDialog";

interface SavedViewsBarProps {
  entity: string;
  activeViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  currentFilters: Record<string, unknown>;
  hasActiveFilters: boolean;
}

export default function SavedViewsBar({
  entity,
  activeViewId,
  onSelectView,
  currentFilters,
  hasActiveFilters,
}: SavedViewsBarProps) {
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: (data: { name: string; isDefault: boolean }) =>
      createView({
        entity,
        name: data.name,
        filters: currentFilters,
        isDefault: data.isDefault,
      }),
    onSuccess: (newView) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("תצוגה נשמרה");
      setShowSaveDialog(false);
      onSelectView(newView);
    },
    onError: () => toast.error("שגיאה בשמירת תצוגה"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", entity] });
      toast.success("תצוגה נמחקה");
      if (contextMenu && contextMenu.viewId === activeViewId) {
        onSelectView(null);
      }
      setContextMenu(null);
    },
    onError: () => toast.error("שגיאה במחיקת תצוגה"),
  });

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  function handleContextMenu(e: React.MouseEvent, viewId: string) {
    e.preventDefault();
    setContextMenu({ viewId, x: e.clientX, y: e.clientY });
  }

  // Find default view on mount
  useEffect(() => {
    if (views.length > 0 && activeViewId === null) {
      const defaultView = views.find((v) => v.isDefault);
      if (defaultView) {
        onSelectView(defaultView);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views]);

  return (
    <>
      <div className="flex items-center gap-0 mb-3 border-b border-[#E6E9EF] -mx-0" dir="rtl">
        {/* "All" tab */}
        <button
          onClick={() => onSelectView(null)}
          className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-[2px] -mb-px whitespace-nowrap ${
            activeViewId === null
              ? "text-[#0073EA] border-[#0073EA]"
              : "text-[#676879] border-transparent hover:text-[#323338] hover:bg-[#F5F6F8]"
          }`}
        >
          הכל
        </button>

        {/* Saved view tabs */}
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onSelectView(view)}
            onContextMenu={(e) => handleContextMenu(e, view.id)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-[2px] -mb-px whitespace-nowrap flex items-center gap-1.5 ${
              activeViewId === view.id
                ? "text-[#0073EA] border-[#0073EA]"
                : "text-[#676879] border-transparent hover:text-[#323338] hover:bg-[#F5F6F8]"
            }`}
          >
            {view.isDefault && (
              <Star
                size={11}
                className={
                  activeViewId === view.id
                    ? "fill-[#0073EA] text-[#0073EA]"
                    : "fill-[#FDAB3D] text-[#FDAB3D]"
                }
              />
            )}
            {view.name}
          </button>
        ))}

        {/* Add view button */}
        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-2 text-[13px] text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] transition-colors flex items-center gap-1 border-b-[2px] border-transparent -mb-px"
          >
            <Plus size={13} />
            שמור כתצוגה
          </button>
        )}

        {/* "+" button when no active filters */}
        {!hasActiveFilters && views.length > 0 && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-2 text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] flex items-center justify-center transition-colors border-b-[2px] border-transparent -mb-px"
            title="שמור תצוגה חדשה"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 bg-white rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#E6E9EF] py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => deleteMutation.mutate(contextMenu.viewId)}
            className="w-full px-3 py-2 text-[13px] text-right flex items-center gap-2 hover:bg-[#FFEEF0] text-[#E44258] transition-colors"
          >
            <Trash2 size={14} />
            מחק תצוגה
          </button>
        </div>
      )}

      {/* Save dialog */}
      <SaveViewDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={(name, isDefault) =>
          createMutation.mutate({ name, isDefault })
        }
        saving={createMutation.isPending}
      />
    </>
  );
}
