"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-100 dark:border-zinc-800 bg-white/40 dark:bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 md:px-8">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            className="pl-10 bg-zinc-100/50 dark:bg-zinc-800/50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50"
            placeholder="Search everything... (Ctrl + K)"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[10px] font-black text-zinc-400">
            K
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

