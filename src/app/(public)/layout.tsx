import Footer from "@/components/Footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main id="main-content" className="flex flex-col w-full flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
