"use client";

import { useTranslation } from "react-i18next";

export default function LangTest() {
  const { i18n } = useTranslation();

  return <div>Lang: {i18n.language}</div>;
}
