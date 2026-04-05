import { api, getAccessToken, getWorkspaceId } from "./client";

const API_BASE = "/api/v1";

export interface AiHealthResponse {
  available: boolean;
  model: string;
}

export async function getAiHealth(): Promise<AiHealthResponse> {
  return api<AiHealthResponse>("/ai/health");
}

/**
 * Generic SSE stream reader for AI endpoints.
 * Calls onChunk with each text fragment, onDone when complete, onError on failure.
 */
export async function streamAiResponse(
  path: string,
  options: {
    body?: Record<string, unknown>;
    onChunk: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  },
) {
  const { body, onChunk, onDone, onError } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const wsId = getWorkspaceId();
  if (wsId) headers["X-Workspace-Id"] = wsId;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {}),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "AI לא זמין" } }));
      onError(err.error?.message || "AI לא זמין");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "data: [DONE]") {
          onDone();
          return;
        }
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.error) {
              onError(json.error);
              return;
            }
            if (json.content) {
              onChunk(json.content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    onDone();
  } catch {
    onError("AI לא זמין — בדוק חיבור לשרת");
  }
}

// Convenience wrappers

export function summarizeContact(
  contactId: string,
  handlers: { onChunk: (t: string) => void; onDone: () => void; onError: (e: string) => void },
) {
  return streamAiResponse(`/ai/summarize-contact/${contactId}`, handlers);
}

export function scoreDeal(
  dealId: string,
  handlers: { onChunk: (t: string) => void; onDone: () => void; onError: (e: string) => void },
) {
  return streamAiResponse(`/ai/score-deal/${dealId}`, handlers);
}

export function draftEmail(
  contactId: string,
  context: string | undefined,
  handlers: { onChunk: (t: string) => void; onDone: () => void; onError: (e: string) => void },
) {
  return streamAiResponse(`/ai/draft-email/${contactId}`, {
    body: context ? { context } : {},
    ...handlers,
  });
}

export function suggestAction(
  contactId: string,
  handlers: { onChunk: (t: string) => void; onDone: () => void; onError: (e: string) => void },
) {
  return streamAiResponse(`/ai/suggest-action/${contactId}`, handlers);
}
