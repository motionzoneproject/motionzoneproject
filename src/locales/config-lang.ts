export const allLangs = [
  {
    label: "Svenska",
    shortLabel: "SE",
    value: "sv",
    langCode: "sv-SE",
  },
  {
    label: "English",
    shortLabel: "EN",
    value: "en",
    langCode: "en-US",
  },
];

export const defaultLang = allLangs[0]; // Svenska

export type AppLang = "sv" | "en";

export function normalizeLang(value?: string | null): AppLang {
  return value === "en" ? "en" : "sv";
}
