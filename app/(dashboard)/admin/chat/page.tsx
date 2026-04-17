import { getTeamChatBootstrap, markTeamChatAsRead } from "@/actions/chat";
import { TeamChatClient } from "@/components/chat/team-chat-client";

export default async function AdminChatPage() {
  await markTeamChatAsRead();
  const response = await getTeamChatBootstrap();

  if (!response.ok) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Team Chat</h1>
        <p className="mt-3 text-sm text-muted-foreground">{response.message}</p>
      </div>
    );
  }

  return <TeamChatClient {...response.data} />;
}
