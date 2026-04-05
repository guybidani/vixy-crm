import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  listTags,
  createTag,
  assignTag,
  unassignTag,
  type Tag,
} from "../../api/tags";

const TAG_COLORS = [
  "#6161FF",
  "#579BFC",
  "#00CA72",
  "#FDAB3D",
  "#FF642E",
  "#FB275D",
  "#A25DDC",
  "#FF7EB3",
  "#323338",
  "#676879",
];

interface TagSelectorProps {
  entityType: "contact" | "deal";
  entityId: string;
  currentTags: Array<{ id: string; name: string; color: string }>;
  onTagsChange?: () => void;
}

export default function TagSelector({
  entityType,
  entityId,
  currentTags,
  onTagsChange,
}: TagSelectorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
    enabled: open,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setShowCreate(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showCreate) {
          // First Escape closes the create form, second closes the dropdown
          setShowCreate(false);
          setNewTagName("");
        } else {
          setOpen(false);
          setSearch("");
        }
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, showCreate]);

  const currentTagIds = new Set(currentTags.map((t) => t.id));

  const filteredTags = allTags.filter((t: Tag) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    queryClient.invalidateQueries({
      queryKey: [entityType === "contact" ? "contacts" : "deals"],
    });
    queryClient.invalidateQueries({
      queryKey: [entityType === "contact" ? "contact" : "deal", entityId],
    });
    onTagsChange?.();
  };

  const assignMutation = useMutation({
    mutationFn: (tagId: string) => assignTag(tagId, entityType, entityId),
    onSuccess: invalidateAll,
  });

  const unassignMutation = useMutation({
    mutationFn: (tagId: string) => unassignTag(tagId, entityType, entityId),
    onSuccess: invalidateAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => createTag(data),
    onSuccess: async (tag: Tag) => {
      await assignTag(tag.id, entityType, entityId);
      invalidateAll();
      setNewTagName("");
      setShowCreate(false);
      toast.success(`תגית "${tag.name}" נוצרה`);
    },
    onError: () => toast.error("שגיאה ביצירת תגית"),
  });

  function toggleTag(tagId: string) {
    if (currentTagIds.has(tagId)) {
      unassignMutation.mutate(tagId);
    } else {
      assignMutation.mutate(tagId);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 text-[11px] text-[#9699A6] hover:text-[#0073EA] font-medium px-1.5 py-0.5 rounded hover:bg-[#E8F3FF] transition-colors"
      >
        <Plus size={12} />
        תגית
      </button>

      {open && (
        <div className="absolute top-7 right-0 z-30 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] w-56">
          {/* Search */}
          <div className="p-2 border-b border-[#E6E9EF]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש תגיות..."
              autoFocus
              className="w-full text-xs px-2 py-1.5 bg-[#F5F6F8] rounded border-none outline-none placeholder:text-[#9699A6]"
            />
          </div>

          {/* Tags list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredTags.map((tag: Tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F5F6F8]/50 text-right transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs text-[#323338] flex-1 truncate">
                  {tag.name}
                </span>
                {currentTagIds.has(tag.id) && (
                  <Check size={12} className="text-[#0073EA] flex-shrink-0" />
                )}
              </button>
            ))}
            {filteredTags.length === 0 && !showCreate && (
              <p className="text-[11px] text-[#9699A6] text-center py-3">
                לא נמצאו תגיות
              </p>
            )}
          </div>

          {/* Create new */}
          <div className="border-t border-[#E6E9EF] p-2">
            {showCreate ? (
              <div className="space-y-2">
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="שם התגית..."
                  autoFocus
                  className="w-full text-xs px-2 py-1.5 border border-[#E6E9EF] rounded outline-none focus:border-[#0073EA]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagName.trim()) {
                      createMutation.mutate({
                        name: newTagName.trim(),
                        color: newTagColor,
                      });
                    }
                  }}
                />
                <div className="flex gap-1 flex-wrap">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                        newTagColor === c
                          ? "border-[#323338]"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      newTagName.trim() &&
                      createMutation.mutate({
                        name: newTagName.trim(),
                        color: newTagColor,
                      })
                    }
                    disabled={!newTagName.trim() || createMutation.isPending}
                    className="flex-1 text-[11px] font-semibold text-white bg-[#0073EA] hover:bg-[#0060C2] rounded py-1 transition-colors disabled:opacity-50"
                  >
                    צור
                  </button>
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setNewTagName("");
                    }}
                    className="px-2 text-[#9699A6] hover:text-[#323338]"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-1.5 text-[11px] text-[#0073EA] font-medium px-2 py-1 rounded hover:bg-[#E8F3FF] transition-colors"
              >
                <Plus size={12} />
                צור תגית חדשה
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
