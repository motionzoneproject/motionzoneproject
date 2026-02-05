import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Home,
  Image as ImageIcon,
  Package,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isAdminRole } from "@/lib/actions/admin";

// Menu items.
const items = [
  {
    title: "Översikt",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Lektioner",
    url: "/admin/lectures",
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
    url: "/admin/courses",
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
];

export async function AppSidebar() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
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
