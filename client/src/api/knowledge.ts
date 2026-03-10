import { api } from "./client";

export interface KbCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  parentId: string | null;
  _count: { articles: number };
  createdAt: string;
}

export interface KbArticle {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: { id: string; name: string } | null;
  categoryId: string | null;
  status: "draft" | "published";
  authorId: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export function listCategories() {
  return api<KbCategory[]>("/kb/categories");
}

export function createCategory(data: {
  name: string;
  slug: string;
  order?: number;
}) {
  return api<KbCategory>("/kb/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listArticles(params?: {
  categoryId?: string;
  status?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  return api<KbArticle[]>(`/kb/articles${qs ? `?${qs}` : ""}`);
}

export function getArticle(id: string) {
  return api<KbArticle>(`/kb/articles/${id}`);
}

export function createArticle(data: {
  title: string;
  slug: string;
  body: string;
  categoryId?: string;
  status?: string;
}) {
  return api<KbArticle>("/kb/articles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateArticle(
  id: string,
  data: Partial<{
    title: string;
    slug: string;
    body: string;
    categoryId: string;
    status: string;
  }>,
) {
  return api<KbArticle>(`/kb/articles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteArticle(id: string) {
  return api(`/kb/articles/${id}`, { method: "DELETE" });
}

export function voteArticle(id: string, helpful: boolean) {
  return api(`/kb/articles/${id}/helpful`, {
    method: "POST",
    body: JSON.stringify({ helpful }),
  });
}
