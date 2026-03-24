import { useState, useEffect, useRef, useCallback } from "react";
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
  Pencil,
  Plus,
  Bell,
  Calendar as CalendarIcon,
  MessageSquare,
  CheckSquare,
  Square,
  Trash2,
  Upload,
  FileText,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getBoard,
  updateBoardItem,
  updateBoardItemValues,
  getBoardItemComments,
  createBoardItemComment,
  getBoardItemSubItems,
  createBoardItemSubItem,
  updateBoardItemSubItem,
  deleteBoardItemSubItem,
  getBoardItemFiles,
  uploadBoardItemFile,
  deleteBoardItemFile,
  type BoardColumn,
  type BoardItemComment,
  type BoardSubItem,
  type BoardItemFile,
} from "../../api/boards";
import { listContacts } from "../../api/contacts";

// ── Types ──────────────────────────────────────────────────────────

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

// ── Sub-component: ToggleSwitch ───────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center flex-shrink-0 h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? "#0073EA" : "#D0D4E4" }}
    >
      <span
        className="inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Sub-component: StatusPill with popover ────────────────────────────

interface StatusOption {
  key: string;
  label: string;
  color: string;
}

function StatusPillField({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: StatusOption[];
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentOpt = options.find((o) => o.key === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 rounded-full text-[12px] font-semibold transition-all hover:opacity-90 active:scale-95"
        style={
          currentOpt
            ? { backgroundColor: currentOpt.color, color: "#fff" }
            : { backgroundColor: "#E6E9EF", color: "#676879" }
        }
      >
        {currentOpt?.label ?? "—"}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-[#E6E9EF] rounded-lg shadow-xl z-30 py-1 min-w-[140px]">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
              className="w-full text-right px-3 py-1.5 hover:bg-[#F5F6F8] transition-colors flex items-center gap-2"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: opt.color }}
              />
              <span className="text-[13px] text-[#323338]">{opt.label}</span>
              {opt.key === value && (
                <span className="mr-auto text-[#0073EA] text-[11px]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
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
  const [nameHovered, setNameHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<"updates" | "files" | "activity">("updates");
  const [newUpdateText, setNewUpdateText] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const updatesEndRef = useRef<HTMLDivElement>(null);

  // Sub-items state
  const [newSubItemName, setNewSubItemName] = useState("");
  const [addingSubItem, setAddingSubItem] = useState(false);
  const subItemInputRef = useRef<HTMLInputElement>(null);

  // Files state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Queries ──

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoard(boardId),
  });

  const item = board?.groups.flatMap((g) => g.items).find((i) => i.id === itemId);
  const itemGroup = board?.groups.find((g) => g.items.some((i) => i.id === itemId));

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["board-item-comments", boardId, itemId],
    queryFn: () => getBoardItemComments(boardId, itemId),
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { limit: 200 }],
    queryFn: () => listContacts({ limit: 200 }),
  });

  const { data: subItems = [] } = useQuery({
    queryKey: ["board-item-subitems", boardId, itemId],
    queryFn: () => getBoardItemSubItems(boardId, itemId),
  });

  const { data: itemFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ["board-item-files", boardId, itemId],
    queryFn: () => getBoardItemFiles(boardId, itemId),
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

  const updateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Effects ──

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editingName) {
        handleClose();
      }
    },
    [editingName], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus updates textarea when panel opens
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTextareaRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (item) {
      setNameValue(item.name);
    }
  }, [item]);

  // ── Animated close ──

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

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

  const createCommentMut = useMutation({
    mutationFn: (body: string) => createBoardItemComment(boardId, itemId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-item-comments", boardId, itemId] });
      setTimeout(() => {
        updatesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    },
    onError: () => {
      toast.error("שגיאה בשמירת העדכון");
    },
  });

  const createSubItemMut = useMutation({
    mutationFn: (name: string) => createBoardItemSubItem(boardId, itemId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-item-subitems", boardId, itemId] });
      setNewSubItemName("");
      setAddingSubItem(false);
    },
    onError: () => toast.error("שגיאה בהוספת תת-פריט"),
  });

  const toggleSubItemMut = useMutation({
    mutationFn: ({ subItemId, done }: { subItemId: string; done: boolean }) =>
      updateBoardItemSubItem(boardId, itemId, subItemId, { done }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-item-subitems", boardId, itemId] });
    },
  });

  const deleteSubItemMut = useMutation({
    mutationFn: (subItemId: string) => deleteBoardItemSubItem(boardId, itemId, subItemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-item-subitems", boardId, itemId] });
    },
    onError: () => toast.error("שגיאה במחיקת תת-פריט"),
  });

  const uploadFileMut = useMutation({
    mutationFn: (file: File) => uploadBoardItemFile(boardId, itemId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-item-files", boardId, itemId] });
      toast.success("הקובץ הועלה בהצלחה");
    },
    onError: (e: any) => toast.error(e?.message || "שגיאה בהעלאת קובץ"),
  });

  const deleteFileMut = useMutation({
    mutationFn: (fileId: string) => deleteBoardItemFile(boardId, itemId, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-item-files", boardId, itemId] });
      toast.success("הקובץ נמחק");
    },
    onError: () => toast.error("שגיאה במחיקת קובץ"),
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
    setNewUpdateText("");
    createCommentMut.mutate(text);
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

  // ── File helpers ──

  function handleFilesDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => uploadFileMut.mutate(f));
  }

  function handleFilesInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => uploadFileMut.mutate(f));
    e.target.value = "";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("zip")) return "🗜️";
    return "📎";
  }

  // ── Field renderers (right panel) ──

  function renderFieldRow(col: BoardColumn) {
    if (col.key === "name") return null;
    const value = getItemValue(col);

    return (
      <div key={col.id} className="flex items-start gap-2 py-2.5 border-b border-[#F0F0F5] last:border-0">
        {/* Label */}
        <div className="w-24 flex-shrink-0 text-[11px] font-medium text-[#9699A6] uppercase tracking-wide pt-1 truncate">
          {col.label}
        </div>

        {/* Value */}
        <div className="flex-1 min-w-0">
          {(col.type === "STATUS" || col.type === "PRIORITY") && (
            <StatusPillField
              value={value}
              options={col.options || []}
              onChange={(key) => saveValue(col, key)}
            />
          )}

          {col.type === "CHECKBOX" && (
            <ToggleSwitch
              checked={!!value}
              onChange={(v) => saveValue(col, v)}
            />
          )}

          {col.type === "DATE" && (
            <input
              type="date"
              className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1 outline-none border border-transparent focus:border-[#0073EA] focus:bg-white transition-colors"
              value={value ? new Date(value).toISOString().split("T")[0] : ""}
              onChange={(e) => saveValue(col, e.target.value)}
            />
          )}

          {col.type === "NUMBER" && (
            <input
              type="number"
              className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1 outline-none border border-transparent focus:border-[#0073EA] focus:bg-white transition-colors"
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
                  className="w-full text-[13px] text-[#323338] bg-[#F5F6F8] rounded-[4px] px-2 py-1 outline-none border border-transparent focus:border-[#0073EA] focus:bg-white transition-colors"
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
                className="w-full text-[13px] text-[#323338] bg-transparent rounded-[4px] px-1 py-0.5 outline-none border border-transparent hover:bg-[#F5F6F8] focus:bg-white focus:border-[#0073EA] transition-colors cursor-pointer focus:cursor-text"
                defaultValue={value ?? ""}
                placeholder="—"
                onBlur={(e) => saveValue(col, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            )}
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl w-full md:max-w-[900px]"
        style={{
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex-shrink-0 border-b border-[#E6E9EF] bg-white">
          {/* Breadcrumb row */}
          <div className="flex items-center justify-between px-6 pt-4 pb-1">
            <div className="flex items-center gap-1.5 text-[12px] text-[#676879]">
              <span className="hover:text-[#323338] cursor-pointer transition-colors font-medium">
                {board?.name || "בורד"}
              </span>
              <ChevronRight size={12} className="opacity-40" />
              <span className="text-[#9699A6]">{itemGroup?.name || "קבוצה"}</span>
            </div>
            <button
              onClick={handleClose}
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
                className="text-[24px] font-semibold text-[#323338] w-full border-b-2 border-[#0073EA] outline-none bg-transparent py-0.5"
              />
            ) : (
              <div
                className="relative inline-flex items-center gap-2 group cursor-text"
                onMouseEnter={() => setNameHovered(true)}
                onMouseLeave={() => setNameHovered(false)}
                onClick={() => {
                  setNameValue(item?.name || "");
                  setEditingName(true);
                }}
              >
                <h2
                  className="text-[24px] font-semibold text-[#323338] leading-tight"
                  title="לחץ לעריכת שם"
                >
                  {isLoading ? "טוען..." : item?.name || "פריט"}
                </h2>
                <Pencil
                  size={14}
                  className="text-[#9699A6] transition-opacity flex-shrink-0"
                  style={{ opacity: nameHovered ? 1 : 0 }}
                />
              </div>
            )}
          </div>

          {/* Monday.com action buttons row */}
          <div className="flex items-center gap-2 px-6 pb-3" dir="rtl">
            <button
              onClick={() => {
                setActiveTab("updates");
                setTimeout(() => updateTextareaRef.current?.focus(), 50);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[6px] transition-colors shadow-sm"
            >
              <MessageSquare size={14} />
              עדכן
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F6F8] text-[#323338] text-[13px] font-medium rounded-[6px] border border-[#D0D4E4] transition-colors">
              <User size={14} className="text-[#676879]" />
              אנשים
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F6F8] text-[#323338] text-[13px] font-medium rounded-[6px] border border-[#D0D4E4] transition-colors">
              <CalendarIcon size={14} className="text-[#676879]" />
              תאריך
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F6F8] text-[#323338] text-[13px] font-medium rounded-[6px] border border-[#D0D4E4] transition-colors">
              <Bell size={14} className="text-[#676879]" />
              תזכורת
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 border-t border-[#E6E9EF]" dir="rtl">
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
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? "border-[#0073EA] text-[#0073EA]"
                    : "border-transparent text-[#676879] hover:text-[#323338] hover:border-[#D0D4E4]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body: 2-column layout ── */}
        <div className="flex-1 flex overflow-hidden min-h-0" dir="rtl">
          {/* LEFT: Updates feed */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "updates" && (
              <>
                {/* Updates list */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {commentsLoading ? (
                    <div className="text-center py-12 text-[#9699A6] text-[13px]">
                      טוען...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-14 h-14 bg-[#EDF3FB] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send size={22} className="text-[#0073EA]" />
                      </div>
                      <p className="text-[15px] font-semibold text-[#323338] mb-1.5">
                        עדיין אין עדכונים
                      </p>
                      <p className="text-[13px] text-[#9699A6]">
                        היה הראשון לכתוב!
                      </p>
                    </div>
                  ) : (
                    comments.map((comment: BoardItemComment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar name={comment.author.user.name} size={34} />
                        <div className="flex-1 min-w-0">
                          <div className="bg-[#F5F6F8] rounded-xl rounded-tr-none px-4 py-3 shadow-sm">
                            <div className="flex items-baseline gap-2 mb-1.5">
                              <span className="text-[13px] font-semibold text-[#323338]">
                                {comment.author.user.name}
                              </span>
                              <span className="text-[11px] text-[#9699A6]">
                                {formatRelativeTime(new Date(comment.createdAt))}
                              </span>
                            </div>
                            <p className="text-[13px] text-[#323338] whitespace-pre-wrap leading-relaxed">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={updatesEndRef} />
                </div>

                {/* Input area */}
                <div className="flex-shrink-0 border-t border-[#E6E9EF] px-5 py-4 bg-white">
                  <div className="flex gap-3 items-start">
                    <Avatar name="אני" size={34} />
                    <div className="flex-1 bg-[#F5F6F8] rounded-xl border border-[#E6E9EF] focus-within:border-[#0073EA] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,115,234,0.12)] transition-all overflow-hidden">
                      <textarea
                        ref={updateTextareaRef}
                        className="w-full px-4 pt-3 pb-1 text-[13px] text-[#323338] bg-transparent outline-none resize-none leading-relaxed"
                        placeholder="כתוב עדכון..."
                        rows={3}
                        value={newUpdateText}
                        onChange={(e) => setNewUpdateText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            postUpdate();
                          }
                          if (e.key === "Escape" && !newUpdateText.trim()) {
                            handleClose();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between px-4 pb-3 pt-1">
                        <span className="text-[11px] text-[#C3C6D4]">
                          Ctrl+Enter לשליחה
                        </span>
                        <button
                          onClick={postUpdate}
                          disabled={!newUpdateText.trim() || createCommentMut.isPending}
                          className="px-5 py-1.5 bg-[#0073EA] text-white text-[13px] font-semibold rounded-[6px] hover:bg-[#0060C2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                          {createCommentMut.isPending ? "שומר..." : "עדכן"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "files" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Drop zone */}
                <div className="flex-shrink-0 px-5 pt-4 pb-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleFilesDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 cursor-pointer transition-all ${
                      isDragOver
                        ? "border-[#0073EA] bg-[#EDF3FB]"
                        : "border-[#D0D4E4] hover:border-[#0073EA] hover:bg-[#F5F8FF]"
                    }`}
                  >
                    <Upload size={20} className={isDragOver ? "text-[#0073EA]" : "text-[#9699A6]"} />
                    <p className="text-[13px] font-medium text-[#676879]">
                      גרור קבצים לכאן או לחץ לבחירה
                    </p>
                    <p className="text-[11px] text-[#C3C6D4]">מקסימום 10MB לקובץ</p>
                    {uploadFileMut.isPending && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
                        <span className="text-[13px] text-[#0073EA] font-medium">מעלה...</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFilesInput}
                  />
                </div>

                {/* Files list */}
                <div className="flex-1 overflow-y-auto px-5 pb-4">
                  {filesLoading ? (
                    <p className="text-center text-[13px] text-[#9699A6] py-8">טוען...</p>
                  ) : itemFiles.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-[14px] font-semibold text-[#323338] mb-1">אין קבצים מצורפים</p>
                      <p className="text-[12px] text-[#9699A6]">העלה קובץ ראשון באמצעות האזור למעלה</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemFiles.map((f: BoardItemFile) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 p-3 bg-white border border-[#E6E9EF] rounded-xl hover:border-[#C3C6D4] transition-colors group"
                        >
                          <span className="text-[20px] flex-shrink-0">{getFileIcon(f.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#323338] truncate">{f.fileName}</p>
                            <p className="text-[11px] text-[#9699A6]">
                              {formatFileSize(f.fileSize)} · {formatRelativeTime(new Date(f.createdAt))}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`/uploads/${f.fileUrl}`}
                              download={f.fileName}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#676879] hover:text-[#0073EA] hover:bg-[#EDF3FB] rounded-lg transition-colors"
                              title="הורד"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download size={14} />
                            </a>
                            <button
                              onClick={() => deleteFileMut.mutate(f.id)}
                              className="p-1.5 text-[#676879] hover:text-[#D83A52] hover:bg-[#FFEEF0] rounded-lg transition-colors"
                              title="מחק"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-1">
                  {item && (
                    <div className="flex items-center gap-3 py-2.5 border-b border-[#F0F0F5]">
                      <div className="w-7 h-7 rounded-full bg-[#EDF3FB] flex items-center justify-center flex-shrink-0">
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
                  {comments.map((comment: BoardItemComment) => (
                    <div key={comment.id} className="flex items-start gap-3 py-2.5 border-b border-[#F0F0F5]">
                      <Avatar name={comment.author.user.name} size={24} />
                      <div>
                        <span className="text-[13px] text-[#323338]">
                          <strong>{comment.author.user.name}</strong> הוסיף עדכון
                        </span>
                        <p className="text-[12px] text-[#676879] mt-0.5 line-clamp-2">
                          {comment.body}
                        </p>
                        <span className="text-[11px] text-[#9699A6]">
                          {formatRelativeTime(new Date(comment.createdAt))}
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
            style={{ width: 288 }}
          >
            <div className="p-5 space-y-5">
              {/* Section: Column values */}
              <div>
                <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest mb-2">
                  פרטי פריט
                </p>
                <div className="bg-white rounded-xl border border-[#E6E9EF] overflow-hidden px-3">
                  {columns.map((col) => renderFieldRow(col))}
                </div>
              </div>

              {/* Section: Linked contact */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <User size={12} className="text-[#0073EA]" />
                  <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest">
                    לקוח מקושר
                  </p>
                </div>

                {linkedContact ? (
                  <div className="bg-white border border-[#E6E9EF] rounded-xl p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={linkedContact.fullName} size={30} />
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
                        className="text-[11px] text-[#9699A6] hover:text-[#D83A52] transition-colors flex-shrink-0 mt-0.5"
                      >
                        הסר
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="חיפוש לקוח..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        onFocus={() => setContactDropdownOpen(true)}
                        className="w-full pl-3 pr-9 py-2 text-[13px] border border-[#D0D4E4] rounded-[8px] focus:outline-none focus:border-[#0073EA] focus:shadow-[0_0_0_3px_rgba(0,115,234,0.12)] transition-all bg-white"
                      />
                      <Plus
                        size={15}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
                      />
                    </div>
                    {contactDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setContactDropdownOpen(false)}
                        />
                        <div className="absolute top-full mt-1.5 right-0 left-0 bg-white border border-[#D0D4E4] rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                          {filteredContacts.length === 0 ? (
                            <p className="text-[12px] text-[#676879] px-3 py-3 text-center">
                              לא נמצאו תוצאות
                            </p>
                          ) : (
                            filteredContacts.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => linkContact(c.id)}
                                className="w-full text-right px-3 py-2 hover:bg-[#F5F6F8] transition-colors flex items-center gap-2"
                              >
                                <Avatar name={c.fullName} size={24} />
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

              {/* Section: Sub-items */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckSquare size={12} className="text-[#0073EA]" />
                  <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest flex-1">
                    תת-פריטים
                  </p>
                  {subItems.length > 0 && (
                    <span className="text-[10px] text-[#9699A6]">
                      {subItems.filter((s: BoardSubItem) => s.done).length}/{subItems.length}
                    </span>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-[#E6E9EF] overflow-hidden">
                  {subItems.length === 0 && !addingSubItem ? (
                    <p className="text-[12px] text-[#9699A6] px-3 py-3 text-center">אין תת-פריטים</p>
                  ) : (
                    <div>
                      {subItems.map((sub: BoardSubItem) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 px-3 py-2.5 border-b border-[#F0F0F5] last:border-0 group"
                        >
                          <button
                            onClick={() => toggleSubItemMut.mutate({ subItemId: sub.id, done: !sub.done })}
                            className="flex-shrink-0 text-[#0073EA] hover:text-[#0060C2] transition-colors"
                          >
                            {sub.done ? <CheckSquare size={15} /> : <Square size={15} className="text-[#C3C6D4]" />}
                          </button>
                          <span
                            className={`flex-1 text-[13px] ${
                              sub.done ? "line-through text-[#9699A6]" : "text-[#323338]"
                            }`}
                          >
                            {sub.name}
                          </span>
                          <button
                            onClick={() => deleteSubItemMut.mutate(sub.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#9699A6] hover:text-[#D83A52] transition-all flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {addingSubItem && (
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-[#F0F0F5]">
                      <Square size={15} className="text-[#C3C6D4] flex-shrink-0" />
                      <input
                        ref={subItemInputRef}
                        autoFocus
                        type="text"
                        value={newSubItemName}
                        onChange={(e) => setNewSubItemName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSubItemName.trim()) {
                            createSubItemMut.mutate(newSubItemName.trim());
                          }
                          if (e.key === "Escape") {
                            setAddingSubItem(false);
                            setNewSubItemName("");
                          }
                        }}
                        onBlur={() => {
                          if (!newSubItemName.trim()) {
                            setAddingSubItem(false);
                          }
                        }}
                        placeholder="שם תת-פריט..."
                        className="flex-1 text-[13px] text-[#323338] outline-none bg-transparent"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setAddingSubItem(true);
                    setTimeout(() => subItemInputRef.current?.focus(), 50);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-[#0073EA] font-medium hover:bg-[#EDF3FB] rounded-lg transition-colors border border-dashed border-[#C3D8F8] hover:border-[#0073EA]"
                >
                  <Plus size={13} />
                  הוסף תת-פריט
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
