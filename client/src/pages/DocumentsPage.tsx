import { useState, useRef, useEffect } from "react";
import { handleMutationError } from "../lib/utils";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sanitizeHtml } from "../lib/sanitize";
import {
  Plus,
  FileText,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  Upload,
  Trash2,
  Download,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "../hooks/useDebounce";
import Modal from "../components/shared/Modal";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import SidePanel from "../components/shared/SidePanel";
import RichTextEditor from "../components/shared/RichTextEditor";
import {
  getDocuments,
  uploadDocument,
  createRichText,
  updateDocument,
  deleteDocument,
  type Document,
} from "../api/documents";

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File size={20} />;
  if (mimeType.startsWith("image/"))
    return <Image size={20} className="text-[#00CA72]" />;
  if (mimeType.includes("pdf"))
    return <FileText size={20} className="text-[#FB275D]" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet size={20} className="text-[#00CA72]" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation size={20} className="text-[#FDAB3D]" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText size={20} className="text-[#579BFC]" />;
  return <File size={20} className="text-[#9699A6]" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "FILE" | "RICH_TEXT">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState<null | "upload" | "rich-text">(
    null,
  );
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close "new document" dropdown on Escape key
  useEffect(() => {
    if (!showMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMenu]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "documents",
      { search: debouncedSearch, type: typeFilter, page },
    ],
    queryFn: () =>
      getDocuments({
        search: debouncedSearch || undefined,
        type: typeFilter === "ALL" ? undefined : typeFilter,
        page,
      }),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("קובץ הועלה בהצלחה!");
      setShowCreate(null);
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בהעלאת קובץ"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("מסמך נמחק!");
      setSelectedDoc(null);
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה במחיקת מסמך"),
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  }

  const TYPE_FILTERS = [
    { value: "ALL" as const, label: "הכל" },
    { value: "FILE" as const, label: "קבצים" },
    { value: "RICH_TEXT" as const, label: "מסמכי טקסט" },
  ];

  return (
    <PageShell
      boardStyle
      emoji="📄"
      title="מסמכים"
      subtitle={`${data?.total || 0} מסמכים`}
      actions={
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
            מסמך חדש
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-modal border border-[#E6E9EF] py-1 w-48 z-50">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                >
                  <Upload size={15} className="text-[#9699A6]" />
                  העלה קובץ
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowCreate("rich-text");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                >
                  <FileText size={15} className="text-[#9699A6]" />
                  מסמך טקסט חדש
                </button>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp,.svg"
          />
        </div>
      }
    >
      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="חיפוש מסמכים..."
              className="w-full pr-9 pl-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#F5F6F8] rounded-[4px] p-0.5">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setTypeFilter(f.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  typeFilter === f.value
                    ? "bg-white shadow-sm text-[#323338]"
                    : "text-[#676879] hover:text-[#323338]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
              <AlertCircle size={28} className="text-[#E44258]" />
            </div>
            <h2 className="text-base font-bold text-[#323338] mb-1">שגיאה בטעינת מסמכים</h2>
            <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את הנתונים. נסו שוב.</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
            >
              <RefreshCw size={14} />
              נסה שוב
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[#F5F6F8] rounded-xl p-4 animate-pulse h-32"
              />
            ))}
          </div>
        ) : !data?.data.length ? (
          <EmptyState
            icon={<FileText size={28} className="text-[#9699A6]" />}
            title="אין מסמכים"
            description="העלה קובץ או צור מסמך טקסט חדש כדי להתחיל"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.data.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onClick={() => setSelectedDoc(doc)}
                  onDelete={() => setDocToDelete(doc.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-[#E6E9EF]">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-[13px] text-[#676879] hover:bg-[#F5F6F8] rounded-[4px] disabled:opacity-30"
                >
                  הקודם
                </button>
                <span className="text-[13px] text-[#676879]">
                  עמוד {page} מתוך {data.totalPages}
                </span>
                <button
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-[13px] text-[#676879] hover:bg-[#F5F6F8] rounded-[4px] disabled:opacity-30"
                >
                  הבא
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Rich Text Modal */}
      {showCreate === "rich-text" && (
        <CreateRichTextModal onClose={() => setShowCreate(null)} />
      )}

      {/* Document Detail Panel */}
      {selectedDoc && (
        <DocumentDetailPanel
          key={selectedDoc.id}
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={() => setDocToDelete(selectedDoc.id)}
        />
      )}

      <ConfirmDialog
        open={!!docToDelete}
        onConfirm={() => {
          if (docToDelete) deleteMut.mutate(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
        title="מחיקת מסמך"
        message="האם אתה בטוח שברצונך למחוק את המסמך?"
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </PageShell>
  );
}

function DocumentCard({
  doc,
  onClick,
  onDelete,
}: {
  doc: Document;
  onClick: () => void;
  onDelete: () => void;
}) {
  const linkedEntities = doc.links
    .map((l) => {
      if (l.contact)
        return `${l.contact.firstName} ${l.contact.lastName || ""}`.trim();
      if (l.deal) return l.deal.title;
      if (l.company) return l.company.name;
      if (l.ticket) return l.ticket.subject;
      return null;
    })
    .filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="bg-white border border-[#E6E9EF] rounded-xl p-4 hover:border-[#0073EA]/30 hover:shadow-sm transition-all cursor-pointer group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-1"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F5F6F8] flex items-center justify-center flex-shrink-0">
          {doc.type === "RICH_TEXT" ? (
            <FileText size={20} className="text-[#6161FF]" />
          ) : (
            getFileIcon(doc.mimeType)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[13px] text-[#323338] truncate">
            {doc.title}
          </h3>
          <p className="text-[12px] text-[#9699A6] mt-0.5">
            {doc.type === "FILE" ? formatFileSize(doc.fileSize) : "מסמך טקסט"}
            {" · "}
            {new Date(doc.createdAt).toLocaleDateString("he-IL")}
          </p>
          {linkedEntities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {linkedEntities.slice(0, 2).map((name, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 bg-[#0073EA]/8 text-[#0073EA] rounded-full"
                >
                  {name}
                </span>
              ))}
              {linkedEntities.length > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F6F8] text-[#9699A6] rounded-full">
                  +{linkedEntities.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions — also visible on focus-within for keyboard users */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-[4px] hover:bg-red-50 text-[#9699A6] hover:text-red-500 transition-colors"
          title="מחק"
          aria-label={`מחק ${doc.title}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function DocumentDetailPanel({
  doc,
  onClose,
  onDelete,
}: {
  doc: Document;
  onClose: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(doc.content || "");
  const [title, setTitle] = useState(doc.title);

  const updateMut = useMutation({
    mutationFn: () => updateDocument(doc.id, { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("מסמך עודכן!");
      setEditing(false);
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בעדכון"),
  });

  return (
    <SidePanel open={true} title={doc.title} onClose={onClose} width="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#F5F6F8] flex items-center justify-center">
            {doc.type === "RICH_TEXT" ? (
              <FileText size={24} className="text-[#6161FF]" />
            ) : (
              getFileIcon(doc.mimeType)
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2 py-1 border border-[#E6E9EF] rounded-[4px] text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30"
              />
            ) : (
              <h2 className="font-bold text-[#323338]">{doc.title}</h2>
            )}
            <p className="text-[12px] text-[#9699A6] mt-0.5">
              נוצר ב-{new Date(doc.createdAt).toLocaleDateString("he-IL")} ·{" "}
              {doc.createdBy?.user?.name || ""}
            </p>
          </div>
        </div>

        {/* File info or Rich text content */}
        {doc.type === "FILE" ? (
          <div className="bg-[#F5F6F8] rounded-xl p-4 space-y-2">
            <p className="text-[13px] text-[#676879]">
              <span className="font-medium">שם קובץ:</span> {doc.fileName}
            </p>
            <p className="text-[13px] text-[#676879]">
              <span className="font-medium">גודל:</span>{" "}
              {formatFileSize(doc.fileSize)}
            </p>
            <p className="text-[13px] text-[#676879]">
              <span className="font-medium">סוג:</span> {doc.mimeType}
            </p>
            {doc.fileUrl && (
              <a
                href={`/uploads/${doc.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
              >
                <Download size={15} />
                הורדה
              </a>
            )}
          </div>
        ) : (
          <div>
            {editing ? (
              <RichTextEditor value={content} onChange={setContent} />
            ) : (
              <div
                className="prose prose-sm max-w-none text-[#323338] [direction:rtl] border border-[#E6E9EF] rounded-xl p-4"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(doc.content || ""),
                }}
              />
            )}
          </div>
        )}

        {/* Linked entities */}
        {doc.links.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-[#323338] mb-2">
              מקושר אל
            </h3>
            <div className="flex flex-wrap gap-2">
              {doc.links.map((link) => {
                const name = link.contact
                  ? `${link.contact.firstName} ${link.contact.lastName || ""}`.trim()
                  : link.deal
                    ? link.deal.title
                    : link.company
                      ? link.company.name
                      : link.ticket
                        ? link.ticket.subject
                        : "";
                const type = link.contact
                  ? "איש קשר"
                  : link.deal
                    ? "עסקה"
                    : link.company
                      ? "חברה"
                      : "פנייה";
                return (
                  <span
                    key={link.id}
                    className="text-[12px] px-2 py-1 bg-[#F5F6F8] rounded-full text-[#676879]"
                  >
                    {type}: {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E6E9EF]">
          {doc.type === "RICH_TEXT" && (
            <>
              {editing ? (
                <>
                  <button
                    onClick={() => updateMut.mutate()}
                    disabled={updateMut.isPending}
                    className="px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors disabled:opacity-50"
                  >
                    {updateMut.isPending ? "שומר..." : "שמור"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setContent(doc.content || "");
                      setTitle(doc.title);
                    }}
                    className="px-4 py-2 bg-surface-tertiary hover:bg-border text-[#676879] text-[13px] font-semibold rounded-[4px] transition-colors"
                  >
                    ביטול
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
                >
                  עריכה
                </button>
              )}
            </>
          )}
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[13px] font-semibold rounded-[4px] transition-colors mr-auto"
          >
            <Trash2 size={15} className="inline ml-1" />
            מחק
          </button>
        </div>
      </div>
    </SidePanel>
  );
}

function CreateRichTextModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: () => createRichText({ title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("מסמך נוצר בהצלחה!");
      onClose();
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה ביצירת מסמך"),
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="מסמך טקסט חדש"
      maxWidth="max-w-2xl"
      className="max-h-[85vh] overflow-y-auto"
    >
      <div className="space-y-4 p-6">
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            כותרת *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            placeholder="הכנס כותרת למסמך"
            required
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            תוכן
          </label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="התחל לכתוב..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור מסמך"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
