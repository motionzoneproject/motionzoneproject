"use server";

import isomorphicDOMPurify from "isomorphic-dompurify";

//Ska matcha det vi använder:
const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "strong",
  "em",
  "u",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

export async function sanitizeRichText(
  html: string | null | undefined,
): Promise<string> {
  if (!html || html.trim() === "") return "";
  return isomorphicDOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
