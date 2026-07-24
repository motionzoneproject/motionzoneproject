import type { Metadata } from "next";
import "./globals.css";
import { Lora, Montserrat } from "next/font/google";
import { cookies, headers } from "next/headers";
import { CookieConsent } from "@/components/CookieConsent";
import NavBar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getCategories } from "@/lib/actions/server-actions";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/lib/session-provider";
import { LocalizationProvider, normalizeLang } from "@/locales";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

// SITE_URL falls back to http://localhost:3000 for local dev so OG/Twitter
// image URLs and sitemap entries resolve correctly without env config.
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MotionZone Växjö",
  description:
    "Dansstudio MotionZone Växjö - Köp och boka kurser och medlemskap.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "MotionZone Växjö",
    description: "MotionZone Växjö - Köp och boka danskurser",
    url: "https://motionzone.se",
    siteName: "MotionZone Växjö",
    images: [
      {
        url: "https://motionzone.se/LogoGP.jpg",
        width: 400,
        height: 100,
        alt: "MotionZone Växjö Dansstudio",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get("i18nextLng")?.value);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const categories = await getCategories();

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${lora.variable} ${montserrat.variable}`}
    >
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider
            session={session?.session ?? null}
            user={session?.user ?? null}
          >
            <LocalizationProvider lang={lang}>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring focus:outline-none"
              >
                Hoppa till huvudinnehållet
              </a>
              <NavBar categories={categories ?? []} />
              {children}
              <CookieConsent />
              <Toaster richColors position="top-center" />
            </LocalizationProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
