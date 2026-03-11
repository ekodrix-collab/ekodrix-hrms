"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/actions/auth";
import { adminNav, getEmployeeNavByRole, getPrimaryMobileNav, isNavItemActive } from "@/components/layout/sidebar";

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const isAdmin = pathname.startsWith("/admin");
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
  });
  const navGroups = isAdmin ? adminNav : getEmployeeNavByRole(user?.profile?.role);
  const navItems = getPrimaryMobileNav(navGroups);

  if (!navItems.length) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/92 backdrop-blur-2xl lg:hidden">
      <ul className="mx-auto flex max-w-xl items-center justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-2">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, searchParams, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "mx-auto flex w-full max-w-[86px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary/12 text-primary dark:bg-primary/18 dark:text-primary-foreground"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "scale-105")} />
                <span className="truncate">{item.label.replace("My ", "")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
