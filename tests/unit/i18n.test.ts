import { describe, expect, it } from "vitest";
import i18n from "@/locales/i18n";
import en from "@/locales/langs/en.json";
import sv from "@/locales/langs/sv.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("översättningar", () => {
  it("svenska och engelska har samma nycklar", () => {
    const svKeys = new Set(keys(sv));
    const enKeys = new Set(keys(en));
    expect([...svKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !svKeys.has(k))).toEqual([]);
  });

  it("interpolerar count på båda språken", async () => {
    for (const lng of ["sv", "en"]) {
      await i18n.changeLanguage(lng);
      const text = i18n.t("user.autobook.successCount", { count: 3 });
      expect(text).toContain("3");
      expect(text).not.toContain("{{");
      expect(text).not.toBe("user.autobook.successCount");
    }
  });
});
