"use client";

import {
  BookOpen,
  CalendarDays,
  Crown,
  GraduationCap,
  Home,
  Image as ImageIcon,
  Package,
  Scale,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/session-provider";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();

  const formatDate = (date: Date) => date.toISOString().split("T")[0];
  const today = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const from = formatDate(today);
  const to = formatDate(in7);

  // Menu items.
  const items = [
    {
      title: "Översikt",
      url: "/admin",
      icon: Home,
    },
    {
      title: "Lektioner",
      url: `/admin/lectures?teacher=${user?.id}&from=${from}&to=${to}`,
      icon: BookOpen,
    },
    {
      title: "Startsida",
      url: "/admin/start",
      icon: Home,
    },
    {
      title: "Om oss",
      url: "/admin/omoss",
      icon: Sparkles,
    },
    {
      title: "Kurser",
      url: `/admin/courses?teacher=${user?.id}`,
      icon: GraduationCap,
    },
    {
      title: "Produkter",
      url: "/admin/products",
      icon: Package,
    },
    {
      title: "Ordrar",
      url: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      title: "Event",
      url: "/admin/events",
      icon: CalendarDays,
    },
    {
      title: "Galleri",
      url: "/admin/gallery",
      icon: ImageIcon,
    },
    {
      title: "Elever",
      url: "/admin/students",
      icon: Users,
    },
    {
      title: "Terminer / Scheman",
      url: "/admin/termin",
      icon: CalendarDays,
    },
    {
      title: "Juridiskt",
      url: "/admin/legal",
      icon: Scale,
    },
  ];

  const isItemActive = (url: string) => {
    const itemPath = url.split("?")[0];
    if (itemPath === "/admin") return pathname === "/admin";
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  };

  return (
    <Sidebar className="absolute! h-full!">
      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex gap-2 items-end py-2 mb-3">
              <Crown className="text-brand" />
              <span>Adminpanelen</span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                    <Link
                      href={item.url}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
