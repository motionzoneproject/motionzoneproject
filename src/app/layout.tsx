import type { Metadata } from "next";
import "./globals.css";
import { Lora, Montserrat } from "next/font/google";
import { headers } from "next/headers";
import { CookieConsent } from "@/components/CookieConsent";
import NavBar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/lib/session-provider";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <html
      lang="sv"
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
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring focus:outline-none"
            >
              Hoppa till huvudinnehållet
            </a>
            <NavBar />
            {children}
            <CookieConsent />
            <Toaster richColors position="top-center" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
