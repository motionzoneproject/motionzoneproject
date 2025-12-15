import SearchBar from "@/components/seachback";

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <SearchBar />
      {children}
    </div>
  );
}
