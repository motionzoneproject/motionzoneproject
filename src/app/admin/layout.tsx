import AdminPanel from "@/components/AdminPanel";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <AdminPanel />
      {children}
    </div>
  );
}
