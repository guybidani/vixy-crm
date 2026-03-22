import { getAccessToken, getWorkspaceId } from "./client";

export async function downloadExport(
  entity: string,
  filters?: { status?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);

  const qs = params.toString();
  const url = `/api/v1/export/${entity}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "X-Workspace-Id": getWorkspaceId() || "",
    },
    credentials: "include",
  });

  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${entity}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
