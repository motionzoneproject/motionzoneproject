import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 w-full min-w-0">
        <div className="sticky top-2 z-40 px-2">
          <SidebarTrigger className="size-9" />
        </div>
        {children}
      </div>
    </SidebarProvider>
  );
}
