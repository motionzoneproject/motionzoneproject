"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function AdminSidebarTrigger() {
  return (
    <SidebarTrigger
      className="h-10 !w-auto px-3 gap-2 after:content-['Admin']"
      aria-label="Toggle admin sidebar"
    />
  );
}
