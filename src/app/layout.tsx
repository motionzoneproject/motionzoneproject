import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
