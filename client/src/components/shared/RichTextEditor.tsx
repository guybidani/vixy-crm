import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link as LinkIcon,
  AlignRight,
  AlignCenter,
  AlignLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder: _placeholder = "התחל לכתוב...",
  readOnly = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#0073EA] underline cursor-pointer",
          rel: "noopener noreferrer",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3",
          "prose-headings:text-[#323338] prose-p:text-[#323338] prose-li:text-[#323338]",
          "[direction:rtl] [text-align:right]",
        ),
        dir: "rtl",
      },
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  if (readOnly) {
    return (
      <div
        className={cn(
          "rounded-[4px] border border-[#E6E9EF] bg-white",
          className,
        )}
      >
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[4px] border border-[#E6E9EF] bg-white overflow-hidden focus-within:border-[#0073EA] transition-colors",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#E6E9EF] bg-[#F5F6F8]/30 flex-wrap">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#E6E9EF] mx-1" />

        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Heading 1"
        >
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Heading 2"
        >
          <Heading2 size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#E6E9EF] mx-1" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered List"
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#E6E9EF] mx-1" />

        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
        >
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
        >
          <AlignLeft size={15} />
        </ToolbarButton>

        <div className="w-px h-5 bg-[#E6E9EF] mx-1" />

        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              const raw = prompt("הזן כתובת URL:");
              if (raw) {
                const trimmed = raw.trim();
                // Block dangerous protocols
                if (/^(javascript|data|vbscript|blob):/i.test(trimmed)) return;
                // Allow safe protocols as-is; otherwise auto-prefix https://
                const safeUrl = /^(https?:\/\/|mailto:|\/)/i.test(trimmed)
                  ? trimmed
                  : `https://${trimmed}`;
                editor.chain().focus().setLink({ href: safeUrl }).run();
              }
            }
          }}
          title="Link"
        >
          <LinkIcon size={15} />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-[#0073EA]/10 text-[#0073EA]"
          : "text-[#9699A6] hover:bg-[#F5F6F8] hover:text-[#323338]",
      )}
    >
      {children}
    </button>
  );
}
