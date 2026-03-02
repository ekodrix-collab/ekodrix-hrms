"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function DashboardShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--muted)/0.85),transparent_36%),radial-gradient(circle_at_92%_8%,hsl(var(--muted)/0.6),transparent_34%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-3 pb-24 pt-4 sm:px-4 sm:pt-5 lg:px-8 lg:pb-8">{children}</main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}

