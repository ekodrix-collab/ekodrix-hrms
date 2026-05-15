"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSidebarCountsAction } from "@/actions/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";


export function InboxBell() {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith("/admin");

    const { data: result } = useQuery({
        queryKey: ["sidebar-counts"],
        queryFn: async () => {
            const res = await getSidebarCountsAction();
            return res.ok ? res.data : { adminInbox: 0, marketplace: 0 };
        },
        enabled: isAdmin,
        refetchInterval: 60000,
    });

    if (!isAdmin) return null;

    const unhandledCount = result?.adminInbox ?? 0;

    return (
        <Link href="/admin/inbox">
            <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full border border-transparent bg-white/60 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
            >
                <Inbox className="h-5 w-5" />
                {unhandledCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold animate-in zoom-in"
                    >
                        {unhandledCount > 9 ? "9+" : unhandledCount}
                    </Badge>
                )}
            </Button>
        </Link>
    );
}
