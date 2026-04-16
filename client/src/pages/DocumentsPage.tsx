import { useState, useRef, useEffect, useMemo } from "react";
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
  AlertCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { useDebounce } from "../hooks/useDebounce";
import Modal from "../components/shared/Modal";
import PageShell from "../components/layout/PageShell";
import SidePanel from "../components/shared/SidePanel";
import RichTextEditor from "../components/shared/RichTextEditor";
import MondayBoard, {
  type MondayGroup,
  type MondayColumn,
} from "../components/shared/MondayBoard";
import MondayTextCell from "../components/shared/MondayTextCell";
import BulkActionBar from "../components/shared/BulkActionBar";
import { type ContextMenuItem } from "../components/shared/RowContextMenu";
import {
  getDocuments,
  uploadDocument,
  createRichText,
  updateDocument,
  deleteDocument,
  type Document,
} from "../api/documents";

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File size={16} />;
  if (mimeType.startsWith("image/"))
    return <Image size={16} className="text-[#00CA72]" />;
  if (mimeType.includes("pdf"))
    return <FileText size={16} className="text-[#FB275D]" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet size={16} className="text-[#00CA72]" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation size={16} className="text-[#FDAB3D]" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText size={16} className="text-[#579BFC]" />;
  return <File size={16} className="text-[#9699A6]" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState<null | "upload" | "rich-text">(
    null,
  );
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<{
    ids: string[];
    message: string;
  } | null>(null);
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
    queryKey: ["documents", { search: debouncedSearch, page }],
    queryFn: () =>
      getDocuments({
        search: debouncedSearch || undefined,
        page,
        limit: 50,
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

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteDocument(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("מסמכים נמחקו!");
      setSelectedIds(new Set());
    },
    onError: (err: unknown) =>
      handleMutationError(err, "שגיאה במחיקת מסמכים"),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateDocument(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בשינוי שם"),
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  }

  // Group documents by type
  const allDocs = data?.data || [];

  const mondayGroups: MondayGroup<Document>[] = useMemo(() => {
    const files = allDocs.filter((d) => d.type === "FILE");
    const richTexts = allDocs.filter((d) => d.type === "RICH_TEXT");
    const groups: MondayGroup<Document>[] = [];
    if (files.length > 0 || richTexts.length === 0) {
      groups.push({
        key: "files",
        label: "קבצים",
        color: "#579BFC",
        items: files,
      });
    }
    if (richTexts.length > 0 || files.length === 0) {
      groups.push({
        key: "rich-text",
        label: "מסמכי טקסט",
        color: "#6161FF",
        items: richTexts,
      });
    }
    return groups;
  }, [allDocs]);

  const mondayColumns: MondayColumn<Document>[] = useMemo(
    () => [
      {
        key: "title",
        label: "שם מסמך",
        sortable: true,
        sortValue: (row: Document) => row.title.toLowerCase(),
        render: (row: Document) => (
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0">
              {row.type === "RICH_TEXT" ? (
                <FileText size={16} className="text-[#6161FF]" />
              ) : (
                getFileIcon(row.mimeType)
              )}
            </span>
            <MondayTextCell
              value={row.title}
              onChange={(val) => renameMut.mutate({ id: row.id, title: val })}
            />
          </div>
        ),
      },
      {
        key: "type",
        label: "סוג",
        width: "120px",
        sortable: true,
        sortValue: (row: Document) => row.type,
        render: (row: Document) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              row.type === "FILE"
                ? "bg-[#579BFC]/10 text-[#579BFC]"
                : "bg-[#6161FF]/10 text-[#6161FF]"
            }`}
          >
            {row.type === "FILE" ? "קובץ" : "טקסט"}
          </span>
        ),
      },
      {
        key: "size",
        label: "גודל",
        width: "100px",
        sortable: true,
        sortValue: (row: Document) => row.fileSize ?? 0,
        render: (row: Document) => (
          <span className="text-[13px] text-[#676879]">
            {row.type === "FILE" ? formatFileSize(row.fileSize) : "—"}
          </span>
        ),
      },
      {
        key: "author",
        label: "יוצר",
        width: "140px",
        render: (row: Document) => (
          <span className="text-[13px] text-[#676879]">
            {row.createdBy?.user?.name || "—"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "נוצר",
        width: "120px",
        sortable: true,
        sortValue: (row: Document) => new Date(row.createdAt).getTime(),
        render: (row: Document) => (
          <span className="text-[13px] text-[#676879]">
            {new Date(row.createdAt).toLocaleDateString("he-IL", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ),
      },
      {
        key: "updatedAt",
        label: "עודכן",
        width: "120px",
        sortable: true,
        sortValue: (row: Document) => new Date(row.updatedAt).getTime(),
        render: (row: Document) => (
          <span className="text-[13px] text-[#676879]">
            {new Date(row.updatedAt).toLocaleDateString("he-IL", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        width: "80px",
        render: (row: Document) => (
          <div className="flex items-center gap-1">
            {row.type === "FILE" && row.fileUrl && (
              <a
                href={`/uploads/${row.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] text-[#9699A6] hover:text-[#579BFC] transition-colors"
                title="הורדה"
                aria-label={`הורד ${row.title}`}
              >
                <Download size={14} />
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDocToDelete(row.id);
              }}
              className="p-1.5 rounded-[4px] hover:bg-red-50 text-[#9699A6] hover:text-red-500 transition-colors"
              title="מחק"
              aria-label={`מחק ${row.title}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const contextMenuItems = (row: Document): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        label: "פתח / תצוגה מקדימה",
        icon: <Eye size={14} />,
        onClick: () => setSelectedDoc(row),
      },
    ];
    if (row.type === "FILE" && row.fileUrl) {
      items.push({
        label: "הורדה",
        icon: <Download size={14} />,
        onClick: () => {
          window.open(`/uploads/${row.fileUrl}`, "_blank");
        },
      });
    }
    items.push(
      { label: "", onClick: () => {}, divider: true },
      {
        label: "מחק",
        onClick: () => setDocToDelete(row.id),
        danger: true,
      },
    );
    return items;
  };

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
            aria-haspopup="true"
            aria-expanded={showMenu}
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
              <div
                className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-modal border border-[#E6E9EF] py-1 w-48 z-50"
                role="menu"
                aria-label="יצירת מסמך חדש"
              >
                <button
                  role="menuitem"
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
                  role="menuitem"
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
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp"
          />
        </div>
      }
    >
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-[#E44258]" />
          </div>
          <h2 className="text-base font-bold text-[#323338] mb-1">
            שגיאה בטעינת מסמכים
          </h2>
          <p className="text-[13px] text-[#676879] mb-4">
            לא הצלחנו לטעון את הנתונים. נסו שוב.
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
          >
            <RefreshCw size={14} />
            נסה שוב
          </button>
        </div>
      ) : (
        <MondayBoard<Document>
          groups={mondayGroups}
          columns={mondayColumns}
          onRowClick={(row) => setSelectedDoc(row)}
          search={search}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          searchPlaceholder="חיפוש מסמכים..."
          loading={isLoading}
          pagination={
            data
              ? {
                  page: data.page,
                  totalPages: data.totalPages,
                  total: data.total,
                }
              : undefined
          }
          onPageChange={setPage}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          contextMenuItems={contextMenuItems}
        />
      )}

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

      {/* Single delete confirm */}
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

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={!!confirmBulkDelete}
        onConfirm={() => {
          if (confirmBulkDelete) bulkDeleteMut.mutate(confirmBulkDelete.ids);
          setConfirmBulkDelete(null);
        }}
        onCancel={() => setConfirmBulkDelete(null)}
        title="מחיקת מסמכים"
        message={confirmBulkDelete?.message ?? ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() =>
          setConfirmBulkDelete({
            ids: Array.from(selectedIds),
            message: `האם אתה בטוח שברצונך למחוק ${selectedIds.size} מסמכים?`,
          })
        }
        deleting={bulkDeleteMut.isPending}
      />
    </PageShell>
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
    <SidePanel open={true} title={title} onClose={onClose} width="lg">
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
              <h2 className="font-bold text-[#323338]">{title}</h2>
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
                  __html: sanitizeHtml(content),
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
