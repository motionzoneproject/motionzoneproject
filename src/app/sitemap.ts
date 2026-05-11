import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

// Falls back to localhost so local builds and previews don't 404 on absolute URLs.
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

type StaticEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

// Locales are cookie-based (no path prefix), so all hreflang alternates resolve
// to the same canonical URL. This still helps search engines understand the
// site is bilingual.
const STATIC_ENTRIES: StaticEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/courses", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.6 },
  { path: "/signin", changeFrequency: "yearly", priority: 0.1 },
  { path: "/signup", changeFrequency: "yearly", priority: 0.1 },
];

function withAlternates(url: string) {
  return {
    languages: {
      sv: url,
      en: url,
      "x-default": url,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ENTRIES.map(
    ({ path, changeFrequency, priority }) => {
      const url = `${SITE_URL}${path}`;
      return {
        url,
        lastModified: now,
        changeFrequency,
        priority,
        alternates: withAlternates(url),
      };
    },
  );

  const legalPages = await prisma.legalPage.findMany({
    select: { slug: true, updatedAt: true },
  });

  const legalEntries: MetadataRoute.Sitemap = legalPages.map((page) => {
    const url = `${SITE_URL}/${page.slug}`;
    return {
      url,
      lastModified: page.updatedAt,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: withAlternates(url),
    };
  });

  return [...staticEntries, ...legalEntries];
}
