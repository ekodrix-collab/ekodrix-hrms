"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, signOut } from "@/actions/auth";
import { getSidebarCountsAction } from "@/actions/sidebar";
import { adminNav, employeeNav } from "./sidebar";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const navGroups = isAdmin ? adminNav : employeeNav;

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
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 border-border/70 bg-card/90 text-zinc-700 shadow-sm dark:text-zinc-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="left-0 top-0 h-dvh w-[88vw] max-w-[360px] translate-x-0 translate-y-0 rounded-none border-r border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/20 backdrop-blur-2xl duration-300 dark:bg-card/92 [&>button]:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-border/70 px-5">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="mt-0.5 text-base font-black uppercase leading-none text-zinc-900 dark:text-zinc-100">
                  Ekodrix
                </DialogTitle>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">HRMS PLATFORM</span>
              </div>
            </Link>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-500">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          <div className="flex-1 space-y-7 overflow-y-auto px-4 py-4">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-2">
                <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                  {group.group}
                </h3>
                <ul className="space-y-1.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.disabled ? "#" : item.href}
                          className={cn(
                            "group relative flex touch-target items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                            isActive
                              ? "bg-primary text-white shadow-soft"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100",
                            item.disabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                              isActive ? "text-white" : "text-zinc-400 group-hover:text-primary"
                            )}
                          />
                          <span className="flex-1">{item.label}</span>

                          {(item.badgeKey === "adminInbox" && (counts?.adminInbox ?? 0) > 0) && (
                            <span className="min-w-[20px] rounded-md bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                              {counts!.adminInbox}
                            </span>
                          )}
                          {(item.badgeKey === "marketplace" && (counts?.marketplace ?? 0) > 0) && (
                            <span className="min-w-[20px] rounded-md bg-blue-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                              {counts!.marketplace}
                            </span>
                          )}

                          {isActive && <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border/70 bg-muted/30 p-4">
            <div className="flex items-center gap-3 rounded-2xl p-2">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-primary/20 dark:border-zinc-800">
                <AvatarImage src={user?.profile?.avatar_url} />
                <AvatarFallback className="bg-primary/10 font-black text-primary">
                  {user?.profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black uppercase text-zinc-900 dark:text-zinc-100">
                  {user?.profile?.full_name || "Syncing Profile..."}
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {user?.profile?.role || "Employee"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
