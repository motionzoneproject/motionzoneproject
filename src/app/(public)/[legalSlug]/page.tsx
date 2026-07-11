import DOMPurify from "isomorphic-dompurify";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import { getLegalPageBySlug } from "@/lib/actions/legal-actions";
import { normalizeLang } from "@/locales";
import { getDictionary } from "@/locales/get-dictionary";

const LEGAL_SLUGS = ["integritetspolicy", "cookiepolicy", "kopvillkor"];

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.SITE_URL ?? "http://localhost:3000");

type Props = {
  params: Promise<{ legalSlug: string }>;
};

export async function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ legalSlug: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legalSlug } = await params;
  const page = await getLegalPageBySlug(legalSlug);
  if (!page) return {};

  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get("i18nextLng")?.value);
  const title =
    lang === "en" && page.title_en && page.title_en.length > 0
      ? page.title_en
      : page.title;

  const url = `${SITE_URL}/${legalSlug}`;

  return {
    title,
    description: `${title} - MotionZone Växjö`,
    alternates: {
      canonical: url,
      languages: { sv: url, en: url, "x-default": url },
    },
    openGraph: {
      type: "article",
      title,
      description: `${title} - MotionZone Växjö`,
      url,
      siteName: "MotionZone Växjö",
      locale: lang === "en" ? "en_US" : "sv_SE",
    },
    twitter: {
      card: "summary",
      title,
      description: `${title} - MotionZone Växjö`,
    },
  };
}

export default async function LegalPage({ params }: Props) {
  const { legalSlug } = await params;

  console.log(`slug:${legalSlug}${LEGAL_SLUGS.includes(legalSlug)}`);

  if (!LEGAL_SLUGS.includes(legalSlug)) {
    notFound();
  }

  const page = await getLegalPageBySlug(legalSlug);

  if (!page) {
    notFound();
  }

  const { lang, t } = await getDictionary();

  const title =
    lang === "en" && page.title_en && page.title_en.length > 0
      ? page.title_en
      : page.title;
  const content =
    lang === "en" && page.content_en && page.content_en.length > 0
      ? page.content_en
      : page.content;
  const locale = lang === "en" ? "en-GB" : "sv-SE";
  const updatedLabel = t.legal.lastUpdated;

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: `${SITE_URL}/${legalSlug}`,
    inLanguage: locale,
    dateModified: page.updatedAt.toISOString(),
    isPartOf: {
      "@type": "WebSite",
      name: "Motion Zone Växjö",
      url: SITE_URL,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <JsonLd data={webPageLd} />
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {updatedLabel}:{" "}
        {page.updatedAt.toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <div
        className="prose dark:prose-invert max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: TipTap content sanitized through DOMPurify on the line above
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
      />
    </div>
  );
}
