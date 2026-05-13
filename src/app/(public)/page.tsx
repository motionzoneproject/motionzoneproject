import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import StudioLocation from "@/components/studio-location";
import { getStartPageContent } from "@/lib/actions/start-page-actions";
import prisma from "@/lib/prisma";
import Events from "./start/Events";
import Features from "./start/Features";
import Hero from "./start/Hero";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

// TODO(i18n): metadata strings are Swedish only. A future improvement is to
// read the `i18nextLng` cookie here (this is a server component) and switch
// title/description per locale. Alternates below hint at bilingual content.
export const metadata: Metadata = {
  title: "Motion Zone Växjö — Dans i Växjö",
  description:
    "Dansstudio i Växjö med kurser, klippkort och medlemskap för barn, ungdomar och vuxna. Boka enkelt online.",
  alternates: {
    canonical: SITE_URL,
    languages: { sv: SITE_URL, en: SITE_URL, "x-default": SITE_URL },
  },
  openGraph: {
    type: "website",
    title: "Motion Zone Växjö — Dans i Växjö",
    description:
      "Dansstudio i Växjö med kurser, klippkort och medlemskap. Hitta din stil och boka online.",
    url: SITE_URL,
    siteName: "MotionZone Växjö",
    locale: "sv_SE",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Motion Zone Växjö — Dans i Växjö",
    description:
      "Dansstudio i Växjö med kurser, klippkort och medlemskap. Boka online.",
  },
};

export default async function Page() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [events, startPageContent] = await Promise.all([
    prisma.event.findMany({
      where: {
        showOnStartpage: true,
        OR: [
          { endDate: { gte: today } },
          { endDate: null, startDate: { gte: today } },
        ],
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    }),
    getStartPageContent(),
  ]);

  // NOTE: address values are duplicated from src/components/studio-location.tsx.
  // TODO: extract into a `StudioLocation` model + Prisma row when the studio
  // ever moves or opens a second venue.
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Motion Zone Växjö",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-dark.png`,
    sameAs: ["https://instagram.com/motionzonevaxjo"],
  };

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "DanceSchool",
    name: "Motion Zone Växjö",
    url: SITE_URL,
    image: `${SITE_URL}/hero.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Smedsvängen 70",
      postalCode: "352 54",
      addressLocality: "Växjö",
      addressCountry: "SE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 56.852854,
      longitude: 14.820693,
    },
    areaServed: "Växjö",
    sameAs: ["https://instagram.com/motionzonevaxjo"],
  };

  return (
    <div className="flex-1 bg-background">
      <JsonLd data={[organizationLd, localBusinessLd]} />
      <Hero content={startPageContent} />
      <Features content={startPageContent} />
      <Events events={events} />
      <StudioLocation />
    </div>
  );
}
