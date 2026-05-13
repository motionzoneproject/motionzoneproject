/**
 * Server component that renders a single JSON-LD <script> tag.
 *
 * The payload is sanitised by escaping any embedded "</" sequences (most
 * notably `</script>`) into `</` so attacker-controlled fields can never
 * break out of the script block. See
 * https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 */
type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload escaped above; React would otherwise HTML-encode the JSON.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
