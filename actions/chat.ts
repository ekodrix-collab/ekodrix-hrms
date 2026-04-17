"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TeamChatBootstrap, TeamChatCurrentUser, TeamChatMember, TeamChatMessage } from "@/types/chat";

type ChatProfileRow = {
  id: string;
  organization_id?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  department: string | null;
  designation: string | null;
  email: string | null;
};

type ChatMessageRow = {
  id: string;
  organization_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  sender: ChatProfileRow | ChatProfileRow[] | null;
};

function normalizeMember(profile: ChatProfileRow): TeamChatMember {
  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: profile.role,
    department: profile.department,
    designation: profile.designation,
    email: profile.email,
  };
}

function normalizeSender(sender: ChatProfileRow | ChatProfileRow[] | null): TeamChatMember | null {
  const profile = Array.isArray(sender) ? sender[0] : sender;
  return profile ? normalizeMember(profile) : null;
}

function normalizeMessage(row: ChatMessageRow): TeamChatMessage {
  return {
    id: row.id,
    organization_id: row.organization_id,
    sender_id: row.sender_id,
    content: row.content,
    created_at: row.created_at,
    sender: normalizeSender(row.sender),
  };
}

async function getCurrentChatUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, message: "Not authenticated", supabase, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, avatar_url, role, department, designation, email")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false as const, message: "Profile not found", supabase, profile: null };
  }

  return {
    ok: true as const,
    supabase,
    profile: {
      id: profile.id,
      organization_id: profile.organization_id ?? null,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      department: profile.department,
      designation: profile.designation,
      email: profile.email,
    } satisfies TeamChatCurrentUser,
  };
}

export async function getTeamChatBootstrap(): Promise<
  | { ok: true; data: TeamChatBootstrap }
  | { ok: false; message: string }
> {
  const auth = await getCurrentChatUser();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  let memberQuery = auth.supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, department, designation, email")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (auth.profile.organization_id) {
    memberQuery = memberQuery.eq("organization_id", auth.profile.organization_id);
  } else {
    memberQuery = memberQuery.is("organization_id", null);
  }

  const [{ data: members, error: membersError }, messagesResponse] = await Promise.all([
    memberQuery,
    getTeamChatMessages(),
  ]);

  if (membersError) {
    return { ok: false, message: membersError.message };
  }

  if (!messagesResponse.ok) {
    return { ok: false, message: messagesResponse.message };
  }

  return {
    ok: true,
    data: {
      currentUser: auth.profile,
      members: (members ?? []).map((member) => normalizeMember(member as ChatProfileRow)),
      messages: messagesResponse.data,
    },
  };
}

export async function getTeamChatUnreadCount(): Promise<
  | { ok: true; data: { count: number } }
  | { ok: false; message: string }
> {
  const auth = await getCurrentChatUser();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const { data: readState, error: readError } = await auth.supabase
    .from("team_chat_reads")
    .select("last_read_at")
    .eq("user_id", auth.profile.id)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: readError.message };
  }

  let query = auth.supabase
    .from("team_chat_messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", auth.profile.id);

  if (auth.profile.organization_id) {
    query = query.eq("organization_id", auth.profile.organization_id);
  } else {
    query = query.is("organization_id", null);
  }

  if (readState?.last_read_at) {
    query = query.gt("created_at", readState.last_read_at);
  }

  const { count, error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, data: { count: count ?? 0 } };
}

export async function markTeamChatAsRead(): Promise<
  | { ok: true }
  | { ok: false; message: string }
> {
  const auth = await getCurrentChatUser();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const { error } = await auth.supabase
    .from("team_chat_reads")
    .upsert({
      user_id: auth.profile.id,
      last_read_at: new Date().toISOString(),
    });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function getTeamChatMessages(): Promise<
  | { ok: true; data: TeamChatMessage[] }
  | { ok: false; message: string }
> {
  const auth = await getCurrentChatUser();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  let query = auth.supabase
    .from("team_chat_messages")
    .select(
      "id, organization_id, sender_id, content, created_at, sender:profiles!sender_id(id, full_name, avatar_url, role, department, designation, email)"
    )
    .order("created_at", { ascending: false })
    .limit(150);

  if (auth.profile.organization_id) {
    query = query.eq("organization_id", auth.profile.organization_id);
  } else {
    query = query.is("organization_id", null);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    data: (data ?? [])
      .map((message: ChatMessageRow) => normalizeMessage(message))
      .reverse(),
  };
}

export async function createTeamChatMessage(content: string): Promise<
  | { ok: true; data: TeamChatMessage }
  | { ok: false; message: string }
> {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return { ok: false, message: "Message cannot be empty." };
  }

  if (trimmedContent.length > 1200) {
    return { ok: false, message: "Message is too long. Keep it under 1200 characters." };
  }

  const auth = await getCurrentChatUser();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const { data, error } = await auth.supabase
    .from("team_chat_messages")
    .insert({
      organization_id: auth.profile.organization_id,
      sender_id: auth.profile.id,
      content: trimmedContent,
    })
    .select(
      "id, organization_id, sender_id, content, created_at, sender:profiles!sender_id(id, full_name, avatar_url, role, department, designation, email)"
    )
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Unable to send message." };
  }

  return {
    ok: true,
    data: normalizeMessage(data as ChatMessageRow),
  };
}
