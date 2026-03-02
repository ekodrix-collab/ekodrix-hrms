"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { InboxBell } from "@/components/admin/inbox/inbox-bell";
import { Input } from "@/components/ui/input";

import { MobileNav } from "@/components/layout/mobile-nav";
import { adminNav, employeeNav, getNavLabel } from "@/components/layout/sidebar";

export function Header() {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const navGroups = isAdmin ? adminNav : employeeNav;
  const currentLabel =
    getNavLabel(pathname, navGroups) ?? (isAdmin ? "Admin Workspace" : "Employee Workspace");
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/78 backdrop-blur-2xl">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-4 lg:h-[74px] lg:px-8">
        <MobileNav />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black uppercase tracking-[0.1em] text-zinc-900 dark:text-zinc-100 lg:text-base">
            {currentLabel}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>{todayLabel}</span>
          </div>
        </div>

        <div className="relative hidden w-full max-w-md lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            className="border-none bg-zinc-100/70 pl-10 focus-visible:ring-1 focus-visible:ring-primary/40 dark:bg-zinc-800/60"
            placeholder="Search everything... (Ctrl + K)"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
            K
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <InboxBell />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

