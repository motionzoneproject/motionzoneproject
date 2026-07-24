import DOMPurify from "isomorphic-dompurify";
import type { Metadata } from "next";
import Image from "next/image";
import DansStilar from "@/components/dans-stilar";
import LarareProfile from "@/components/larare-profile";
import JsonLd from "@/components/seo/JsonLd";
import { getStudios } from "@/lib/actions/studio-actions";
import { getStyles } from "@/lib/actions/style-actions";
import { pick } from "@/lib/i18n/pick";
import { getDictionary } from "@/locales/get-dictionary";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

// TODO(i18n): switch by cookie when bilingual metadata is wired in.
export const metadata: Metadata = {
  title: "Om oss",
  description:
    "Lär känna MotionZone Växjö — våra studios, dansstilar och lärare.",
  alternates: {
    canonical: `${SITE_URL}/about`,
    languages: {
      sv: `${SITE_URL}/about`,
      en: `${SITE_URL}/about`,
      "x-default": `${SITE_URL}/about`,
    },
  },
  openGraph: {
    type: "website",
    title: "Om oss — Motion Zone Växjö",
    description:
      "Lär känna Motion Zone Växjö: våra studios, dansstilar och lärare.",
    url: `${SITE_URL}/about`,
    siteName: "MotionZone Växjö",
    locale: "sv_SE",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Om oss — Motion Zone Växjö",
    description:
      "Lär känna Motion Zone Växjö: våra studios, dansstilar och lärare.",
  },
};

export default async function About() {
  const { lang, t } = await getDictionary();
  const [studios, styles] = await Promise.all([getStudios(), getStyles()]);
  const activeStudios = studios.filter((studio) => studio.active);
  const studioContentMaxWidth = Math.min(
    activeStudios.length * 500 + Math.max(activeStudios.length - 1, 0) * 24,
    1152,
  );

  const aboutPageLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Om Motion Zone Växjö",
    url: `${SITE_URL}/about`,
    inLanguage: "sv-SE",
    about: {
      "@type": "Organization",
      name: "Motion Zone Växjö",
      url: SITE_URL,
    },
  };

  return (
    <div className="bg-background">
      <JsonLd data={aboutPageLd} />
      {/* Hero */}
      <section className="border-b border-border py-8 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="mb-2 animate-fade-in-left text-3xl font-light leading-[1.1] tracking-tight text-foreground [animation-delay:200ms] md:text-4xl">
            {t.about.heroTitleLine1}
            <span className="font-serif italic text-brand-light">
              {" "}
              {t.about.heroTitleAccent}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t.about.heroSubtitle}
          </p>
        </div>
      </section>

      <LarareProfile />
      <DansStilar styles={styles} />

      {/* Studio */}
      <section className="bg-muted/50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-4 text-4xl md:text-3xl font-black text-foreground">
            {t.about.studiosTitle}
          </h2>
          {activeStudios.length === 0 ? (
            <p className="mb-8 text-muted-foreground">{t.about.studiosEmpty}</p>
          ) : (
            <div
              className="mx-auto w-full max-w-full"
              style={{ maxWidth: `${studioContentMaxWidth}px` }}
            >
              <div className="flex flex-wrap justify-center gap-6">
                {activeStudios.map((studio) => {
                  const studioName = pick(studio, "name", lang) as string;
                  const studioDescription = pick(
                    studio,
                    "description",
                    lang,
                  ) as string;
                  return (
                    <div
                      key={studio.id}
                      className="flex w-125 max-w-full flex-col items-center rounded-lg border-2 border-border p-6 text-center hover:border-brand/40 hover:shadow-xl hover:shadow-brand/10 hover:-translate-y-1 transition-all duration-300"
                    >
                      {studio.imageUrl && (
                        <Image
                          src={studio.imageUrl}
                          alt={studioName}
                          height={220}
                          width={420}
                          className="mb-4 h-55 w-full rounded-lg object-cover"
                        />
                      )}
                      <h3 className="text-lg font-semibold">{studioName}</h3>
                      <div className="mt-2 text-muted-foreground whitespace-pre-line">
                        <div
                          className="prose dark:prose-invert max-w-none"
                          // biome-ignore lint/security/noDangerouslySetInnerHtml: TipTap content sanitized through DOMPurify on the line above
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(studioDescription),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative mt-6 overflow-hidden rounded-2xl border border-brand/30 bg-brand/10 p-7 backdrop-blur-sm">
            <div className="absolute top-0 left-0 h-full w-1 rounded-l-2xl bg-brand" />
            <p className="text-xl  leading-snug text-foreground">
              {t.about.welcomePrefix}{" "}
              <span className="font-serif italic text-brand-light">
                {t.about.welcomeAccent}
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
