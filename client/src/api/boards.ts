import { api } from "./client";

// ── Types ──────────────────────────────────────────────────────────

export interface BoardTemplate {
  key: string;
  name: string;
  icon: string;
  color: string;
  columnCount: number;
  columns: Array<{ key: string; label: string; type: string }>;
}

export interface BoardSummary {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  templateKey: string | null;
  isPrivate: boolean;
  itemCount: number;
  columnCount: number;
  groupCount: number;
  createdAt: string;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  key: string;
  label: string;
  type: string;
  width: string | null;
  order: number;
  options: Array<{ key: string; label: string; color: string }> | null;
}

export interface BoardItemValue {
  id: string;
  itemId: string;
  columnId: string;
  textValue: string | null;
  numberValue: number | null;
  dateValue: string | null;
  jsonValue: any;
  column: { id: string; key: string; type: string };
}

export interface BoardItem {
  id: string;
  boardId: string;
  groupId: string;
  name: string;
  order: number;
  createdAt: string;
  values: BoardItemValue[];
}

export interface BoardGroup {
  id: string;
  boardId: string;
  name: string;
  color: string;
  order: number;
  collapsed: boolean;
  items: BoardItem[];
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  templateKey: string | null;
  isPrivate: boolean;
  columns: BoardColumn[];
  groups: BoardGroup[];
  createdAt: string;
}

// ── Board Access Types ──────────────────────────────────────────────

export type BoardPermission = "VIEWER" | "EDITOR" | "ADMIN";

export interface BoardAccessRecord {
  id: string;
  boardId: string;
  memberId: string;
  permission: BoardPermission;
  grantedBy: string | null;
  grantedAt: string;
  member: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
  };
}

// ── API Functions ──────────────────────────────────────────────────

export function getTemplates() {
  return api<BoardTemplate[]>("/boards/templates");
}

export function listBoards() {
  return api<BoardSummary[]>("/boards");
}

export function getBoard(id: string) {
  return api<Board>(`/boards/${id}`);
}

export function createBoard(data: {
  name: string;
  templateKey?: string;
  description?: string;
  icon?: string;
  color?: string;
}) {
  return api<Board>("/boards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBoard(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
  }>,
) {
  return api<Board>(`/boards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteBoard(id: string) {
  return api(`/boards/${id}`, { method: "DELETE" });
}

// Columns
export function addBoardColumn(
  boardId: string,
  data: {
    key: string;
    label: string;
    type: string;
    width?: string;
    options?: Array<{ key: string; label: string; color: string }>;
  },
) {
  return api<BoardColumn>(`/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBoardColumn(
  boardId: string,
  columnId: string,
  data: Partial<{
    label: string;
    width: string;
    order: number;
    options: Array<{ key: string; label: string; color: string }>;
  }>,
) {
  return api<BoardColumn>(`/boards/${boardId}/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteBoardColumn(boardId: string, columnId: string) {
  return api(`/boards/${boardId}/columns/${columnId}`, { method: "DELETE" });
}

// Groups
export function addBoardGroup(
  boardId: string,
  data: { name: string; color?: string },
) {
  return api<BoardGroup>(`/boards/${boardId}/groups`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBoardGroup(
  boardId: string,
  groupId: string,
  data: Partial<{
    name: string;
    color: string;
    order: number;
    collapsed: boolean;
  }>,
) {
  return api<BoardGroup>(`/boards/${boardId}/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteBoardGroup(boardId: string, groupId: string) {
  return api(`/boards/${boardId}/groups/${groupId}`, { method: "DELETE" });
}

// Items
export function addBoardItem(
  boardId: string,
  groupId: string,
  data: { name: string },
) {
  return api<BoardItem>(`/boards/${boardId}/groups/${groupId}/items`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBoardItem(
  boardId: string,
  itemId: string,
  data: Partial<{ name: string; groupId: string; order: number }>,
) {
  return api<BoardItem>(`/boards/${boardId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteBoardItem(boardId: string, itemId: string) {
  return api(`/boards/${boardId}/items/${itemId}`, { method: "DELETE" });
}

// Values
export function updateBoardItemValues(
  boardId: string,
  itemId: string,
  values: Array<{
    columnId: string;
    textValue?: string | null;
    numberValue?: number | null;
    dateValue?: string | null;
    jsonValue?: any;
  }>,
) {
  return api<BoardItemValue[]>(`/boards/${boardId}/items/${itemId}/values`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

// ── Board Item Comments ─────────────────────────────────────────

export interface BoardItemComment {
  id: string;
  itemId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  };
}

export function getBoardItemComments(boardId: string, itemId: string) {
  return api<BoardItemComment[]>(`/boards/${boardId}/items/${itemId}/comments`);
}

export function createBoardItemComment(boardId: string, itemId: string, body: string) {
  return api<BoardItemComment>(`/boards/${boardId}/items/${itemId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

// ── Board Access / Permissions ──────────────────────────────────────

export function getBoardAccess(boardId: string) {
  return api<BoardAccessRecord[]>(`/boards/${boardId}/access`);
}

export function setBoardAccess(
  boardId: string,
  memberId: string,
  permission: BoardPermission,
) {
  return api<BoardAccessRecord>(`/boards/${boardId}/access`, {
    method: "POST",
    body: JSON.stringify({ memberId, permission }),
  });
}

export function removeBoardAccess(boardId: string, memberId: string) {
  return api<{ success: boolean }>(`/boards/${boardId}/access/${memberId}`, {
    method: "DELETE",
  });
}

export function toggleBoardPrivacy(boardId: string, isPrivate: boolean) {
  return api<Board>(`/boards/${boardId}/privacy`, {
    method: "PATCH",
    body: JSON.stringify({ isPrivate }),
  });
}

// ── Board Item Sub-Items ────────────────────────────────────────

export interface BoardSubItem {
  id: string;
  boardId: string;
  groupId: string;
  parentItemId: string;
  name: string;
  order: number;
  done: boolean;
  createdAt: string;
}

export function getBoardItemSubItems(boardId: string, itemId: string) {
  return api<BoardSubItem[]>(`/boards/${boardId}/items/${itemId}/subitems`);
}

export function createBoardItemSubItem(boardId: string, itemId: string, name: string) {
  return api<BoardSubItem>(`/boards/${boardId}/items/${itemId}/subitems`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateBoardItemSubItem(
  boardId: string,
  itemId: string,
  subItemId: string,
  data: Partial<{ name: string; done: boolean }>,
) {
  return api<BoardSubItem>(`/boards/${boardId}/items/${itemId}/subitems/${subItemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteBoardItemSubItem(boardId: string, itemId: string, subItemId: string) {
  return api(`/boards/${boardId}/items/${itemId}/subitems/${subItemId}`, { method: "DELETE" });
}

// ── Board Item Files ────────────────────────────────────────────

export interface BoardItemFile {
  id: string;
  itemId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  createdAt: string;
}

export function getBoardItemFiles(boardId: string, itemId: string) {
  return api<BoardItemFile[]>(`/boards/${boardId}/items/${itemId}/files`);
}

export function uploadBoardItemFile(boardId: string, itemId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  // Use raw fetch — api() sets Content-Type: application/json which breaks multipart
  const token = localStorage.getItem("vixy_at");
  const wsId = localStorage.getItem("workspaceId");
  return fetch(`/api/v1/boards/${boardId}/items/${itemId}/files`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(wsId ? { "X-Workspace-Id": wsId } : {}),
    },
    body: formData,
  }).then(async (r) => {
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error?.message || "שגיאה בהעלאת קובץ");
    }
    return r.json() as Promise<BoardItemFile>;
  });
}

export function deleteBoardItemFile(boardId: string, itemId: string, fileId: string) {
  return api(`/boards/${boardId}/items/${itemId}/files/${fileId}`, { method: "DELETE" });
}
