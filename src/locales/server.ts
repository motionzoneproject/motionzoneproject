import { cookies } from "next/headers";
import translationEn from "./langs/en.json";
import translationSv from "./langs/sv.json";

const resources = { en: translationEn, sv: translationSv } as const;
type TranslationKey = keyof typeof translationSv;

export async function getT() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "sv";
  const lang = locale in resources ? (locale as keyof typeof resources) : "sv";
  const translations = resources[lang];

  return (key: TranslationKey) => translations[key] ?? key;
}
