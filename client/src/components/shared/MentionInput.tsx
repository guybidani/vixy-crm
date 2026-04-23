import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { listMentionableMembers, type MentionableMember } from "../../api/auth";
import { getInitials } from "../../utils/avatar";

// ── MentionInput ──────────────────────────────────────────────────────────
// A controlled <textarea> that surfaces an @-trigger dropdown of workspace
// members. Selecting a member inserts `@[שם](memberId)` into the text at
// the cursor. Arrow keys navigate, Enter / Tab selects, Escape dismisses.
//
// The component is intentionally textarea-only (no contentEditable) so that:
//   • value stays a plain string (easy to submit, diff, cache)
//   • RTL/Hebrew caret behavior matches what users already expect from the
//     existing textareas elsewhere in the product
//   • cursor positioning math stays straightforward
//
// For display (highlighted blue pills) use `renderWithMentions` from
// utils/mentions.tsx alongside this component.

export interface MentionInputHandle {
  focus: () => void;
  blur: () => void;
}

export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  minHeight?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Override the members list (skips the network fetch). Handy for tests. */
  members?: MentionableMember[];
  /** Hide members matching this id (typically the current user). */
  excludeMemberIds?: string[];
}

const MENTION_ITEM_HEIGHT = 44;
const MAX_VISIBLE_ITEMS = 6;

/**
 * Very small fuzzy-ish matcher — case-insensitive "contains", bias toward
 * prefix hits. We intentionally avoid a proper fuzzy lib: workspaces rarely
 * exceed a few hundred members and the simple matcher is plenty fast.
 */
function scoreMatch(query: string, member: MentionableMember): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const name = member.name.toLowerCase();
  const email = member.email.toLowerCase();

  if (name === q) return 1000;
  if (name.startsWith(q)) return 500;
  if (name.includes(q)) return 250;
  // Allow matching by any token of a multi-word name (e.g. "דני" matching "דני לוי")
  const tokens = name.split(/\s+/);
  if (tokens.some((t) => t.startsWith(q))) return 200;
  if (email.startsWith(q)) return 150;
  if (email.includes(q)) return 75;
  return 0;
}

interface MentionContext {
  /** Characters typed after @ up to the caret (the search query). */
  query: string;
  /** Absolute offset in `value` where the @ character sits. */
  triggerIndex: number;
}

/**
 * Scan backwards from the caret to find an open `@` trigger. Returns null if
 * the caret is not currently inside a mention-in-progress. A trigger is only
 * valid if:
 *   • there is an `@` before the caret in the current word
 *   • preceded by start-of-string, whitespace, or punctuation
 *   • no whitespace between the `@` and the caret
 *   • query length so far ≤ 30 chars (guard against runaway scans)
 */
function findActiveMention(
  text: string,
  caret: number,
): MentionContext | null {
  if (caret === 0) return null;
  // Walk back at most 30 chars looking for an @
  const hardLimit = Math.max(0, caret - 30);
  for (let i = caret - 1; i >= hardLimit; i--) {
    const ch = text[i];
    if (ch === "@") {
      // Check the char before @ — must be SOL or whitespace/punctuation
      const prev = i > 0 ? text[i - 1] : "";
      if (i === 0 || /\s|[.,;:!?\n\r\t(]/.test(prev)) {
        return { triggerIndex: i, query: text.slice(i + 1, caret) };
      }
      return null;
    }
    // If we hit whitespace before finding an @, the user is not mid-mention.
    if (/\s/.test(ch)) return null;
  }
  return null;
}

// ── Cursor coordinates ────────────────────────────────────────────────────
// The dropdown floats at the caret. getBoundingClientRect on a <textarea>
// gives us the element box, not the caret — so we build a hidden mirror div
// that renders the textarea's text up to the caret and use the position of
// a marker span at the end of that mirror.
//
// This technique is used by every "@-mention" library (Slack, Linear, etc.)
// because there's no native API for caret-xy in a textarea.

function getCaretCoords(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number } {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);

  // Copy the relevant style properties so the mirror text wraps like the
  // real textarea would.
  const props = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "direction",
  ] as const;

  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";

  for (const prop of props) {
    (mirror.style as any)[prop] = (style as any)[prop];
  }

  document.body.appendChild(mirror);

  const value = textarea.value.substring(0, position);
  mirror.textContent = value;

  const marker = document.createElement("span");
  marker.textContent = textarea.value.substring(position) || ".";
  mirror.appendChild(marker);

  const textareaRect = textarea.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  const top =
    textareaRect.top +
    (markerRect.top - mirrorRect.top) -
    textarea.scrollTop;
  const left =
    textareaRect.left +
    (markerRect.left - mirrorRect.left) -
    textarea.scrollLeft;

  document.body.removeChild(mirror);

  return { top, left };
}

export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  function MentionInput(props, ref) {
    const {
      value,
      onChange,
      onSubmit,
      placeholder,
      rows = 3,
      minHeight = 80,
      autoFocus,
      disabled,
      className,
      style,
      members: membersOverride,
      excludeMemberIds,
    } = props;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mention, setMention] = useState<MentionContext | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
      null,
    );

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }));

    // ── Members fetch ──
    // Cached for the entire session — the dropdown opens/closes constantly
    // and we never want a network hit on keystroke.
    const { data } = useQuery({
      queryKey: ["workspace-members-mentions"],
      queryFn: listMentionableMembers,
      enabled: !membersOverride,
      staleTime: 5 * 60 * 1000,
    });

    const allMembers: MentionableMember[] =
      membersOverride ?? data?.members ?? [];

    // ── Filter + rank by current query ──
    const filtered = useMemo(() => {
      const excluded = new Set(excludeMemberIds ?? []);
      const q = mention?.query ?? "";
      return allMembers
        .filter((m) => !excluded.has(m.id))
        .map((m) => ({ member: m, score: scoreMatch(q, m) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((x) => x.member);
    }, [allMembers, excludeMemberIds, mention?.query]);

    // Reset selection whenever the filtered set changes (e.g. typing).
    useEffect(() => {
      setSelectedIndex(0);
    }, [mention?.query, filtered.length]);

    // ── Input handlers ──
    const closeDropdown = useCallback(() => {
      setMention(null);
      setAnchor(null);
    }, []);

    const updateMentionContext = useCallback(
      (textarea: HTMLTextAreaElement) => {
        const caret = textarea.selectionStart ?? textarea.value.length;
        const ctx = findActiveMention(textarea.value, caret);
        setMention(ctx);
        if (ctx) {
          const coords = getCaretCoords(textarea, ctx.triggerIndex);
          setAnchor(coords);
        } else {
          setAnchor(null);
        }
      },
      [],
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // defer so value state updates before we compute context
      requestAnimationFrame(() => {
        if (textareaRef.current) updateMentionContext(textareaRef.current);
      });
    };

    const handleSelect = () => {
      if (textareaRef.current) updateMentionContext(textareaRef.current);
    };

    const insertMention = useCallback(
      (member: MentionableMember) => {
        if (!mention || !textareaRef.current) return;
        const textarea = textareaRef.current;
        const caret =
          textarea.selectionStart ?? mention.triggerIndex + mention.query.length + 1;
        const before = value.slice(0, mention.triggerIndex);
        const after = value.slice(caret);
        const token = `@[${member.name}](${member.id}) `;
        const next = `${before}${token}${after}`;
        onChange(next);
        closeDropdown();
        // Restore caret position to immediately after the inserted token.
        const nextCaret = before.length + token.length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(nextCaret, nextCaret);
        });
      },
      [mention, onChange, value, closeDropdown],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit shortcut (Ctrl/Cmd+Enter) — only fire when dropdown is closed
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !mention) {
        e.preventDefault();
        onSubmit?.();
        return;
      }

      if (mention && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filtered.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (i) => (i - 1 + filtered.length) % filtered.length,
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filtered[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeDropdown();
          return;
        }
      }
    };

    const handleBlur = () => {
      // Delay so a mousedown on a dropdown item registers before we close.
      setTimeout(() => closeDropdown(), 120);
    };

    useEffect(() => {
      if (autoFocus) {
        textareaRef.current?.focus();
      }
    }, [autoFocus]);

    // ── Render ──
    const dropdownHeight = Math.min(
      filtered.length * MENTION_ITEM_HEIGHT,
      MAX_VISIBLE_ITEMS * MENTION_ITEM_HEIGHT,
    );

    // Anchor the dropdown below the @ by one line-height-ish.
    const dropdownTop = anchor ? anchor.top + 22 : 0;
    // RTL: open dropdown flush with the @ — no offset needed.
    const dropdownLeft = anchor?.left ?? 0;

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          className={
            className ??
            "w-full p-3 text-sm resize-none focus:outline-none"
          }
          style={{
            color: "#323338",
            minHeight,
            ...style,
          }}
          dir="rtl"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          onBlur={handleBlur}
          rows={rows}
          disabled={disabled}
        />

        {mention && filtered.length > 0 && anchor && (
          <div
            // Fixed positioning so the dropdown isn't clipped by overflow:
            // hidden ancestors (tabs, side panels, etc.).
            className="fixed z-[1000] bg-white rounded-lg shadow-lg overflow-y-auto border"
            style={{
              top: dropdownTop,
              left: dropdownLeft,
              width: 260,
              maxHeight: dropdownHeight,
              borderColor: "#E6E9EF",
            }}
            dir="rtl"
            // Prevent mousedown from stealing focus (which would blur the
            // textarea and close the dropdown before click fires).
            onMouseDown={(e) => e.preventDefault()}
          >
            {filtered.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className="w-full flex items-center gap-2 px-3 py-2 text-right transition-colors"
                style={{
                  background:
                    idx === selectedIndex ? "#F6F7FB" : "transparent",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: m.avatarColor }}
                >
                  {getInitials(m.name || m.email)}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "#323338" }}
                  >
                    {m.name}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: "#676879" }}
                  >
                    {m.email}
                  </div>
                </div>
                {m.role && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      background: "#F6F7FB",
                      color: "#676879",
                    }}
                  >
                    {m.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default MentionInput;
