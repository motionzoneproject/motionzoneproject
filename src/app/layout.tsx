import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";
import Footer from "@/components/Footer";
import NavBar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/lib/session-provider";

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
    <html lang="sv" suppressHydrationWarning>
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
            <NavBar />
            <div className="flex-1 flex flex-col">{children}</div>
            <Footer />
            <Toaster richColors position="top-center" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
