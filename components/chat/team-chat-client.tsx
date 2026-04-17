"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Radio, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TeamChatBootstrap, TeamChatCurrentUser, TeamChatMember, TeamChatMessage } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createTeamChatMessage, getTeamChatMessages, markTeamChatAsRead } from "@/actions/chat";

type TeamChatClientProps = TeamChatBootstrap;

type RealtimeChatRow = {
  id: string;
  organization_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
};

function getInitials(name: string | null | undefined) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSidebarTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeMessage(
  existing: TeamChatMessage[],
  incoming: TeamChatMessage
) {
  if (existing.some((message) => message.id === incoming.id)) {
    return existing;
  }

  return [...existing, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function mergeMessages(existing: TeamChatMessage[], incoming: TeamChatMessage[]) {
  return incoming.reduce((acc, message) => mergeMessage(acc, message), existing);
}

function makeRealtimeMessage(
  payload: RealtimeChatRow,
  members: TeamChatMember[],
  currentUser: TeamChatCurrentUser
): TeamChatMessage {
  const sender =
    members.find((member) => member.id === payload.sender_id) ??
    (payload.sender_id === currentUser.id
      ? {
          id: currentUser.id,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
          role: currentUser.role,
          department: currentUser.department,
          designation: currentUser.designation,
          email: currentUser.email,
        }
      : null);

  return {
    id: payload.id,
    organization_id: payload.organization_id,
    sender_id: payload.sender_id,
    content: payload.content,
    created_at: payload.created_at,
    sender,
  };
}

export function TeamChatClient({
  currentUser,
  members,
  messages: initialMessages,
}: TeamChatClientProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void markTeamChatAsRead();
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [messages]);

  useEffect(() => {
    const syncMessages = async () => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;

      const response = await getTeamChatMessages();
      if (response.ok) {
        setMessages((existing) => mergeMessages(existing, response.data));
      }

      syncInFlightRef.current = false;
    };

    const supabase = createSupabaseBrowserClient();
    const orgChannelKey = currentUser.organization_id ?? "no-org";
    const channel = supabase
      .channel(`team-chat:${orgChannelKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_messages",
        },
        (payload) => {
          const nextRow = payload.new as unknown as RealtimeChatRow;
          const sameOrganization = currentUser.organization_id
            ? nextRow.organization_id === currentUser.organization_id
            : nextRow.organization_id === null;

          if (!sameOrganization) return;

          const realtimeMessage = makeRealtimeMessage(
            nextRow,
            members,
            currentUser
          );

          setMessages((existing) => mergeMessage(existing, realtimeMessage));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") {
          void syncMessages();
        }
      });

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncMessages();
      }
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [currentUser, members]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || isSending) return;

    const optimisticMessage: TeamChatMessage = {
      id: `temp-${Date.now()}`,
      organization_id: currentUser.organization_id,
      sender_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        full_name: currentUser.full_name,
        avatar_url: currentUser.avatar_url,
        role: currentUser.role,
        department: currentUser.department,
        designation: currentUser.designation,
        email: currentUser.email,
      },
    };

    setDraft("");
    setIsSending(true);
    setMessages((existing) => [...existing, optimisticMessage]);

    const response = await createTeamChatMessage(content);

    if (!response.ok) {
      setMessages((existing) => existing.filter((message) => message.id !== optimisticMessage.id));
      setDraft(content);
      setIsSending(false);
      toast.error(response.message);
      return;
    }

    setMessages((existing) =>
      existing
        .filter((message) => message.id !== optimisticMessage.id)
        .concat(response.data)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    );
    setIsSending(false);
  }

  const latestMessage = messages[messages.length - 1];

  return (
    <div className="relative min-h-[calc(100vh-11rem)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%)]" />

      <div className="mx-auto grid max-w-[1550px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-border/60 bg-white/70 backdrop-blur-xl dark:bg-zinc-950/70">
          <CardHeader className="space-y-4 border-b border-border/60">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl bg-teal-500 p-2 text-white shadow-lg shadow-teal-500/20">
                    <Users className="h-4 w-4" />
                  </div>
                  <Badge className="gap-1.5 bg-teal-500/10 text-teal-700 dark:text-teal-200">
                    <Radio className="h-3 w-3" />
                    Live room
                  </Badge>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                    Team Chat
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One shared real-time space for everyone in your workspace.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {members.length} members
              </Badge>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Latest activity</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {latestMessage?.sender?.full_name ?? "No messages yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {latestMessage ? formatSidebarTime(latestMessage.created_at) : "Start the conversation"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Members</p>
              <Badge variant="secondary">Realtime</Badge>
            </div>

            <div className="space-y-2">
              {members.map((member) => {
                const isCurrentUser = member.id === currentUser.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/70 px-3 py-3"
                  >
                    <Avatar className="h-11 w-11 border border-white/80 shadow-sm dark:border-zinc-800">
                      <AvatarImage src={member.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-teal-500/10 font-black text-teal-700 dark:text-teal-200">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {member.full_name ?? member.email ?? "Team member"}
                        </p>
                        {isCurrentUser ? <Badge variant="outline">You</Badge> : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.designation || member.role || "Member"}
                        {member.department ? ` • ${member.department}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[72vh] flex-col border-border/60 bg-white/70 backdrop-blur-xl dark:bg-zinc-950/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Workspace stream</p>
              </div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                Chat with everyone in real time
              </h2>
            </div>
            <Badge variant="outline" className="shrink-0">
              {messages.length} messages
            </Badge>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
            <div className="flex-1 space-y-4 overflow-y-auto rounded-[28px] border border-border/60 bg-background/75 p-4 sm:p-5">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                  <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                  <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    No messages yet
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Send the first message to open the room for the whole team.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = message.sender_id === currentUser.id;

                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", isMine ? "justify-end" : "justify-start")}
                    >
                      {!isMine ? (
                        <Avatar className="mt-1 hidden h-10 w-10 border border-white/80 shadow-sm sm:flex dark:border-zinc-800">
                          <AvatarImage src={message.sender?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-sky-500/10 font-black text-sky-700 dark:text-sky-200">
                            {getInitials(message.sender?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}

                      <div
                        className={cn(
                          "max-w-[85%] rounded-[24px] px-4 py-3 shadow-sm sm:max-w-[72%]",
                          isMine
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/60 bg-card text-card-foreground"
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-xs font-black uppercase tracking-[0.12em]">
                            {isMine ? "You" : message.sender?.full_name ?? "Team member"}
                          </p>
                          <span
                            className={cn(
                              "text-[11px]",
                              isMine ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}
                          >
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="rounded-[28px] border border-border/60 bg-background/80 p-3 shadow-sm">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                maxLength={1200}
                placeholder="Write a message for the whole team..."
                className="min-h-[110px] resize-none border-none bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <div className="flex flex-col gap-3 border-t border-border/60 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Press Enter to send, Shift + Enter for a new line.
                </p>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{draft.trim().length}/1200</span>
                  <Button onClick={() => void handleSend()} disabled={!draft.trim() || isSending}>
                    <Send className="h-4 w-4" />
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
