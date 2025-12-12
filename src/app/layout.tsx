import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import Footer from "@/components/Footer";
import NavBar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/lib/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MotionZone Växjö",
  description:
    "Official Webbsite for dancestudio MotionZone Växjö - For buy and book courses and membership.",

  icons: {
    icon: "/favicon.ico", // Gör en favivon.
  },

  // Öppna grafdata för sociala medier (Open Graph)
  openGraph: {
    title: "MotionZone Växjö",
    description: "MotionZone Växjö - Buy and book dance courses",
    url: "https://motionzone.se",
    siteName: "MotionZone Växjö",
    images: [
      {
        url: "https://dinwebbplats.se/LogoGP.jpg",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider
          session={session?.session ?? null}
          user={session?.user ?? null}
        >
          <NavBar></NavBar>
          {children}
          <Footer></Footer>
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
