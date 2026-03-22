import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  type Tag,
} from "../../api/tags";

const TAG_COLORS = [
  "#6161FF",
  "#579BFC",
  "#66CCFF",
  "#00CA72",
  "#25D366",
  "#CAB641",
  "#FDAB3D",
  "#FF642E",
  "#FB275D",
  "#A25DDC",
  "#FF7EB3",
  "#C4C4C4",
  "#323338",
  "#676879",
];

export default function TagsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewName("");
      setShowCreate(false);
      toast.success("תגית נוצרה בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת תגית"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; color?: string };
    }) => updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setEditingId(null);
      toast.success("תגית עודכנה");
    },
    onError: () => toast.error("שגיאה בעדכון תגית"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("תגית נמחקה");
    },
    onError: () => toast.error("שגיאה במחיקת תגית"),
  });

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { name: editName.trim(), color: editColor },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">
        טוען...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create new tag */}
      <div className="bg-white rounded-xl shadow-card p-4">
        {showCreate ? (
          <div className="flex items-center gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם התגית..."
              autoFocus
              className="flex-1 text-sm px-3 py-2 border border-border-light rounded-lg outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  createMutation.mutate({
                    name: newName.trim(),
                    color: newColor,
                  });
                }
              }}
            />
            <div className="flex gap-1">
              {TAG_COLORS.slice(0, 7).map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                    newColor === c
                      ? "border-text-primary"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={() =>
                newName.trim() &&
                createMutation.mutate({
                  name: newName.trim(),
                  color: newColor,
                })
              }
              disabled={!newName.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
            >
              צור
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              className="p-2 text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm text-primary font-semibold hover:bg-primary-light px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            צור תגית חדשה
          </button>
        )}
      </div>

      {/* Tags list */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {tags.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary text-sm">
            אין תגיות עדיין. צור תגית חדשה כדי להתחיל.
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {tags.map((tag: Tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-secondary/30 transition-colors group"
              >
                {editingId === tag.id ? (
                  <>
                    {/* Editing mode */}
                    <div className="relative">
                      <button
                        className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: editColor }}
                      />
                    </div>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      className="flex-1 text-sm px-2 py-1 border border-primary rounded outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <div className="flex gap-0.5">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                            editColor === c
                              ? "border-text-primary"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={saveEdit}
                      className="p-1.5 text-primary hover:bg-primary-light rounded transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Display mode */}
                    <span
                      className="w-7 h-7 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-sm font-medium text-text-primary">
                      {tag.name}
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      {tag._count.contacts + tag._count.deals} שימושים
                    </span>
                    <button
                      onClick={() => startEdit(tag)}
                      className="p-1.5 text-text-tertiary hover:text-primary rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="ערוך"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`למחוק את התגית "${tag.name}"?`)) {
                          deleteMutation.mutate(tag.id);
                        }
                      }}
                      className="p-1.5 text-text-tertiary hover:text-danger rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="מחק"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
