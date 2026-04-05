import { prisma } from "../db/client";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";

const AI_ENABLED = config.ai.enabled;
const AI_PROVIDER = config.ai.provider;

function getBaseUrl(): string {
  return AI_PROVIDER === "google"
    ? "https://generativelanguage.googleapis.com/v1beta/openai"
    : config.ai.ollamaBaseUrl;
}

function getModel(): string {
  return AI_PROVIDER === "google" ? config.ai.googleModel : config.ai.ollamaModel;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (AI_PROVIDER === "google") {
    headers["Authorization"] = `Bearer ${config.ai.googleApiKey}`;
  }
  return headers;
}

function getProviderLabel(): string {
  return AI_PROVIDER === "google" ? "Google AI Studio" : "Ollama";
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!AI_ENABLED) {
    throw new AppError(503, "AI_DISABLED", "AI לא זמין");
  }

  try {
    const res = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: getModel(),
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new AppError(502, "AI_PROVIDER_ERROR", `${getProviderLabel()} returned ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, "AI_UNAVAILABLE", `AI לא זמין — בדוק ש${getProviderLabel()} רץ`);
  }
}

export async function* chatCompletionStream(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!AI_ENABLED) {
    throw new AppError(503, "AI_DISABLED", "AI לא זמין");
  }

  try {
    const res = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: getModel(),
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new AppError(502, "AI_PROVIDER_ERROR", `${getProviderLabel()} returned ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new AppError(502, "AI_PROVIDER_ERROR", "No response body");

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
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, "AI_UNAVAILABLE", `AI לא זמין — בדוק ש${getProviderLabel()} רץ`);
  }
}

// ─── Contact Summarization ───

export async function summarizeContact(workspaceId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    include: {
      company: { select: { name: true, industry: true } },
      deals: {
        select: { title: true, value: true, stage: true, priority: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      activities: {
        select: { type: true, subject: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      tasks: {
        select: { title: true, status: true, dueDate: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });

  if (!contact) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  const context = buildContactContext(contact);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `אתה עוזר AI בתוך מערכת CRM ישראלית. ענה תמיד בעברית.
תפקידך לסכם את פרופיל איש הקשר בצורה תמציתית ושימושית לאיש מכירות.
הסיכום צריך לכלול: מי זה, מה הסטטוס שלו, עסקאות פעילות, ותובנות מפעילות אחרונה.
שמור על טון מקצועי וקצר — 3-5 משפטים מקסימום.`,
    },
    {
      role: "user",
      content: `סכם את איש הקשר הבא:\n\n${context}`,
    },
  ];

  return { messages, contact };
}

// ─── Deal Scoring ───

export async function scoreDeal(workspaceId: string, dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, workspaceId },
    include: {
      contact: {
        select: { firstName: true, lastName: true, status: true, leadScore: true, leadHeat: true },
      },
      activities: {
        select: { type: true, createdAt: true, body: true },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
      tasks: {
        select: { title: true, status: true, dueDate: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!deal) {
    throw new AppError(404, "NOT_FOUND", "Deal not found");
  }

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysSinceLastActivity = deal.lastActivityAt
    ? Math.floor((Date.now() - new Date(deal.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreation;

  const context = `
עסקה: ${deal.title}
שלב: ${deal.stage}
ערך: ₪${deal.value || 0}
עדיפות: ${deal.priority}
הסתברות נוכחית: ${deal.probability}%
ימים מאז יצירה: ${daysSinceCreation}
ימים מאז פעילות אחרונה: ${daysSinceLastActivity}
תאריך סגירה צפוי: ${deal.expectedClose ? new Date(deal.expectedClose).toLocaleDateString("he-IL") : "לא הוגדר"}
איש קשר: ${deal.contact.firstName} ${deal.contact.lastName} (${deal.contact.status}, ציון ליד: ${deal.contact.leadScore})
פעילויות אחרונות (${deal.activities.length}): ${deal.activities.map((a) => `${a.type} (${new Date(a.createdAt).toLocaleDateString("he-IL")})`).join(", ") || "אין"}
משימות פתוחות: ${deal.tasks.filter((t) => t.status !== "DONE").length}
הערות: ${deal.notes || "אין"}
`.trim();

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `אתה עוזר AI בתוך מערכת CRM. ענה תמיד בעברית.
תפקידך לתת ציון (1-100) לעסקה על בסיס הנתונים שתקבל.
ענה בפורמט הבא בדיוק:
ציון: [מספר]
סיבות: [2-3 נקודות קצרות]
המלצה: [משפט אחד]

התחשב ב: שלב העסקה, פעילות אחרונה, ערך, זמן פתוח, משימות פתוחות, ומצב הליד.`,
    },
    {
      role: "user",
      content: `תן ציון לעסקה:\n\n${context}`,
    },
  ];

  return { messages, deal };
}

// ─── Email Draft Generation ───

export async function draftEmail(workspaceId: string, contactId: string, context?: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    include: {
      company: { select: { name: true } },
      deals: {
        select: { title: true, stage: true, value: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      activities: {
        select: { type: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!contact) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  const contactContext = buildContactContext(contact);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `אתה עוזר AI בתוך מערכת CRM ישראלית. ענה תמיד בעברית.
תפקידך לכתוב טיוטת מייל מעקב מקצועית עבור איש הקשר.
המייל צריך להיות:
- מותאם לשלב העסקה ולהיסטוריית הקשר
- מקצועי אך חם
- קצר ולעניין (5-8 שורות)
- לכלול שורת נושא מוצעת
ענה בפורמט:
נושא: [שורת הנושא]
---
[גוף המייל]`,
    },
    {
      role: "user",
      content: `כתוב מייל מעקב עבור:\n\n${contactContext}${context ? `\n\nהקשר נוסף: ${context}` : ""}`,
    },
  ];

  return { messages, contact };
}

// ─── Smart Action Suggestions ───

export async function suggestAction(workspaceId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    include: {
      company: { select: { name: true } },
      deals: {
        select: { title: true, stage: true, value: true, lastActivityAt: true, expectedClose: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      activities: {
        select: { type: true, subject: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
      tasks: {
        select: { title: true, status: true, dueDate: true, priority: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tickets: {
        select: { subject: true, status: true, priority: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!contact) {
    throw new AppError(404, "NOT_FOUND", "Contact not found");
  }

  const contactContext = buildContactContext(contact);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `אתה עוזר AI בתוך מערכת CRM ישראלית. ענה תמיד בעברית.
תפקידך לנתח את פעילות איש הקשר ולהמליץ על הפעולה הבאה.
ענה בפורמט:
פעולה מומלצת: [משפט אחד ברור]
דחיפות: [גבוהה/בינונית/נמוכה]
סיבה: [1-2 משפטים]
טיפ: [משפט אחד עם תובנה נוספת]

התחשב ב: מתי היתה הפעילות האחרונה, משימות פתוחות, שלב עסקאות, ופניות פתוחות.`,
    },
    {
      role: "user",
      content: `מה הפעולה הבאה המומלצת עבור:\n\n${contactContext}`,
    },
  ];

  return { messages, contact };
}

// ─── Health Check ───

export async function checkHealth(): Promise<{ available: boolean; model: string; provider: string }> {
  const model = getModel();
  const provider = AI_PROVIDER;
  if (!AI_ENABLED) return { available: false, model, provider };

  try {
    const headers: Record<string, string> = {};
    if (AI_PROVIDER === "google") {
      headers["Authorization"] = `Bearer ${config.ai.googleApiKey}`;
    }
    const res = await fetch(`${getBaseUrl()}/models`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
    return { available: res.ok, model, provider };
  } catch {
    return { available: false, model, provider };
  }
}

// ─── Helpers ───

function buildContactContext(contact: any): string {
  const lines: string[] = [];

  lines.push(`שם: ${contact.firstName} ${contact.lastName}`);
  lines.push(`סטטוס: ${contact.status}`);
  if (contact.leadScore !== undefined) lines.push(`ציון ליד: ${contact.leadScore}/100`);
  if (contact.leadHeat) lines.push(`חום ליד: ${contact.leadHeat}`);
  if (contact.email) lines.push(`אימייל: ${contact.email}`);
  if (contact.phone) lines.push(`טלפון: ${contact.phone}`);
  if (contact.position) lines.push(`תפקיד: ${contact.position}`);
  if (contact.company?.name) lines.push(`חברה: ${contact.company.name}`);
  if (contact.company?.industry) lines.push(`תעשייה: ${contact.company.industry}`);
  if (contact.source) lines.push(`מקור: ${contact.source}`);

  if (contact.tags?.length > 0) {
    lines.push(`תגיות: ${contact.tags.map((t: any) => t.tag?.name || t.name).join(", ")}`);
  }

  if (contact.deals?.length > 0) {
    lines.push(`\nעסקאות (${contact.deals.length}):`);
    for (const d of contact.deals) {
      lines.push(`  - ${d.title} | שלב: ${d.stage} | ערך: ₪${d.value || 0}`);
    }
  }

  if (contact.activities?.length > 0) {
    lines.push(`\nפעילויות אחרונות (${contact.activities.length}):`);
    for (const a of contact.activities.slice(0, 10)) {
      const date = new Date(a.createdAt).toLocaleDateString("he-IL");
      const body = a.body ? ` — ${a.body.slice(0, 80)}` : "";
      lines.push(`  - ${a.type} (${date})${body}`);
    }
  }

  if (contact.tasks?.length > 0) {
    lines.push(`\nמשימות (${contact.tasks.length}):`);
    for (const t of contact.tasks.slice(0, 5)) {
      const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString("he-IL") : "ללא";
      lines.push(`  - ${t.title} | סטטוס: ${t.status} | דדליין: ${due}`);
    }
  }

  if (contact.tickets?.length > 0) {
    lines.push(`\nפניות (${contact.tickets.length}):`);
    for (const t of contact.tickets.slice(0, 5)) {
      lines.push(`  - ${t.subject} | סטטוס: ${t.status} | עדיפות: ${t.priority}`);
    }
  }

  return lines.join("\n");
}
