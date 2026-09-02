import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { isAdminOrTeacherRole } from "@/lib/actions/admin";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allowed = await isAdminOrTeacherRole();
  if (!allowed) return notFound();

  return (
    <SidebarProvider className="relative flex-1 !min-h-0">
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0">
        <div className="flex items-center gap-2 px-2 py-1">
          <SidebarTrigger className="size-9" />
          <h2 className="text-sm font-semibold tracking-wide">Adminpanelen</h2>
        </div>
        <main id="main-content" className="min-h-[33vh] flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
