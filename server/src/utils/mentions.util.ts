// Shared helpers for parsing @[Name](memberId) mention syntax out of notes
// and activity bodies. Mirrors the regex used on the client so both sides
// stay in sync. UUID v4-ish match keeps the extraction strict — free-form
// ids are ignored to avoid treating random bracket/paren text as a mention.

const MENTION_REGEX =
  /@\[([^\]]+)\]\(([0-9a-fA-F-]{8,})\)/g;

export interface ParsedMention {
  name: string;
  memberId: string;
}

/**
 * Extract every @[Name](memberId) mention from a block of text.
 * Duplicate memberIds are de-duplicated (a single notification per user per
 * note is what users actually want — no one wants 5 pings from one note).
 */
export function parseMentions(content: string | null | undefined): ParsedMention[] {
  if (!content) return [];
  const seen = new Set<string>();
  const out: ParsedMention[] = [];
  // Reset regex lastIndex since we use the /g flag.
  MENTION_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_REGEX.exec(content)) !== null) {
    const [, name, memberId] = m;
    if (seen.has(memberId)) continue;
    seen.add(memberId);
    out.push({ name, memberId });
  }
  return out;
}

/**
 * Strip the @[…](…) syntax down to a plain @Name for use in email/notification
 * bodies where the raw markup would look ugly. Caps at maxLen chars for excerpt.
 */
export function mentionExcerpt(content: string, maxLen = 160): string {
  const plain = content.replace(MENTION_REGEX, (_all, name) => `@${name}`);
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen - 1).trimEnd() + "…";
}

/**
 * Map an entity type to the in-app link path. Used when building notification
 * metadata so the bell icon can navigate directly to the source item.
 */
export function entityLink(
  entityType: string,
  entityId: string,
): string {
  switch (entityType) {
    case "contact":
      return `/contacts/${entityId}`;
    case "deal":
      return `/deals/${entityId}`;
    case "company":
      return `/companies/${entityId}`;
    case "task":
      return `/tasks/${entityId}`;
    case "ticket":
      return `/tickets/${entityId}`;
    default:
      return `/${entityType}/${entityId}`;
  }
}
