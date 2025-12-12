import AdminPanel from "@/components/AdminPanel";

export default function AdminRootLayout({
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
