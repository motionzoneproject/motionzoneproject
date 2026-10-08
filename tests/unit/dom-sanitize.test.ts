import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "@/lib/dom-sanitize";

describe("sanitizeRichText", () => {
  it("returnerar tom sträng för tomt innehåll", async () => {
    expect(await sanitizeRichText(null)).toBe("");
    expect(await sanitizeRichText(undefined)).toBe("");
    expect(await sanitizeRichText("   ")).toBe("");
  });

  it("tar bort script-taggar och deras innehåll", async () => {
    const out = await sanitizeRichText(
      "<p>Hej</p><script>alert(1)</script><SCRIPT src=//evil.example></SCRIPT>",
    );
    expect(out).toBe("<p>Hej</p>");
  });

  it("tar bort händelseattribut", async () => {
    const out = await sanitizeRichText(
      '<p onclick="alert(1)" onmouseover="alert(2)">Text</p><img src=x onerror=alert(1)>',
    );
    expect(out).toBe("<p>Text</p>");
    expect(out).not.toMatch(/onerror|onclick|<img/i);
  });

  it("tar bort javascript:-länkar, även med blandad skiftläge och entiteter", async () => {
    for (const href of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "java&#x09;script:alert(1)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    ]) {
      const out = await sanitizeRichText(`<a href="${href}">klick</a>`);
      expect(out).not.toMatch(/javascript:|data:/i);
      expect(out).toContain("klick");
    }
  });

  it("tar bort svg, iframe, style, form och object", async () => {
    const out = await sanitizeRichText(
      '<svg onload="alert(1)"><circle/></svg><iframe src="https://evil.example"></iframe>' +
        '<style>body{display:none}</style><form action="/x"><input name=a></form>' +
        '<object data="x"></object><p>kvar</p>',
    );
    expect(out).toBe("<p>kvar</p>");
  });

  it("tar bort style- och id-attribut men behåller texten", async () => {
    const out = await sanitizeRichText(
      '<p style="color:red" id="x" class="y">Text</p>',
    );
    expect(out).toBe("<p>Text</p>");
  });

  it("packar upp otillåtna taggar men behåller innehållet", async () => {
    expect(await sanitizeRichText("<div><span>Hej</span></div>")).toBe("Hej");
  });

  it("behåller tillåten formatering", async () => {
    const html =
      "<h1>R</h1><h2>U</h2><h3>B</h3><p><strong>fet</strong> <em>kursiv</em> <u>under</u><br></p>" +
      "<hr><ul><li>a</li></ul><ol><li>b</li></ol><blockquote>citat</blockquote>";
    expect(await sanitizeRichText(html)).toBe(html);
  });

  it("behåller vanliga länkar med href, target och rel", async () => {
    const html =
      '<a href="https://example.com/sida" target="_blank" rel="noopener noreferrer">länk</a>';
    expect(await sanitizeRichText(html)).toBe(html);
    expect(await sanitizeRichText('<a href="mailto:a@b.se">mejl</a>')).toBe(
      '<a href="mailto:a@b.se">mejl</a>',
    );
  });
});
