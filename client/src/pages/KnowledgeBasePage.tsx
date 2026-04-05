import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import { sanitizeHtml } from "../lib/sanitize";
import {
  Plus,
  BookOpen,
  FolderOpen,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  FileText,
  PenLine,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import StatusBadge from "../components/shared/StatusBadge";
import {
  listCategories,
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  createCategory,
  voteArticle,
  type KbCategory,
  type KbArticle,
} from "../api/knowledge";

type View = "list" | "article" | "editor";

const CATEGORY_COLORS = [
  "#6161FF",
  "#00CA72",
  "#FDAB3D",
  "#A25DDC",
  "#579BFC",
  "#FB275D",
  "#25D366",
  "#FF642E",
];

function getCategoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export default function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("list");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const { data: categories } = useQuery({
    queryKey: ["kb-categories"],
    queryFn: listCategories,
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ["kb-articles", { categoryId: selectedCategory, search: debouncedSearch }],
    queryFn: () =>
      listArticles({
        categoryId: selectedCategory || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: selectedArticle } = useQuery({
    queryKey: ["kb-article", selectedArticleId],
    queryFn: () => getArticle(selectedArticleId!),
    enabled: !!selectedArticleId && view === "article",
  });

  function openArticle(id: string) {
    setSelectedArticleId(id);
    setView("article");
  }

  function backToList() {
    setView("list");
    setSelectedArticleId(null);
  }

  if (view === "article" && selectedArticle) {
    return (
      <ArticleView
        article={selectedArticle}
        categories={categories || []}
        onBack={backToList}
        onEdit={() => setView("editor")}
      />
    );
  }

  if (view === "editor" && selectedArticle) {
    return (
      <ArticleEditor
        article={selectedArticle}
        categories={categories || []}
        onBack={() => setView("article")}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
          queryClient.invalidateQueries({
            queryKey: ["kb-article", selectedArticleId],
          });
          setView("article");
        }}
      />
    );
  }

  return (
    <PageShell
      boardStyle
      emoji="📚"
      title="מאגר ידע"
      subtitle={`${articles?.length || 0} מאמרים`}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateCategory(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6E9EF] hover:border-[#0073EA] text-[#676879] hover:text-[#0073EA] text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-sm"
          >
            <FolderOpen size={14} />
            קטגוריה חדשה
          </button>
          <button
            onClick={() => setShowCreateArticle(true)}
            className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
            מאמר חדש
          </button>
        </div>
      }
    >
      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מאמרים..."
          className="w-full pr-9 pl-4 py-2 bg-white border border-[#E6E9EF] rounded-[4px] text-[13px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Categories sidebar */}
        <div className="col-span-1 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-3 space-y-1 self-start">
          <button
            onClick={() => setSelectedCategory("")}
            className={`w-full text-right px-3 py-2.5 rounded-[4px] text-[13px] font-medium transition-all flex items-center gap-2 ${
              !selectedCategory
                ? "bg-[#F5F6FF] text-[#0073EA] font-semibold border-r-[3px] border-[#0073EA]"
                : "text-[#676879] hover:bg-[#F5F6F8]"
            }`}
          >
            <BookOpen size={14} />
            <span className="flex-1">כל המאמרים</span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                !selectedCategory
                  ? "bg-[#0073EA] text-white"
                  : "bg-surface-tertiary text-[#9699A6]"
              }`}
            >
              {articles?.length || 0}
            </span>
          </button>
          {categories?.map((cat, idx) => {
            const color = getCategoryColor(idx);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-right px-3 py-2.5 rounded-[4px] text-[13px] font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? "bg-[#F5F6FF] font-semibold border-r-[3px]"
                    : "text-[#676879] hover:bg-[#F5F6F8]"
                }`}
                style={
                  selectedCategory === cat.id
                    ? { borderRightColor: color, color }
                    : undefined
                }
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1 truncate">{cat.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedCategory === cat.id
                      ? "text-white"
                      : "bg-surface-tertiary text-[#9699A6]"
                  }`}
                  style={
                    selectedCategory === cat.id
                      ? { backgroundColor: color }
                      : undefined
                  }
                >
                  {cat._count.articles}
                </span>
              </button>
            );
          })}
        </div>

        {/* Articles list */}
        <div className="col-span-1 md:col-span-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-5 h-28 animate-pulse"
                />
              ))}
            </div>
          ) : !articles || articles.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={28} className="text-[#9699A6]" />}
              title="אין מאמרים"
              description="צרו מאמר ראשון במאגר הידע."
              action={
                <button
                  onClick={() => setShowCreateArticle(true)}
                  className="px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md"
                >
                  צור מאמר ראשון
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {articles.map((article) => {
                const catIdx = categories?.findIndex(
                  (c) => c.id === article.categoryId,
                );
                const catColor =
                  catIdx !== undefined && catIdx >= 0
                    ? getCategoryColor(catIdx)
                    : "#C4C4C4";
                return (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    categoryColor={catColor}
                    onClick={() => openArticle(article.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateCategory && (
        <CreateCategoryModal onClose={() => setShowCreateCategory(false)} />
      )}
      {showCreateArticle && (
        <CreateArticleModal
          categories={categories || []}
          onClose={() => setShowCreateArticle(false)}
        />
      )}
    </PageShell>
  );
}

function ArticleCard({
  article,
  categoryColor,
  onClick,
}: {
  article: KbArticle;
  categoryColor: string;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] border-r-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all p-5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-1"
      style={{ borderRightColor: categoryColor }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[4px] flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: categoryColor }}
          >
            <FileText size={14} />
          </div>
          <div>
            <h3 className="font-semibold text-[#323338] group-hover:text-[#0073EA] transition-colors">
              {article.title}
            </h3>
            {article.category && (
              <span className="text-[12px] text-[#9699A6]">
                {article.category.name}
              </span>
            )}
          </div>
        </div>
        <StatusBadge
          label={article.status === "published" ? "מפורסם" : "טיוטה"}
          color={article.status === "published" ? "#00CA72" : "#C4C4C4"}
        />
      </div>
      <div className="flex items-center gap-4 mt-3 text-[12px] text-[#9699A6]">
        <div className="flex items-center gap-1.5">
          <Eye size={12} className="text-[#0073EA]" />
          <span>{article.viewCount} צפיות</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsUp size={12} className="text-success" />
          <span>{article.helpfulCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsDown size={12} className="text-[#E44258]" />
          <span>{article.notHelpfulCount}</span>
        </div>
        <span className="mr-auto">
          עודכן {new Date(article.updatedAt).toLocaleDateString("he-IL")}
        </span>
      </div>
    </div>
  );
}

function ArticleView({
  article,
  categories,
  onBack,
  onEdit,
}: {
  article: KbArticle;
  categories: KbCategory[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const catIdx = categories.findIndex((c) => c.id === article.categoryId);
  const catColor = catIdx >= 0 ? getCategoryColor(catIdx) : "#6161FF";

  const voteMutation = useMutation({
    mutationFn: (helpful: boolean) => voteArticle(article.id, helpful),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kb-article", article.id],
      });
      toast.success("תודה על המשוב!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message || "שגיאה בשליחת משוב");
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
        >
          <ArrowRight size={18} className="text-[#676879]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {article.category && (
              <span
                className="text-[12px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: catColor }}
              >
                {article.category.name}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#323338]">
            {article.title}
          </h1>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E9EF] hover:border-[#0073EA] text-[#676879] hover:text-[#0073EA] text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-sm"
        >
          <PenLine size={14} />
          ערוך
        </button>
      </div>

      {/* Article body */}
      <div
        className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6 border-r-4"
        style={{ borderRightColor: catColor }}
      >
        <div
          className="prose prose-sm max-w-none text-[#323338]"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body) }}
        />
      </div>

      {/* Stats + Vote */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[12px] text-[#9699A6]">
          <div className="flex items-center gap-1.5">
            <Eye size={12} className="text-[#0073EA]" />
            <span>{article.viewCount} צפיות</span>
          </div>
          <StatusBadge
            label={article.status === "published" ? "מפורסם" : "טיוטה"}
            color={article.status === "published" ? "#00CA72" : "#C4C4C4"}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#676879]">
            האם מאמר זה עזר לך?
          </span>
          <button
            onClick={() => voteMutation.mutate(true)}
            disabled={voteMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#E6E9EF] hover:border-success hover:bg-success-light hover:text-success transition-all text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsUp size={14} />
            <span>כן ({article.helpfulCount})</span>
          </button>
          <button
            onClick={() => voteMutation.mutate(false)}
            disabled={voteMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#E6E9EF] hover:border-[#E44258] hover:bg-red-50 hover:text-[#E44258] transition-all text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ThumbsDown size={14} />
            <span>לא ({article.notHelpfulCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ArticleEditor({
  article,
  categories,
  onBack,
  onSaved,
}: {
  article: KbArticle;
  categories: KbCategory[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [categoryId, setCategoryId] = useState(article.categoryId || "");
  const [status, setStatus] = useState(article.status);

  const mutation = useMutation({
    mutationFn: () =>
      updateArticle(article.id, {
        title,
        body,
        categoryId: categoryId || undefined,
        status,
      }),
    onSuccess: () => {
      toast.success("מאמר עודכן בהצלחה!");
      onSaved();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בעדכון מאמר");
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
          >
            <ArrowRight size={18} className="text-[#676879]" />
          </button>
          <h1 className="text-xl font-bold text-[#323338]">עריכת מאמר</h1>
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-1.5 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
          >
            <option value="draft">טיוטה</option>
            <option value="published">מפורסם</option>
          </select>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md disabled:opacity-50"
          >
            {mutation.isPending ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            כותרת
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            קטגוריה
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
          >
            <option value="">ללא קטגוריה</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            תוכן (HTML)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] font-mono"
            rows={15}
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}

function CreateCategoryModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createCategory({
        name,
        slug: name.replace(/\s+/g, "-").toLowerCase(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
      toast.success("קטגוריה נוצרה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת קטגוריה");
    },
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="קטגוריה חדשה"
      maxWidth="max-w-sm"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4 p-6"
      >
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            שם קטגוריה *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            required
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateArticleModal({
  categories,
  onClose,
}: {
  categories: KbCategory[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    body: "",
    categoryId: "",
    status: "draft",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createArticle({
        title: form.title,
        slug: form.title.replace(/\s+/g, "-").toLowerCase(),
        body: form.body,
        categoryId: form.categoryId || undefined,
        status: form.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast.success("מאמר נוצר בהצלחה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת מאמר");
    },
  });

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="מאמר חדש">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4 p-6"
      >
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            כותרת *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              קטגוריה
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setField("categoryId", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            >
              <option value="">ללא</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              סטטוס
            </label>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            >
              <option value="draft">טיוטה</option>
              <option value="published">מפורסם</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            תוכן *
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setField("body", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] resize-none"
            rows={8}
            required
            placeholder="תוכן המאמר (תומך HTML)"
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
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור מאמר"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
