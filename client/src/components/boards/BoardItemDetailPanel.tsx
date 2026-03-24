import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  User,
  Link as LinkIcon,
  Mail,
  Phone,
  Send,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getBoard,
  updateBoardItem,
  updateBoardItemValues,
  type BoardColumn,
} from "../../api/boards";
import { listContacts } from "../../api/contacts";

// ── Types ──────────────────────────────────────────────────────────

interface Update {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}

interface BoardItemDetailPanelProps {
  boardId: string;
  itemId: string;
  columns: BoardColumn[];
  onClose: () => void;
  onUpdated: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "עכשיו";
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `לפני ${diffHr} שעות`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Stable colors per user name
const AVATAR_COLORS = [
  "#0073EA", "#FF5AC4", "#FDAB3D", "#00CA72", "#A25DDC",
  "#037F4C", "#E2445C", "#579BFC", "#FF642E", "#CAB641",
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Sub-component: Avatar ─────────────────────────────────────────────

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const bg = avatarColor(name);
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function BoardItemDetailPanel({
  boardId,
  itemId,
  columns,
  onClose,
  onUpdated,
}: BoardItemDetailPanelProps) {
  const qc = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [activeTab, setActiveTab] = useState<"updates" | "files" | "activity">("updates");
  const [newUpdateText, setNewUpdateText] = useState("");
  const [updates, setUpdates] = useState<Update[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const updatesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ──

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoard(boardId),
  });

  const item = board?.groups.flatMap((g) => g.items).find((i) => i.id === itemId);
  const itemGroup = board?.groups.find((g) => g.items.some((i) => i.id === itemId));

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { limit: 200 }],
    queryFn: () => listContacts({ limit: 200 }),
  });

  const contacts = contactsData?.data || [];
  const filteredContacts = contactSearch
    ? contacts.filter(
        (c) =>
          c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.phone?.includes(contactSearch),
      )
    : contacts.slice(0, 20);

  // ── Effects ──

  useEffect(() => {
    if (item) {
      setNameValue(item.name);
      // Load stored updates from a notes/updates column if any
      const updatesCol = columns.find(
        (c) => c.key === "notes" || c.key === "updates" || c.label.includes("הערות"),
      );
      if (updatesCol) {
        const val = item.values.find((v) => v.columnId === updatesCol.id);
        const stored = val?.jsonValue;
        if (Array.isArray(stored)) {
          setUpdates(
            stored.map((u: any) => ({ ...u, createdAt: new Date(u.createdAt) })),
          );
        } else if (val?.textValue) {
          // Migrate plain text to update object
          setUpdates([
            {
              id: "legacy-1",
              text: val.textValue,
              author: "משתמש",
              createdAt: new Date(item.createdAt),
            },
          ]);
        }
      }
    }
  }, [item, columns]);

  // ── Mutations ──

  const updateNameMut = useMutation({
    mutationFn: (name: string) => updateBoardItem(boardId, itemId, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onUpdated();
      toast.success("שם עודכן");
      setEditingName(false);
    },
  });

  const updateValuesMut = useMutation({
    mutationFn: (
      values: Array<{
        columnId: string;
        textValue?: string | null;
        numberValue?: number | null;
        dateValue?: string | null;
        jsonValue?: any;
      }>,
    ) => updateBoardItemValues(boardId, itemId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onUpdated();
    },
  });

  // ── Helpers ──

  function getItemValue(col: BoardColumn): any {
    if (!item) return null;
    const v = item.values.find((val) => val.columnId === col.id);
    if (!v) return null;
    switch (col.type) {
      case "NUMBER":
        return v.numberValue;
      case "DATE":
        return v.dateValue;
      case "CHECKBOX":
        return v.jsonValue;
      default:
        return v.textValue;
    }
  }

  function saveValue(col: BoardColumn, value: any) {
    const payload: {
      columnId: string;
      textValue?: string | null;
      numberValue?: number | null;
      dateValue?: string | null;
      jsonValue?: any;
    } = { columnId: col.id };

    switch (col.type) {
      case "NUMBER":
        payload.numberValue = value === "" || value == null ? null : Number(value);
        break;
      case "DATE":
        payload.dateValue = value || null;
        break;
      case "CHECKBOX":
        payload.jsonValue = value;
        break;
      default:
        payload.textValue = value || null;
    }
    updateValuesMut.mutate([payload]);
  }

  function postUpdate() {
    const text = newUpdateText.trim();
    if (!text) return;

    const newUpdate: Update = {
      id: `upd-${Date.now()}`,
      text,
      author: "אני",
      createdAt: new Date(),
    };

    const nextUpdates = [...updates, newUpdate];
    setUpdates(nextUpdates);
    setNewUpdateText("");

    // Persist to the notes/updates column as JSON
    const updatesCol = columns.find(
      (c) => c.key === "notes" || c.key === "updates" || c.label.includes("הערות"),
    );
    if (updatesCol) {
      updateValuesMut.mutate([
        {
          columnId: updatesCol.id,
          jsonValue: nextUpdates.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          })),
          textValue: null,
        },
      ]);
    }

    // Scroll to bottom
    setTimeout(() => {
      updatesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function linkContact(contactId: string) {
    const col = columns.find((c) => c.key === "contact_id" || c.key === "contactId");
    if (col) {
      updateValuesMut.mutate([{ columnId: col.id, textValue: contactId }]);
    }
    setContactDropdownOpen(false);
    setContactSearch("");
  }

  const linkedContactId = (() => {
    const col = columns.find((c) => c.key === "contact_id" || c.key === "contactId");
    if (!col || !item) return null;
    const v = item.values.find((val) => val.columnId === col.id);
    return v?.textValue || null;
  })();

  const linkedContact = linkedContactId
    ? contacts.find((c) => c.id === linkedContactId)
    : null;

  // ── Field renderers (right panel) ──

  function renderFieldRow(col: BoardColumn) {
    if (col.key === "name") return null;
    const value = getItemValue(col);

    return (
      <div key={col.id} className="mb-1">
        <div className="text-[11px] font-medium text-[#9699A6] uppercase tracking-wide mb-1">
          {col.label}
        </div>

        {(col.type === "STATUS" || col.type === "PRIORITY") && (() => {
          const opts = col.options || [];
          const currentOpt = opts.find((o) => o.key === value);
          return (
            <div className="flex flex-wrap gap-1">
              {opts.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => saveValue(col, opt.key)}
                  className="px-2.5 py-0.5 rounded-full text-[12px] font-medium transition-all"
                  style={{
                    backgroundColor: value === opt.key ? opt.color : `${opt.color}20`,
                    color: value === opt.key ? "#fff" : opt.color,
                    border: `1px solid ${opt.color}55`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
              {!currentOpt && value && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[12px]"
                  style={{ backgroundColor: "#E6E9EF", color: "#676879" }}
                >
                  {value}
                </span>
              )}
            </div>
          );
        })()}

        {col.type === "CHECKBOX" && (
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-[#0073EA]"
            checked={!!value}
            onChange={(e) => saveValue(col, e.target.checked)}
          />
        )}

        {col.type === "DATE" && (
          <input
            type="date"
            className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1.5 outline-none border border-transparent focus:border-[#0073EA] transition-colors"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => saveValue(col, e.target.value)}
          />
        )}

        {col.type === "NUMBER" && (
          <input
            type="number"
            className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1.5 outline-none border border-transparent focus:border-[#0073EA] transition-colors"
            defaultValue={value ?? ""}
            onBlur={(e) => saveValue(col, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        )}

        {col.type === "LINK" && (
          <div className="flex items-center gap-1.5">
            {value ? (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-[#0073EA] hover:underline flex items-center gap-1 truncate"
              >
                <ExternalLink size={11} />
                {value}
              </a>
            ) : (
              <input
                type="url"
                className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1.5 outline-none border border-transparent focus:border-[#0073EA] transition-colors"
                defaultValue=""
                placeholder="https://..."
                onBlur={(e) => saveValue(col, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            )}
          </div>
        )}

        {col.type !== "STATUS" &&
          col.type !== "PRIORITY" &&
          col.type !== "CHECKBOX" &&
          col.type !== "DATE" &&
          col.type !== "NUMBER" &&
          col.type !== "LINK" && (
            <input
              type={
                col.type === "EMAIL"
                  ? "email"
                  : col.type === "PHONE"
                  ? "tel"
                  : "text"
              }
              className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1.5 outline-none border border-transparent focus:border-[#0073EA] transition-colors"
              defaultValue={value ?? ""}
              placeholder="—"
              onBlur={(e) => saveValue(col, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          )}
      </div>
    );
  }

  // ── Render ──

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200"
        style={{ width: "min(900px, 90vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex-shrink-0 border-b border-[#E6E9EF] bg-white">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between px-6 pt-4 pb-1">
            <div className="flex items-center gap-1.5 text-[12px] text-[#676879]">
              <span className="hover:text-[#323338] cursor-pointer transition-colors">
                {board?.name || "בורד"}
              </span>
              <ChevronRight size={12} className="opacity-50" />
              <span className="text-[#9699A6]">{itemGroup?.name || "קבוצה"}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>

          {/* Item name */}
          <div className="px-6 pb-2">
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => {
                  if (nameValue.trim() && nameValue !== item?.name) {
                    updateNameMut.mutate(nameValue.trim());
                  } else {
                    setEditingName(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setNameValue(item?.name || "");
                    setEditingName(false);
                  }
                }}
                className="text-[22px] font-bold text-[#323338] w-full border-b-2 border-[#0073EA] outline-none bg-transparent py-0.5"
              />
            ) : (
              <h2
                className="text-[22px] font-bold text-[#323338] cursor-text hover:text-[#0073EA] transition-colors leading-tight"
                onClick={() => {
                  setNameValue(item?.name || "");
                  setEditingName(true);
                }}
                title="לחץ לעריכת שם"
              >
                {isLoading ? "טוען..." : item?.name || "פריט"}
              </h2>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6">
            {(
              [
                { key: "updates", label: "עדכונים" },
                { key: "files", label: "קבצים" },
                { key: "activity", label: "פעילות" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#0073EA] text-[#0073EA]"
                    : "border-transparent text-[#676879] hover:text-[#323338]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body: 2-column layout ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT: Updates feed */}
          <div className="flex-1 flex flex-col overflow-hidden border-l border-[#E6E9EF]" dir="rtl">
            {activeTab === "updates" && (
              <>
                {/* Updates list */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {isLoading ? (
                    <div className="text-center py-12 text-[#9699A6] text-[13px]">
                      טוען...
                    </div>
                  ) : updates.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-12 h-12 bg-[#F5F6F8] rounded-full flex items-center justify-center mx-auto mb-3">
                        <Send size={20} className="text-[#9699A6]" />
                      </div>
                      <p className="text-[14px] font-medium text-[#323338] mb-1">
                        אין עדכונים עדיין
                      </p>
                      <p className="text-[12px] text-[#9699A6]">
                        כתוב עדכון ראשון בתיבה למטה
                      </p>
                    </div>
                  ) : (
                    updates.map((upd) => (
                      <div key={upd.id} className="flex gap-3">
                        <Avatar name={upd.author} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="bg-[#F5F6F8] rounded-lg rounded-tr-none px-4 py-3">
                            <div className="flex items-baseline gap-2 mb-1.5">
                              <span className="text-[13px] font-semibold text-[#323338]">
                                {upd.author}
                              </span>
                              <span className="text-[11px] text-[#9699A6]">
                                {formatRelativeTime(upd.createdAt)}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#323338] whitespace-pre-wrap leading-relaxed">
                              {upd.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={updatesEndRef} />
                </div>

                {/* Input area */}
                <div className="flex-shrink-0 border-t border-[#E6E9EF] p-4 bg-white">
                  <div className="flex gap-3 items-start">
                    <Avatar name="אני" size={32} />
                    <div className="flex-1 bg-[#F5F6F8] rounded-lg border border-[#E6E9EF] focus-within:border-[#0073EA] focus-within:bg-white transition-all overflow-hidden">
                      <textarea
                        className="w-full px-3 pt-2.5 pb-1 text-[13px] text-[#323338] bg-transparent outline-none resize-none leading-relaxed"
                        placeholder="כתוב עדכון..."
                        rows={3}
                        value={newUpdateText}
                        onChange={(e) => setNewUpdateText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            postUpdate();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between px-3 pb-2">
                        <span className="text-[11px] text-[#9699A6]">
                          Ctrl+Enter לשליחה
                        </span>
                        <button
                          onClick={postUpdate}
                          disabled={!newUpdateText.trim()}
                          className="px-4 py-1.5 bg-[#0073EA] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#0060C2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          עדכן
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "files" && (
              <div className="flex-1 flex flex-col items-center justify-center text-[#9699A6]">
                <div className="w-12 h-12 bg-[#F5F6F8] rounded-full flex items-center justify-center mb-3">
                  <LinkIcon size={20} />
                </div>
                <p className="text-[14px] font-medium text-[#323338]">אין קבצים מצורפים</p>
                <p className="text-[12px] mt-1">גרור קובץ לכאן כדי לצרף</p>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="flex-1 overflow-y-auto p-5" dir="rtl">
                <div className="space-y-2">
                  {item && (
                    <div className="flex items-center gap-3 py-2 border-b border-[#F0F0F5]">
                      <div className="w-6 h-6 rounded-full bg-[#0073EA20] flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-[#0073EA]" />
                      </div>
                      <div>
                        <span className="text-[13px] text-[#323338]">פריט נוצר</span>
                        <span className="text-[11px] text-[#9699A6] mr-2">
                          {formatRelativeTime(new Date(item.createdAt))}
                        </span>
                      </div>
                    </div>
                  )}
                  {updates.map((upd) => (
                    <div key={upd.id} className="flex items-start gap-3 py-2 border-b border-[#F0F0F5]">
                      <Avatar name={upd.author} size={22} />
                      <div>
                        <span className="text-[13px] text-[#323338]">
                          <strong>{upd.author}</strong> הוסיף עדכון
                        </span>
                        <p className="text-[12px] text-[#676879] mt-0.5 line-clamp-2">
                          {upd.text}
                        </p>
                        <span className="text-[11px] text-[#9699A6]">
                          {formatRelativeTime(upd.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Column fields sidebar */}
          <div
            className="flex-shrink-0 overflow-y-auto bg-[#FAFBFC] border-r border-[#E6E9EF]"
            style={{ width: 280 }}
            dir="rtl"
          >
            <div className="p-4 space-y-4">
              {/* Section: Column values */}
              <div>
                <p className="text-[11px] font-semibold text-[#9699A6] uppercase tracking-widest mb-3">
                  פרטי פריט
                </p>
                <div className="space-y-3">
                  {columns.map((col) => renderFieldRow(col))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E6E9EF]" />

              {/* Section: Linked contact */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <User size={13} className="text-[#0073EA]" />
                  <p className="text-[11px] font-semibold text-[#9699A6] uppercase tracking-widest">
                    לקוח מקושר
                  </p>
                </div>

                {linkedContact ? (
                  <div className="bg-white border border-[#E6E9EF] rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={linkedContact.fullName} size={28} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#323338] truncate">
                            {linkedContact.fullName}
                          </p>
                          {linkedContact.email && (
                            <p className="text-[11px] text-[#676879] flex items-center gap-1 truncate">
                              <Mail size={10} />
                              {linkedContact.email}
                            </p>
                          )}
                          {linkedContact.phone && (
                            <p className="text-[11px] text-[#676879] flex items-center gap-1">
                              <Phone size={10} />
                              {linkedContact.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const col = columns.find(
                            (c) => c.key === "contact_id" || c.key === "contactId",
                          );
                          if (col) {
                            updateValuesMut.mutate([{ columnId: col.id, textValue: null }]);
                          }
                        }}
                        className="text-[11px] text-[#9699A6] hover:text-[#D83A52] transition-colors flex-shrink-0"
                      >
                        הסר
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="חיפוש לקוח..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      onFocus={() => setContactDropdownOpen(true)}
                      className="w-full px-3 py-2 text-[13px] border border-[#D0D4E4] rounded-[4px] focus:outline-none focus:border-[#0073EA] transition-colors bg-white"
                    />
                    {contactDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setContactDropdownOpen(false)}
                        />
                        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-[#D0D4E4] rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                          {filteredContacts.length === 0 ? (
                            <p className="text-[12px] text-[#676879] px-3 py-2">
                              לא נמצאו תוצאות
                            </p>
                          ) : (
                            filteredContacts.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => linkContact(c.id)}
                                className="w-full text-right px-3 py-2 hover:bg-[#F5F6F8] transition-colors flex items-center gap-2"
                              >
                                <Avatar name={c.fullName} size={22} />
                                <div className="text-right">
                                  <p className="text-[13px] text-[#323338]">{c.fullName}</p>
                                  {c.email && (
                                    <p className="text-[11px] text-[#9699A6]">{c.email}</p>
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
