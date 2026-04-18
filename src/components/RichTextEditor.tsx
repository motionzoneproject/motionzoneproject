"use client";

import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  UnderlineIcon,
  Undo,
} from "lucide-react";
import { useEffect } from "react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "minimal" | "full";
};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  variant = "minimal",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const { from, to } = editor.state.selection;
    const url = window.prompt("URL", previousUrl ?? "");
    if (url === null) return;

    // Restore selection that was lost when the prompt stole focus
    editor.chain().focus().setTextSelection({ from, to }).run();

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (from === to) {
      // No text selected — insert the URL as linked text
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      // Text is selected — apply link to selection
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div
      className={cn("rounded-md border border-input bg-background", className)}
    >
      <div className="flex flex-wrap gap-1 border-b border-input p-2">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        {variant === "full" && (
          <Toggle
            size="sm"
            pressed={editor.isActive("underline")}
            onPressedChange={() =>
              editor.chain().focus().toggleUnderline().run()
            }
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
        )}
        {variant === "full" && (
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 1 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            aria-label="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Toggle>
        )}
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          aria-label="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        {variant === "full" && (
          <Toggle
            size="sm"
            pressed={editor.isActive("blockquote")}
            onPressedChange={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            aria-label="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </Toggle>
        )}
        <Toggle
          size="sm"
          pressed={editor.isActive("link")}
          onPressedChange={setLink}
          aria-label="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
        {variant === "full" && (
          <Toggle
            size="sm"
            onPressedChange={() =>
              editor.chain().focus().setHorizontalRule().run()
            }
            aria-label="Horizontal Rule"
          >
            <Minus className="h-4 w-4" />
          </Toggle>
        )}
        <div className="ml-auto flex gap-1">
          <Toggle
            size="sm"
            onPressedChange={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            onPressedChange={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
