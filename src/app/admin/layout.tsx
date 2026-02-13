import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="sticky top-2 z-40 px-2 md:px-4">
          <SidebarTrigger className="size-9" />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
