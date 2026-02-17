import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { isAdminRole } from "@/lib/actions/admin";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  return (
    <SidebarProvider className="relative !min-h-0">
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="sticky top-2 z-51 flex items-center gap-2 px-2 py-1">
          <SidebarTrigger className="size-9" />
          <h2 className="text-sm font-semibold tracking-wide">Adminpanelen</h2>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
