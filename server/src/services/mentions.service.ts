import { prisma } from "../db/client";
import {
  parseMentions,
  mentionExcerpt,
  entityLink,
} from "../utils/mentions.util";
import * as notificationService from "./notification.service";

interface DispatchParams {
  workspaceId: string;
  authorMemberId: string;
  entityType: string;
  entityId: string;
  content: string;
}

/**
 * Parse @[Name](memberId) mentions out of a note/activity body and fan out
 * in-app notifications of type MENTION to each mentioned workspace member.
 *
 * Safety rules:
 *  - Mentions are filtered to members who actually belong to this workspace
 *    (prevents a bad actor from crafting a fake memberId to ping someone in
 *    another tenant).
 *  - Self-mentions are skipped.
 *  - A mention of the same member appearing multiple times in one note still
 *    produces a single notification (dedup done by parseMentions).
 *  - Fire-and-forget: failures are logged but never bubble up — the note
 *    creation itself must not fail because notification dispatch hiccuped.
 */
export async function dispatchMentionNotifications(
  params: DispatchParams,
): Promise<void> {
  const {
    workspaceId,
    authorMemberId,
    entityType,
    entityId,
    content,
  } = params;

  const mentions = parseMentions(content);
  if (mentions.length === 0) return;

  try {
    // Resolve memberIds → userIds, scoped to this workspace. This both
    // authorizes the mention and gets the userId we need for the Notification
    // row (Notification is keyed by userId, not workspaceMember.id).
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        id: { in: mentions.map((m) => m.memberId) },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { name: true } },
      },
    });

    if (members.length === 0) return;

    // Look up the author once so we can say "X mentioned you". Cheap because
    // the author row is almost always already in the Prisma query cache.
    const author = await prisma.workspaceMember.findFirst({
      where: { id: authorMemberId, workspaceId },
      select: { user: { select: { name: true } } },
    });
    const authorName = author?.user?.name ?? "משתמש";

    const excerpt = mentionExcerpt(content);
    const link = entityLink(entityType, entityId);

    await Promise.all(
      members
        // Don't ping the author for mentioning themselves.
        .filter((m) => m.id !== authorMemberId)
        .map((m) =>
          notificationService
            .create({
              workspaceId,
              userId: m.userId,
              type: "MENTION",
              title: `${authorName} הזכיר/ה אותך`,
              body: excerpt,
              entityType,
              entityId,
              metadata: { link, authorMemberId },
            })
            .catch((err) => {
              // eslint-disable-next-line no-console
              console.error("[mentions] notification create failed", {
                userId: m.userId,
                entityType,
                entityId,
                err,
              });
            }),
        ),
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mentions] dispatch failed", {
      workspaceId,
      entityType,
      entityId,
      err,
    });
  }
}
