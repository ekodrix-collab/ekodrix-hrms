"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  KanbanSquare,
  Users,
  MessageSquare,
  StickyNote,
  Settings,
  LogOut,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Zap,
  ListTodo,
  CalendarCheck,
  Inbox,
  LayoutGrid,
  KeyRound,
  Landmark
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, signOut } from "@/actions/auth";
import { getSidebarCountsAction } from "@/actions/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badgeKey?: "adminInbox" | "marketplace";
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const adminNav: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/inbox", label: "Action Inbox", icon: Inbox, badgeKey: "adminInbox" },
      { href: "/admin/chat", label: "Team Chat", icon: MessageSquare },
      { href: "/admin/projects", label: "Projects", icon: LayoutGrid },
      { href: "/admin/analytics", label: "Analytics", icon: Zap },
    ]
  },
  {
    group: "Management",
    items: [
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/standups", label: "Daily Standups", icon: ListTodo },
      { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
      { href: "/admin/leaves", label: "Leaves", icon: CalendarCheck },
      { href: "/admin/tasks", label: "All Tasks", icon: KanbanSquare },
    ]
  },
  {
    group: "Finance",
    items: [
      { href: "/admin/finance", label: "Company Treasury", icon: CreditCard },
      { href: "/admin/project-finance", label: "Project Finance", icon: LayoutGrid },
    ]
  },
  {
    group: "Knowledge",
    items: [
      { href: "/admin/vaults", label: "Vaults", icon: KeyRound },
    ]
  },
  {
    group: "Organization",
    items: [
      { href: "/admin/departments", label: "Departments", icon: Briefcase, disabled: true },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ]
  }
];

export const employeeNav: NavGroup[] = [
  {
    group: "Personal",
    items: [
      { href: "/employee/dashboard", label: "My Overview", icon: LayoutDashboard },
      { href: "/employee/projects", label: "My Projects", icon: LayoutGrid },
      { href: "/employee/marketplace", label: "Task Marketplace", icon: Zap, badgeKey: "marketplace" },
      { href: "/employee/attendance", label: "Clock In/Out", icon: CalendarDays },
      { href: "/employee/leaves", label: "My Leaves", icon: CalendarCheck },
      { href: "/employee/tasks", label: "My Tasks", icon: KanbanSquare },
      { href: "/employee/vaults", label: "Vaults", icon: KeyRound },
    ]
  },
  {
    group: "Finance",
    items: [
      { href: "/employee/finance", label: "My Earnings & Expenses", icon: CreditCard },
    ]
  },
  {
    group: "Collaboration",
    items: [
      { href: "/employee/chat", label: "Team Chat", icon: MessageSquare },
      { href: "/employee/team", label: "Directory", icon: Users },
      { href: "/employee/notes", label: "Personal Notes", icon: StickyNote },
    ]
  },
  {
    group: "Account",
    items: [
      { href: "/employee/profile", label: "Profile Settings", icon: Settings },
    ]
  }
];

export const employeeFounderNav: NavGroup[] = employeeNav.map((group) => {
  if (group.group !== "Finance") return group;
  return {
    ...group,
    items: [
      { href: "/employee/finance?tab=personal", label: "Personal Finance", icon: CreditCard },
      { href: "/employee/finance?tab=founder", label: "Company Treasury", icon: Landmark },
    ]
  };
});

type SearchParamsLike = {
  get: (name: string) => string | null;
} | null | undefined;

function splitHref(href: string) {
  const [path, queryString] = href.split("?");
  return {
    path,
    query: new URLSearchParams(queryString ?? "")
  };
}

export function getEmployeeNavByRole(role: string | null | undefined): NavGroup[] {
  return role === "founder" ? employeeFounderNav : employeeNav;
}

export function isNavItemActive(pathname: string, searchParams: SearchParamsLike, href: string): boolean {
  const { path, query } = splitHref(href);
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;

  if ([...query.keys()].length === 0) {
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  if (pathname !== path) return false;
  for (const [key, value] of query.entries()) {
    if ((searchParams?.get(key) ?? null) !== value) return false;
  }
  return true;
}

export function flattenNavItems(navGroups: NavGroup[]): NavItem[] {
  return navGroups.flatMap((group) => group.items).filter((item) => !item.disabled);
}

export function getNavLabel(pathname: string, navGroups: NavGroup[], searchParams?: SearchParamsLike): string | null {
  const navItems = flattenNavItems(navGroups);
  const exact = navItems.find((item) => isNavItemActive(pathname, searchParams, item.href));
  if (exact) return exact.label;

  const nestedMatch = navItems.find(
    (item) => {
      const { path, query } = splitHref(item.href);
      return [...query.keys()].length === 0 && pathname.startsWith(`${path}/`) && path !== "/";
    }
  );
  return nestedMatch?.label ?? null;
}

export function getPrimaryMobileNav(navGroups: NavGroup[]): NavItem[] {
  const navItems = flattenNavItems(navGroups);
  const hasEmployeeFinance = navItems.some((item) => item.href.startsWith("/employee/finance"));

  if (hasEmployeeFinance) {
    const priority = ["/employee/dashboard", "/employee/tasks", "/employee/finance", "/employee/attendance"];
    return priority
      .map((href) => navItems.find((item) => item.href === href || item.href.startsWith(`${href}?`)))
      .filter((item): item is NavItem => Boolean(item));
  }

  return navItems.slice(0, 4);
}

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const isAdmin = pathname.startsWith("/admin");

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
  });

  const { data: counts } = useQuery({
    queryKey: ["sidebar-counts"],
    queryFn: async () => {
      const res = await getSidebarCountsAction();
      return res.ok ? res.data : { adminInbox: 0, marketplace: 0 };
    },
    refetchInterval: 30000, // Refresh counts every 30s
  });

  const navGroups = isAdmin ? adminNav : getEmployeeNavByRole(user?.profile?.role);

  return (
    <aside className="glass-panel sticky top-3 z-20 hidden h-[calc(100vh-1.5rem)] w-[300px] shrink-0 flex-col overflow-hidden rounded-3xl lg:mx-3 lg:flex">
      <div className="flex h-20 items-center px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden">
            <Image 
              src="/icon-192x192.png" 
              alt="Ekodrix Logo" 
              width={44} 
              height={44} 
              className="h-full w-full object-cover scale-[1.1]" 
            />
          </div>
          <div className="flex flex-col">
            <span className="mt-0.5 text-lg font-black uppercase leading-none text-zinc-900 dark:text-zinc-100">
              Ekodrix
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              HRMS PLATFORM
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-4 pb-5 pt-2">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-2.5">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              {group.group}
            </h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const isActive = isNavItemActive(pathname, searchParams, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.disabled ? "#" : item.href}
                      className={cn(
                        "group relative flex touch-target items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300",
                        isActive
                          ? "bg-primary text-white shadow-soft"
                          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100/80 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100",
                        item.disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <item.icon className={cn(
                        "h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110",
                        isActive ? "text-white" : "text-zinc-400 group-hover:text-primary"
                      )} />
                      <span className="flex-1">{item.label}</span>

                      {(item.badgeKey === "adminInbox" && (counts?.adminInbox ?? 0) > 0) && (
                        <span className="min-w-[20px] rounded-md bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-sm">
                          {counts!.adminInbox}
                        </span>
                      )}
                      {(item.badgeKey === "marketplace" && (counts?.marketplace ?? 0) > 0) && (
                        <span className="min-w-[20px] rounded-md bg-blue-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-sm">
                          {counts!.marketplace}
                        </span>
                      )}

                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="px-2">
          <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                System Performance
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="h-full w-[95%] bg-primary rounded-full" />
            </div>
            <p className="mt-2 text-[10px] font-medium text-zinc-500">95.2% System Uptime (Healthy)</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 bg-muted/25 p-4">
        <div className="group relative">
          <div className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-zinc-100/90 dark:hover:bg-zinc-800/60">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-primary/20 dark:border-zinc-800">
              <AvatarImage src={user?.profile?.avatar_url} />
              <AvatarFallback className="bg-primary/5 text-primary font-black">
                {user?.profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate text-zinc-900 dark:text-zinc-100 uppercase">
                {user?.profile?.full_name || "Syncing Profile..."}
              </p>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {user?.profile?.role || "Employee"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

