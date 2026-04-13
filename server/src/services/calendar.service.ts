import crypto from "crypto";
import { prisma } from "../db/client";
import { config } from "../config";
import { encrypt, decrypt } from "../lib/encryption";
import { logger } from "../lib/logger";
import { FIVE_MINUTES_MS } from "../lib/constants";
import type { CalendarIntegration, Task } from "@prisma/client";

// ─── OAuth State Store ────────────────────────────────────────────────────────
// In-memory map: state token → { workspaceId, memberId, expiresAt }
// TTL = 5 minutes. Pruned on every getAuthUrl call.
interface OAuthState {
  workspaceId: string;
  memberId: string;
  expiresAt: number;
}

const stateStore = new Map<string, OAuthState>();

function pruneExpiredStates(): void {
  const now = Date.now();
  for (const [key, val] of stateStore) {
    if (val.expiresAt < now) stateStore.delete(key);
  }
}

// ─── Google OAuth Scopes ──────────────────────────────────────────────────────
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the Google OAuth2 authorization URL and store state for validation.
 * State is a cryptographically random hex string tied to workspaceId + memberId.
 */
export function getAuthUrl(workspaceId: string, memberId: string): string {
  pruneExpiredStates();

  const state = crypto.randomBytes(16).toString("hex");
  stateStore.set(state, {
    workspaceId,
    memberId,
    expiresAt: Date.now() + FIVE_MINUTES_MS,
  });

  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.oauthRedirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange the authorization code for tokens, fetch the user's Google email,
 * and upsert a CalendarIntegration record in the DB.
 */
export async function handleCallback(
  code: string,
  state: string,
): Promise<CalendarIntegration> {
  pruneExpiredStates();

  const stored = stateStore.get(state);
  if (!stored || stored.expiresAt < Date.now()) {
    throw new Error("Invalid or expired OAuth state");
  }
  stateStore.delete(state);

  const { workspaceId, memberId } = stored;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.oauthRedirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed: ${errText}`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token returned. Ensure prompt=consent and access_type=offline.",
    );
  }

  // Fetch user email from Google
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error("Failed to fetch Google user info");
  }
  const userInfo = (await userRes.json()) as { email: string };
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const encryptedAccess = encrypt(tokens.access_token, config.encryptionKey);
  const encryptedRefresh = encrypt(tokens.refresh_token, config.encryptionKey);

  const integration = await prisma.calendarIntegration.upsert({
    where: { memberId },
    create: {
      workspaceId,
      memberId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      googleEmail: userInfo.email,
      isActive: true,
    },
    update: {
      workspaceId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      googleEmail: userInfo.email,
      isActive: true,
    },
  });

  return integration;
}

/**
 * Return a valid access token for the given integration.
 * Automatically refreshes and persists new tokens if the current token
 * expires within the next 5 minutes.
 */
export async function getAccessToken(
  integration: CalendarIntegration,
): Promise<string> {
  const fiveMinutes = FIVE_MINUTES_MS;
  if (integration.expiresAt.getTime() > Date.now() + fiveMinutes) {
    return decrypt(integration.accessToken, config.encryptionKey);
  }

  const decryptedRefresh = decrypt(integration.refreshToken, config.encryptionKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      refresh_token: decryptedRefresh,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed: ${errText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const encryptedNewAccess = encrypt(data.access_token, config.encryptionKey);
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.calendarIntegration.update({
    where: { id: integration.id },
    data: { accessToken: encryptedNewAccess, expiresAt },
  });

  return data.access_token;
}

/**
 * Sync a CRM task to Google Calendar for the task's assignee.
 * If the assignee has an active integration, creates (or updates) the event.
 * Returns the Google Calendar event ID, or null if no integration exists.
 *
 * Fire-and-forget safe: all errors are caught and logged, never thrown.
 */
export async function syncTaskToCalendar(
  taskId: string,
  workspaceId: string,
  memberId: string,
): Promise<string | null> {
  try {
    // Fetch integration and task in parallel — independent queries
    const [integration, task] = await Promise.all([
      prisma.calendarIntegration.findUnique({ where: { memberId } }),
      prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: {
          assignee: { include: { user: { select: { email: true } } } },
        },
      }),
    ]);
    if (!integration || !integration.isActive) return null;
    if (!task) return null;

    const accessToken = await getAccessToken(integration);

    // If the task already has a Google event, update it
    if (task.googleCalendarEventId) {
      await _updateEvent(
        task.googleCalendarEventId,
        task,
        integration.googleCalendarId,
        accessToken,
        task.assignee?.user.email ?? undefined,
      );
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      });
      return task.googleCalendarEventId;
    }

    // Create a new event
    const eventBody = buildEventBody(
      task,
      task.assignee?.user.email ?? undefined,
    );
    const createRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.googleCalendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Calendar event creation failed: ${errText}`);
    }

    const event = (await createRes.json()) as { id: string };

    // Persist event ID and last-sync timestamp in parallel — independent writes.
    // Use updateMany with workspaceId for defense-in-depth on the task write.
    await Promise.all([
      prisma.task.updateMany({
        where: { id: taskId, workspaceId },
        data: { googleCalendarEventId: event.id },
      }),
      prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      }),
    ]);

    return event.id;
  } catch (err) {
    logger.error({ err }, "syncTaskToCalendar error");
    return null;
  }
}

/**
 * Update an existing Google Calendar event to match the current task state.
 */
export async function updateCalendarEvent(
  task: Task,
  integration: CalendarIntegration,
): Promise<void> {
  if (!task.googleCalendarEventId) return;

  // Fetch access token and task assignee in parallel — independent operations.
  // Use findFirst with workspaceId for defense-in-depth (the previous
  // findUnique had no workspace scope, risking cross-workspace data access).
  const [accessToken, taskWithAssignee] = await Promise.all([
    getAccessToken(integration),
    prisma.task.findFirst({
      where: { id: task.id, workspaceId: integration.workspaceId },
      include: { assignee: { include: { user: { select: { email: true } } } } },
    }),
  ]);

  await _updateEvent(
    task.googleCalendarEventId,
    task,
    integration.googleCalendarId,
    accessToken,
    taskWithAssignee?.assignee?.user.email ?? undefined,
  );

  await prisma.calendarIntegration.update({
    where: { id: integration.id },
    data: { lastSyncedAt: new Date() },
  });
}

/**
 * Delete a Google Calendar event by its event ID.
 * A 404 from Google (already deleted) is treated as success.
 */
export async function deleteCalendarEvent(
  googleEventId: string,
  integration: CalendarIntegration,
): Promise<void> {
  const accessToken = await getAccessToken(integration);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.googleCalendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Calendar event deletion failed: ${errText}`);
  }
}

/**
 * Return the current connection status for a workspace member.
 */
export async function getIntegrationStatus(
  workspaceId: string,
  memberId: string,
): Promise<{ connected: boolean; email?: string; connectedAt?: Date }> {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { workspaceId, memberId, isActive: true },
    select: { googleEmail: true, connectedAt: true },
  });

  if (!integration) return { connected: false };

  return {
    connected: true,
    email: integration.googleEmail,
    connectedAt: integration.connectedAt,
  };
}

/**
 * Permanently remove the calendar integration for a workspace member.
 */
export async function disconnect(
  workspaceId: string,
  memberId: string,
): Promise<void> {
  await prisma.calendarIntegration.deleteMany({
    where: { workspaceId, memberId },
  });
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function _updateEvent(
  googleEventId: string,
  task: Task,
  calendarId: string,
  accessToken: string,
  assigneeEmail?: string,
): Promise<void> {
  const eventBody = buildEventBody(task, assigneeEmail);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Calendar event update failed: ${errText}`);
  }
}

function buildEventBody(
  task: Task,
  assigneeEmail?: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: task.title,
    description: task.description || "",
  };

  if (task.dueDate) {
    // All-day event on the due date
    const dateStr = task.dueDate.toISOString().split("T")[0];
    body.start = { date: dateStr };
    body.end = { date: dateStr };
  } else {
    // No due date — default to today (all-day)
    const today = new Date().toISOString().split("T")[0];
    body.start = { date: today };
    body.end = { date: today };
  }

  if (assigneeEmail) {
    body.attendees = [{ email: assigneeEmail }];
  }

  return body;
}

/**
 * Fire-and-forget helper: sync a task to Google Calendar if the
 * assignee has an active connection. Used as a post-create/update hook
 * in the tasks service.
 */
export async function maybeSyncTask(
  workspaceId: string,
  assigneeId: string,
  task: { id: string },
): Promise<void> {
  // syncTaskToCalendar already handles errors internally and returns null on failure
  await syncTaskToCalendar(task.id, workspaceId, assigneeId);
}
