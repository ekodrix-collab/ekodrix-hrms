"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminInboxAction } from "@/actions/inbox";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function InboxBell() {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith("/admin");

    const { data: result } = useQuery({
        queryKey: ["admin-inbox-count"],
        queryFn: () => getAdminInboxAction(),
        enabled: isAdmin,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    if (!isAdmin) return null;

    const items = result?.data || [];
    const unhandledCount = items.filter((i: any) => !i.is_handled).length;

    return (
        <Link href="/admin/inbox">
            <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
