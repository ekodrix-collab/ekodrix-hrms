"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  KanbanSquare,
  Users,
  StickyNote,
  Settings,
  LogOut,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Zap,
  ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, signOut } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const adminNav: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", icon: Zap },
    ]
  },
  {
    group: "Management",
    items: [
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/standups", label: "Daily Standups", icon: ListTodo },
      { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
      { href: "/admin/tasks", label: "Project Tasks", icon: KanbanSquare },
      { href: "/admin/finance", label: "Company Finance", icon: CreditCard },
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

const employeeNav: NavGroup[] = [
  {
    group: "Personal",
    items: [
      { href: "/employee/dashboard", label: "My Overview", icon: LayoutDashboard },
      { href: "/employee/attendance", label: "Clock In/Out", icon: CalendarDays },
      { href: "/employee/tasks", label: "My Tasks", icon: KanbanSquare },
      { href: "/employee/finance", label: "My Earnings", icon: CreditCard },
    ]
  },
  {
    group: "Collaboration",
    items: [
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

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const navGroups = isAdmin ? adminNav : employeeNav;

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
  });

  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-black/40 backdrop-blur-3xl md:flex flex-col h-screen sticky top-0">
      {/* Brand Section */}
      <div className="h-20 flex items-center px-6 mb-2">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
            <Zap className="h-6 w-6 text-white fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black leading-none text-zinc-900 dark:text-white uppercase mt-0.5">
              Ekodrix
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">HRMS PLATFORM</span>
          </div>
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-hide">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-2">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.disabled ? "#" : item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300",
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100",
                        item.disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                        isActive ? "text-white" : "text-zinc-400 group-hover:text-primary"
                      )} />
                      <span>{item.label}</span>

                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute right-2 h-1 w-1 rounded-full bg-white"
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

        {/* System Status / Promo Card */}
        <div className="px-2">
          <div className="rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">System Performance</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-[95%] bg-primary rounded-full" />
            </div>
            <p className="text-[10px] mt-2 text-zinc-500 font-medium">95.2% System Uptime (Healthy)</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="relative group">
          <div className="flex items-center gap-3 p-2 rounded-2xl transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
            <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-800 shadow-sm ring-1 ring-primary/20">
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
              className="h-8 w-8 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Hover Tooltip/Popup for Quick Settings could go here */}
        </div>
      </div>
    </aside>
  );
}

