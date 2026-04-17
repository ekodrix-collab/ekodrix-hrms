export interface TeamChatMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  department: string | null;
  designation: string | null;
  email: string | null;
}

export interface TeamChatCurrentUser extends TeamChatMember {
  organization_id: string | null;
}

export interface TeamChatMessage {
  id: string;
  organization_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  sender: TeamChatMember | null;
}

export interface TeamChatBootstrap {
  currentUser: TeamChatCurrentUser;
  members: TeamChatMember[];
  messages: TeamChatMessage[];
}
