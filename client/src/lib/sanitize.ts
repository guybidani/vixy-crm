import DOMPurify from "dompurify";

// Force rel="noopener noreferrer" on all anchor tags to prevent tab-nabbing
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("rel", "noopener noreferrer");
    // Block javascript: and data: protocol links
    const href = node.getAttribute("href") || "";
    if (!/^(https?:|mailto:|\/|#)/i.test(href)) {
      node.removeAttribute("href");
    }
  }
});

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe formatting tags (from rich text editors) but strips scripts and event handlers.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "b",
      "i",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
      "hr",
      "span",
      "div",
      "sub",
      "sup",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "title",
      "class",
      "style",
      "dir",
      "align",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
