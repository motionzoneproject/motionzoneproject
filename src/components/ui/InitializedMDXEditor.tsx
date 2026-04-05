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
import type { ForwardedRef } from "react";

export default function InitializedMDXEditor({
  editorRef,
  className,
  contentEditableClassName,
  plugins,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  const defaultPlugins = [
    toolbarPlugin({
      toolbarClassName: "border-b border-slate-300 bg-slate-100",
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
    <MDXEditor
      className={[
        "mail-mdx-editor light-theme w-full min-w-0 rounded-md border border-slate-300 bg-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      contentEditableClassName={[
        "prose max-w-none min-h-48 w-full min-w-0 bg-white px-4 py-3 text-slate-950",
        contentEditableClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      plugins={[...defaultPlugins, ...(plugins ?? [])]}
      {...props}
      ref={editorRef}
    />
  );
}
