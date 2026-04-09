"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { useTheme } from "next-themes";
import type { ForwardedRef } from "react";

export default function InitializedMDXEditor({
  editorRef,
  className,
  contentEditableClassName,
  plugins,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  const { theme } = useTheme();

  const defaultPlugins = [
    toolbarPlugin({
      toolbarClassName:
        theme === "dark"
          ? "border-b border-border bg-card"
          : "border-b border-slate-300 bg-slate-100",
      toolbarContents: () => (
        <>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <Separator />
          <BoldItalicUnderlineToggles />
          <CreateLink />
          <Separator />
          <ListsToggle options={["bullet", "number"]} />
          <InsertTable />
          <InsertThematicBreak />
        </>
      ),
    }),
    headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    tablePlugin(),
  ];

  return (
    <div
      className={[
        "w-full min-w-0 overflow-hidden rounded-md border border-border bg-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <MDXEditor
        className={`mail-mdx-editor ${theme}-theme ${theme === "dark" ? " dark-editor" : ""}`}
        contentEditableClassName={[
          "prose dark:prose-invert max-w-none min-h-48 w-full min-w-0 bg-card px-4 py-3 text-card-foreground",
          contentEditableClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        plugins={[...defaultPlugins, ...(plugins ?? [])]}
        {...props}
        ref={editorRef}
      />
    </div>
  );
}
