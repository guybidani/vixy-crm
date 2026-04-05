import { useState, useRef, useEffect } from "react";
import { handleMutationError } from "../../lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  File,
  Image,
  Upload,
  Plus,
  X,
  Download,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import {
  getEntityDocuments,
  uploadDocument,
  linkDocument,
  unlinkDocument,
  getDocuments,
  createRichText,
  type EntityDocumentLink,
} from "../../api/documents";

interface EntityDocumentsSectionProps {
  entityType: "contact" | "deal" | "company" | "ticket";
  entityId: string;
}

function getSmallFileIcon(mimeType: string | null) {
  if (!mimeType) return <File size={16} className="text-[#9699A6]" />;
  if (mimeType.startsWith("image/"))
    return <Image size={16} className="text-[#00CA72]" />;
  if (mimeType.includes("pdf"))
    return <FileText size={16} className="text-[#FB275D]" />;
  return <File size={16} className="text-[#579BFC]" />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EntityDocumentsSection({
  entityType,
  entityId,
}: EntityDocumentsSectionProps) {
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateRichText, setShowCreateRichText] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{ docId: string; linkId: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryKey = ["entity-documents", entityType, entityId];

  const { data: docLinks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getEntityDocuments(entityType, entityId),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const doc = await uploadDocument(file);
      await linkDocument(doc.id, entityType, entityId);
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("קובץ הועלה וקושר!");
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בהעלאה"),
  });

  const unlinkMut = useMutation({
    mutationFn: ({ docId, linkId }: { docId: string; linkId: string }) =>
      unlinkDocument(docId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("קישור הוסר");
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בהסרת קישור"),
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
    e.target.value = "";
  }

  // Close documents add-menu on Escape
  useEffect(() => {
    if (!showMenu) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMenu(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showMenu]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#323338] flex items-center gap-1.5">
          <FileText size={15} className="text-[#FF642E]" />
          מסמכים
          {docLinks.length > 0 && (
            <span className="text-xs bg-[#F5F6F8] text-[#9699A6] px-1.5 py-0.5 rounded-full">
              {docLinks.length}
            </span>
          )}
        </h3>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#9699A6] hover:text-[#0073EA]"
            aria-label="הוסף מסמך"
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <Plus size={16} />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[#E6E9EF] py-1 w-44 z-50"
                role="menu"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                >
                  <Upload size={14} className="text-[#9699A6]" />
                  העלה קובץ
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    setShowCreateRichText(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                >
                  <FileText size={14} className="text-[#9699A6]" />
                  מסמך חדש
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    setShowLinkModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#323338] hover:bg-[#F5F6F8] transition-colors"
                >
                  <Link2 size={14} className="text-[#9699A6]" />
                  קשר מסמך קיים
                </button>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-[#F5F6F8] rounded-[4px] p-3 animate-pulse h-12"
            />
          ))}
        </div>
      ) : docLinks.length === 0 ? (
        <p className="text-xs text-[#9699A6] py-3 text-center">
          אין מסמכים מקושרים
        </p>
      ) : (
        <div className="space-y-1.5">
          {docLinks.map((link: EntityDocumentLink) => (
            <div
              key={link.id}
              className="flex items-center gap-2.5 p-2.5 rounded-[4px] bg-[#F5F6F8]/50 hover:bg-[#F5F6F8] transition-colors group"
            >
              <div className="w-8 h-8 rounded-[4px] bg-white flex items-center justify-center flex-shrink-0">
                {link.document.type === "RICH_TEXT" ? (
                  <FileText size={16} className="text-[#6161FF]" />
                ) : (
                  getSmallFileIcon(link.document.mimeType)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#323338] truncate">
                  {link.document.title}
                </p>
                <p className="text-[10px] text-[#9699A6]">
                  {link.document.type === "FILE"
                    ? formatSize(link.document.fileSize)
                    : "מסמך טקסט"}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {link.document.type === "FILE" && link.document.fileUrl && (
                  <a
                    href={`/uploads/${link.document.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-white text-[#9699A6] hover:text-[#0073EA] transition-colors"
                    title="הורדה"
                    aria-label={`הורד ${link.document.title}`}
                  >
                    <Download size={13} />
                  </a>
                )}
                <button
                  onClick={() =>
                    setUnlinkTarget({
                      docId: link.document.id,
                      linkId: link.id,
                      title: link.document.title,
                    })
                  }
                  className="p-1 rounded hover:bg-white text-[#9699A6] hover:text-red-500 transition-colors"
                  title="הסר קישור"
                  aria-label={`הסר קישור ל-${link.document.title}`}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLinkModal && (
        <LinkExistingDocModal
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => {
            queryClient.invalidateQueries({ queryKey });
            setShowLinkModal(false);
          }}
        />
      )}

      {showCreateRichText && (
        <QuickCreateRichText
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowCreateRichText(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            setShowCreateRichText(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!unlinkTarget}
        title="הסרת קישור מסמך"
        message={`האם להסיר את הקישור ל-"${unlinkTarget?.title ?? ""}"? המסמך עצמו לא יימחק.`}
        confirmText="הסר קישור"
        cancelText="ביטול"
        variant="danger"
        onConfirm={() => {
          if (unlinkTarget) {
            unlinkMut.mutate({ docId: unlinkTarget.docId, linkId: unlinkTarget.linkId });
          }
          setUnlinkTarget(null);
        }}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );
}

function LinkExistingDocModal({
  entityType,
  entityId,
  onClose,
  onLinked,
}: {
  entityType: string;
  entityId: string;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["documents", { search }],
    queryFn: () => getDocuments({ search: search || undefined, limit: 20 }),
  });

  const linkMut = useMutation({
    mutationFn: (docId: string) =>
      linkDocument(
        docId,
        entityType as "contact" | "deal" | "company" | "ticket",
        entityId,
      ),
    onSuccess: () => {
      toast.success("מסמך קושר!");
      onLinked();
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בקישור"),
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="קשר מסמך קיים"
      maxWidth="max-w-md"
    >
      <div className="p-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מסמכים..."
          className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] mb-3"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {data?.data.map((doc) => (
            <button
              key={doc.id}
              onClick={() => linkMut.mutate(doc.id)}
              disabled={linkMut.isPending}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-right"
            >
              <div className="w-8 h-8 rounded-[4px] bg-[#F5F6F8] flex items-center justify-center flex-shrink-0">
                {doc.type === "RICH_TEXT" ? (
                  <FileText size={16} className="text-[#6161FF]" />
                ) : (
                  <File size={16} className="text-[#9699A6]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#323338] truncate">
                  {doc.title}
                </p>
                <p className="text-[10px] text-[#9699A6]">
                  {new Date(doc.createdAt).toLocaleDateString("he-IL")}
                </p>
              </div>
            </button>
          ))}
          {data?.data.length === 0 && (
            <p className="text-sm text-[#9699A6] text-center py-4">
              לא נמצאו מסמכים
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function QuickCreateRichText({
  entityType,
  entityId,
  onClose,
  onCreated,
}: {
  entityType: string;
  entityId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");

  const createMut = useMutation({
    mutationFn: async () => {
      const doc = await createRichText({ title, content: "" });
      await linkDocument(
        doc.id,
        entityType as "contact" | "deal" | "company" | "ticket",
        entityId,
      );
      return doc;
    },
    onSuccess: () => {
      toast.success("מסמך נוצר וקושר!");
      onCreated();
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה ביצירת מסמך"),
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="מסמך טקסט חדש"
      maxWidth="max-w-sm"
    >
      <div className="p-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת המסמך"
          className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !title.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-sm disabled:opacity-50"
          >
            {createMut.isPending ? "יוצר..." : "צור"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
