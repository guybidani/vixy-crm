import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, Pencil, Trash2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { listNotes, createNote, updateNote, deleteNote } from "../../api/notes";
import type { Note } from "../../api/notes";
import { useAuth } from "../../hooks/useAuth";
import { avatarColor, timeAgo } from "../../lib/utils";
import { getInitials } from "../../utils/avatar";

interface ItemUpdatesTabProps {
  entityType: string;
  entityId: string;
}

export default function ItemUpdatesTab({
  entityType,
  entityId,
}: ItemUpdatesTabProps) {
  const { workspaces, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const currentMemberId = workspaces.find(
    (w) => w.id === currentWorkspaceId,
  )?.memberId;

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const queryKey = ["notes", entityType, entityId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listNotes({ entityType, entityId, limit: 100 }),
    enabled: !!entityId,
  });

  const notes = data?.data ?? [];

  // ── Mutations ──

  const createMut = useMutation({
    mutationFn: () =>
      createNote({ entityType, entityId, content: newContent.trim() }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      // Optimistic: add a placeholder note at the top (after pinned)
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const optimistic: Note = {
          id: `temp-${Date.now()}`,
          entityType,
          entityId,
          content: newContent.trim(),
          isPinned: false,
          authorId: currentMemberId ?? "",
          author: { id: currentMemberId ?? "", user: { name: "את/ה" } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...old, data: [optimistic, ...old.data] };
      });
      setNewContent("");
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("שגיאה בשמירת העדכון");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; content?: string; isPinned?: boolean }) =>
      updateNote(vars.id, {
        content: vars.content,
        isPinned: vars.isPinned,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, data: old.data.filter((n: Note) => n.id !== id) };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("שגיאה במחיקה");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // ── Handlers ──

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    createMut.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    updateMut.mutate({ id: editingId, content: editContent.trim() });
  };

  const togglePin = (note: Note) => {
    updateMut.mutate({ id: note.id, isPinned: !note.isPinned });
  };

  // ── Render ──

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Compose Box */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "#E6E9EF" }}
      >
        <div
          className="rounded-lg border bg-white overflow-hidden"
          style={{ borderColor: "#E6E9EF" }}
        >
          <textarea
            className="w-full p-3 text-sm resize-none focus:outline-none"
            style={{ color: "#323338", minHeight: 80 }}
            placeholder="כתוב עדכון..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          <div
            className="flex items-center justify-between px-3 py-2 border-t"
            style={{ borderColor: "#E6E9EF", background: "#F5F6F8" }}
          >
            <span className="text-xs" style={{ color: "#C3C6D4" }}>
              Ctrl+Enter לשליחה
            </span>
            <button
              onClick={handleSubmit}
              disabled={!newContent.trim() || createMut.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "#0073EA" }}
            >
              <Send size={14} />
              שלח
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="text-center py-8">
            <div
              className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#0073EA", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="text-center py-12">
            <div
              className="text-4xl mb-3"
              style={{ color: "#C3C6D4" }}
            >
              💬
            </div>
            <p className="text-sm" style={{ color: "#676879" }}>
              אין עדכונים עדיין. תהיה הראשון לפרסם עדכון!
            </p>
          </div>
        )}

        {notes.map((note) => {
          const isAuthor = currentMemberId && note.author?.id === currentMemberId;
          const authorName = note.author?.user?.name ?? "משתמש";

          if (editingId === note.id) {
            return (
              <div
                key={note.id}
                className="bg-white rounded-lg border p-4"
                style={{ borderColor: "#E6E9EF" }}
              >
                <textarea
                  className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "#E6E9EF",
                    color: "#323338",
                    minHeight: 60,
                  }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-xs rounded border"
                    style={{ borderColor: "#E6E9EF", color: "#676879" }}
                  >
                    ביטול
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editContent.trim() || updateMut.isPending}
                    className="px-3 py-1 text-xs rounded text-white disabled:opacity-50"
                    style={{ background: "#0073EA" }}
                  >
                    שמור
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={note.id}
              className="bg-white rounded-lg border p-4 group transition-shadow hover:shadow-sm"
              style={{
                borderColor: note.isPinned ? "#FDAB3D" : "#E6E9EF",
                borderWidth: note.isPinned ? 2 : 1,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: avatarColor(authorName) }}
                  >
                    {getInitials(authorName)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#323338" }}
                    >
                      {authorName}
                    </span>
                    <span className="text-xs" style={{ color: "#C3C6D4" }}>
                      ·
                    </span>
                    <span className="text-xs" style={{ color: "#C3C6D4" }}>
                      {timeAgo(note.createdAt)}
                    </span>
                    {note.isPinned && (
                      <Pin
                        size={12}
                        style={{ color: "#FDAB3D" }}
                        className="fill-current"
                      />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => togglePin(note)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title={note.isPinned ? "הסר הצמדה" : "הצמד"}
                  >
                    {note.isPinned ? (
                      <PinOff size={14} style={{ color: "#676879" }} />
                    ) : (
                      <Pin size={14} style={{ color: "#676879" }} />
                    )}
                  </button>
                  {isAuthor && (
                    <>
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="עריכה"
                      >
                        <Pencil size={14} style={{ color: "#676879" }} />
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(note.id)}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title="מחיקה"
                      >
                        <Trash2 size={14} style={{ color: "#FB275D" }} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className="text-sm whitespace-pre-wrap leading-relaxed"
                style={{ color: "#323338" }}
              >
                {note.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
