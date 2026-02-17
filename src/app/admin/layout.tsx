import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebarTrigger } from "./AdminSidebarTrigger";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider className="relative min-h-0">
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="sticky top-2 z-51">
          <AdminSidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
