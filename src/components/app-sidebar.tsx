"use client";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronsUpDown,
  Crown,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LogOut,
  Package,
  Scale,
  ShieldCheck,
  ShoppingCart,
  User,
  UserRoundCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session-provider";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();

  const formatDate = (date: Date) => date.toISOString().split("T")[0];
  const today = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const from = formatDate(today);
  const to = formatDate(in7);

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
      title: "Om oss / Lärare",
      url: "/admin/omoss",
      icon: UserRoundCog,
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
      title: "Användare",
      url: "/admin/users",
      icon: ShieldCheck,
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Crown className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MotionZone</span>
                  <span className="truncate text-xs">Adminpanelen</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isItemActive(item.url)}
                    tooltip={item.title}
                  >
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
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {user?.name ? getInitials(user.name) : "AD"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name ?? "Admin"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {user?.name ? getInitials(user.name) : "AD"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.name ?? "Admin"}
                      </span>
                      <span className="truncate text-xs">
                        {user?.email ?? ""}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/user">
                    <User />
                    Min profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <ArrowLeft />
                    Tillbaka till sidan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          router.push("/");
                          router.refresh();
                        },
                      },
                    });
                  }}
                >
                  <LogOut />
                  Logga ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
