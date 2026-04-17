"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { getTeamChatUnreadCount } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function FloatingChatButton() {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const isChatPage = pathname.startsWith("/admin/chat") || pathname.startsWith("/employee/chat");
  const chatHref = isAdmin ? "/admin/chat" : "/employee/chat";

  const { data, refetch } = useQuery({
    queryKey: ["team-chat-unread-count"],
    queryFn: () => getTeamChatUnreadCount(),
    refetchInterval: 4000,
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("team-chat-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_messages",
        },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (isChatPage) {
    return null;
  }

  const unreadCount = data?.ok ? data.data.count : 0;

  return (
    <Link href={chatHref} className="fixed bottom-24 right-4 z-50 lg:bottom-8 lg:right-8">
      <Button
        size="lg"
        className="relative h-14 rounded-full px-4 shadow-2xl shadow-primary/20 sm:h-16 sm:px-5"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Team Chat</span>
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 min-w-[1.4rem] justify-center rounded-full px-1.5 py-0 text-[10px] font-black"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        ) : null}
      </Button>
    </Link>
  );
}
