import type { ReactNode } from "react";
import type { MentionableMember } from "../api/auth";

// ── Mention syntax ──────────────────────────────────────────────
// Mentions are encoded in notes / activity bodies as:
//   @[שם המשתמש](memberId)
// The memberId is the WorkspaceMember.id (not userId) — that way the server
// can authorize the mention against the workspace in one lookup.
//
// The regex is liberal on the id portion (accepts any uuid-ish token) so
// copy/pasted mentions from other environments still render correctly.

const MENTION_REGEX = /@\[([^\]]+)\]\(([0-9a-fA-F-]{8,})\)/g;

export interface ParsedMention {
  name: string;
  memberId: string;
}

export function parseMentions(content: string): ParsedMention[] {
  if (!content) return [];
  const seen = new Set<string>();
  const out: ParsedMention[] = [];
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
 * Render a string that may contain `@[name](memberId)` tokens as a list of
 * React nodes, replacing each mention with a Monday-blue pill.
 *
 * If the memberId resolves in the `members` lookup we use that member's live
 * name (so renames propagate). Otherwise we fall back to the name captured
 * in the mention token itself — so a note still renders after the mentioned
 * member is removed from the workspace.
 */
export function renderWithMentions(
  content: string,
  members?: MentionableMember[] | null,
  opts?: { onMentionClick?: (memberId: string) => void },
): ReactNode[] {
  if (!content) return [];

  const byId = new Map<string, MentionableMember>(
    (members ?? []).map((m) => [m.id, m]),
  );

  const nodes: ReactNode[] = [];
  let cursor = 0;
  // Local regex instance — do not share MENTION_REGEX lastIndex with parse.
  const rx = /@\[([^\]]+)\]\(([0-9a-fA-F-]{8,})\)/g;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = rx.exec(content)) !== null) {
    const [full, tokenName, memberId] = match;
    if (match.index > cursor) {
      nodes.push(content.slice(cursor, match.index));
    }
    const member = byId.get(memberId);
    const label = member?.name ?? tokenName;
    nodes.push(
      <span
        key={`m-${key++}-${memberId}`}
        role={opts?.onMentionClick ? "button" : undefined}
        tabIndex={opts?.onMentionClick ? 0 : undefined}
        onClick={
          opts?.onMentionClick
            ? (e) => {
                e.stopPropagation();
                opts.onMentionClick!(memberId);
              }
            : undefined
        }
        title={member?.email ?? label}
        className="inline-flex items-center bg-[#E6F4FF] text-[#0073EA] px-1 rounded font-medium"
        style={{ cursor: opts?.onMentionClick ? "pointer" : undefined }}
      >
        @{label}
      </span>,
    );
    cursor = match.index + full.length;
  }

  if (cursor < content.length) {
    nodes.push(content.slice(cursor));
  }

  return nodes;
}
