"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type VaultScope = "project" | "common";
type VaultEntryType = "credential" | "shared_note" | "image" | "file";

interface VaultCountRow {
  count: number;
}

interface VaultListRow {
  id: string;
  name: string;
  description: string | null;
  vault_scope: VaultScope;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  projects: { name: string } | null;
  member_count: VaultCountRow[] | null;
  entry_count: VaultCountRow[] | null;
}

interface VaultMemberRow {
  id: string;
  vault_id: string;
  user_id: string;
  can_edit: boolean;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    department: string | null;
    designation: string | null;
  } | null;
}

interface ProfileAuthRow {
  role: "admin" | "employee";
  organization_id: string | null;
}

interface VaultDetailRow {
  id: string;
  name: string;
  description: string | null;
  vault_scope: VaultScope;
  project_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  projects: { name: string } | null;
}

interface EntryRow {
  id: string;
  vault_id: string;
  entry_type: VaultEntryType;
  title: string;
  platform: string | null;
  username: string | null;
  secret: string | null;
  url: string | null;
  details: string | null;
  attachment_url: string | null;
  is_pinned: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

function parseCount(value: VaultCountRow[] | null | undefined): number {
  if (!value || value.length === 0) return 0;
  return Number(value[0]?.count ?? 0);
}

function normalizeText(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getAuthContext() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, message: "Not authenticated", supabase };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single<ProfileAuthRow>();

  if (profileError || !profile) {
    return { ok: false as const, message: "Profile not found", supabase };
  }

  return {
    ok: true as const,
    userId: user.id,
    role: profile.role,
    organizationId: profile.organization_id,
    supabase,
  };
}

async function canEditVault(vaultId: string) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false as const, message: auth.message, canEdit: false };

  if (auth.role === "admin") {
    return { ...auth, canEdit: true };
  }

  const { data: membership } = await auth.supabase
    .from("project_vault_members")
    .select("can_edit")
    .eq("vault_id", vaultId)
    .eq("user_id", auth.userId)
    .maybeSingle<{ can_edit: boolean }>();

  if (!membership?.can_edit) {
    return { ok: false as const, message: "Edit access denied", canEdit: false };
  }

  return { ...auth, canEdit: true };
}

function revalidateVaultPaths(vaultScope: VaultScope, projectId?: string | null) {
  revalidatePath("/admin/vaults");
  revalidatePath("/employee/vaults");
  if (projectId) {
    revalidatePath(`/admin/vaults/${projectId}`);
    revalidatePath(`/employee/vaults/${projectId}`);
  }
  if (vaultScope === "common") {
    revalidatePath("/admin/vaults/common");
    revalidatePath("/employee/vaults/common");
  }
}

export async function getVaultCatalogAction() {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };

  let query = auth.supabase
    .from("project_vaults")
    .select(`
      id,
      name,
      description,
      vault_scope,
      project_id,
      created_at,
      updated_at,
      projects(name),
      member_count:project_vault_members(count),
      entry_count:project_vault_entries(count)
    `)
    .order("vault_scope", { ascending: true })
    .order("created_at", { ascending: false });

  if (auth.organizationId) {
    query = query.eq("organization_id", auth.organizationId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, message: error.message };

  const rows = (data ?? []) as unknown as VaultListRow[];

  const { data: myMemberships } = await auth.supabase
    .from("project_vault_members")
    .select("vault_id, can_edit")
    .eq("user_id", auth.userId);

  const membershipMap = new Map<string, boolean>();
  (myMemberships ?? []).forEach((item: { vault_id: string; can_edit: boolean }) => {
    membershipMap.set(item.vault_id, item.can_edit);
  });

  const vaults = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    vault_scope: row.vault_scope,
    project_id: row.project_id,
    project_name: row.projects?.name ?? null,
    member_count: parseCount(row.member_count),
    entry_count: parseCount(row.entry_count),
    can_edit: auth.role === "admin" ? true : Boolean(membershipMap.get(row.id)),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return {
    ok: true,
    data: {
      role: auth.role,
      organizationId: auth.organizationId,
      vaults,
    },
  };
}

export async function getVaultDetailAction(vaultId: string) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };

  const { data: vault, error: vaultError } = await auth.supabase
    .from("project_vaults")
    .select(`
      id,
      name,
      description,
      vault_scope,
      project_id,
      organization_id,
      created_at,
      updated_at,
      projects(name)
    `)
    .eq("id", vaultId)
    .single<VaultDetailRow>();

  if (vaultError || !vault) return { ok: false, message: vaultError?.message ?? "Vault not found" };

  const { data: members, error: memberError } = await auth.supabase
    .from("project_vault_members")
    .select(`
      id,
      vault_id,
      user_id,
      can_edit,
      created_at,
      profiles:user_id(id, full_name, email, avatar_url, department, designation)
    `)
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: true });

  if (memberError) return { ok: false, message: memberError.message };

  const { data: entries, error: entryError } = await auth.supabase
    .from("project_vault_entries")
    .select("*")
    .eq("vault_id", vaultId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (entryError) return { ok: false, message: entryError.message };

  let canEdit = auth.role === "admin";
  if (!canEdit) {
    const { data: membership } = await auth.supabase
      .from("project_vault_members")
      .select("can_edit")
      .eq("vault_id", vaultId)
      .eq("user_id", auth.userId)
      .maybeSingle<{ can_edit: boolean }>();
    canEdit = Boolean(membership?.can_edit);
  }

  const canManageMembers = auth.role === "admin";

  return {
    ok: true,
    data: {
      vault,
      members: (members ?? []) as unknown as VaultMemberRow[],
      entries: (entries ?? []) as EntryRow[],
      permissions: {
        role: auth.role,
        canEdit,
        canManageMembers,
      },
    },
  };
}

export async function getVaultSetupDataAction() {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };

  const projectsQuery = auth.supabase
    .from("projects")
    .select("id, name, description, status")
    .order("name", { ascending: true });

  const { data: projects, error: projectsError } = await projectsQuery;
  if (projectsError) return { ok: false, message: projectsError.message };

  let employeesQuery = auth.supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, department, role")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (auth.organizationId) {
    employeesQuery = employeesQuery.eq("organization_id", auth.organizationId);
  }

  const { data: employees, error: employeesError } = await employeesQuery;

  if (employeesError) return { ok: false, message: employeesError.message };

  return {
    ok: true,
    data: {
      projects: projects ?? [],
      employees: employees ?? [],
    },
  };
}

export async function createVaultAction(input: {
  vault_scope: VaultScope;
  project_id?: string | null;
  name: string;
  description?: string | null;
  member_ids?: string[];
  editor_ids?: string[];
}) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };
  if (!auth.organizationId) return { ok: false, message: "Organization context missing" };
  const adminClient = createSupabaseAdminClient();

  const name = normalizeText(input.name);
  if (!name) return { ok: false, message: "Vault name is required" };

  if (input.vault_scope === "project" && !input.project_id) {
    return { ok: false, message: "Project vault requires a project" };
  }
  if (input.vault_scope === "common" && input.project_id) {
    return { ok: false, message: "Common vault cannot be linked to a project" };
  }

  // Prevent duplicate vault creation and return existing vault for direct navigation.
  if (input.vault_scope === "common") {
    const { data: existingCommon } = await adminClient
      .from("project_vaults")
      .select("id, vault_scope, project_id")
      .eq("organization_id", auth.organizationId)
      .eq("vault_scope", "common")
      .maybeSingle<{ id: string; vault_scope: VaultScope; project_id: string | null }>();

    if (existingCommon) {
      return { ok: true, existed: true, data: existingCommon };
    }
  }

  if (input.vault_scope === "project" && input.project_id) {
    const { data: existingProjectVault } = await adminClient
      .from("project_vaults")
      .select("id, vault_scope, project_id")
      .eq("organization_id", auth.organizationId)
      .eq("vault_scope", "project")
      .eq("project_id", input.project_id)
      .maybeSingle<{ id: string; vault_scope: VaultScope; project_id: string | null }>();

    if (existingProjectVault) {
      return { ok: true, existed: true, data: existingProjectVault };
    }
  }

  const { data: vault, error: vaultError } = await adminClient
    .from("project_vaults")
    .insert({
      organization_id: auth.organizationId,
      vault_scope: input.vault_scope,
      project_id: input.vault_scope === "project" ? input.project_id ?? null : null,
      name,
      description: normalizeText(input.description),
      created_by: auth.userId,
    })
    .select("id, vault_scope, project_id")
    .single<{ id: string; vault_scope: VaultScope; project_id: string | null }>();

  if (vaultError || !vault) {
    // Race-safe fallback: if unique index conflicts, fetch and return existing.
    if (vaultError?.code === "23505") {
      if (input.vault_scope === "common") {
        const { data: existingCommon } = await adminClient
          .from("project_vaults")
          .select("id, vault_scope, project_id")
          .eq("organization_id", auth.organizationId)
          .eq("vault_scope", "common")
          .maybeSingle<{ id: string; vault_scope: VaultScope; project_id: string | null }>();
        if (existingCommon) return { ok: true, existed: true, data: existingCommon };
      }
      if (input.vault_scope === "project" && input.project_id) {
        const { data: existingProjectVault } = await adminClient
          .from("project_vaults")
          .select("id, vault_scope, project_id")
          .eq("organization_id", auth.organizationId)
          .eq("vault_scope", "project")
          .eq("project_id", input.project_id)
          .maybeSingle<{ id: string; vault_scope: VaultScope; project_id: string | null }>();
        if (existingProjectVault) return { ok: true, existed: true, data: existingProjectVault };
      }
    }
    return { ok: false, message: vaultError?.message ?? "Failed to create vault" };
  }

  const memberIds = Array.from(new Set(input.member_ids ?? []));
  const editorSet = new Set(input.editor_ids ?? []);

  if (memberIds.length > 0) {
    const rows = memberIds.map((userId) => ({
      vault_id: vault.id,
      user_id: userId,
      can_edit: editorSet.has(userId),
      created_by: auth.userId,
    }));

    const { error: memberError } = await auth.supabase
      .from("project_vault_members")
      .upsert(rows, { onConflict: "vault_id,user_id" });

    if (memberError) return { ok: false, message: memberError.message };
  }

  revalidateVaultPaths(vault.vault_scope, vault.project_id);
  return { ok: true, existed: false, data: vault };
}

export async function updateVaultAction(input: {
  vault_id: string;
  name: string;
  description?: string | null;
}) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };

  const name = normalizeText(input.name);
  if (!name) return { ok: false, message: "Vault name is required" };

  const { data: updated, error } = await auth.supabase
    .from("project_vaults")
    .update({
      name,
      description: normalizeText(input.description),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.vault_id)
    .select("vault_scope, project_id")
    .single<{ vault_scope: VaultScope; project_id: string | null }>();

  if (error || !updated) return { ok: false, message: error?.message ?? "Failed to update vault" };

  revalidateVaultPaths(updated.vault_scope, updated.project_id);
  return { ok: true };
}

export async function deleteVaultAction(vaultId: string) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };

  const { data: target } = await auth.supabase
    .from("project_vaults")
    .select("vault_scope, project_id")
    .eq("id", vaultId)
    .maybeSingle<{ vault_scope: VaultScope; project_id: string | null }>();

  const { error } = await auth.supabase.from("project_vaults").delete().eq("id", vaultId);
  if (error) return { ok: false, message: error.message };

  revalidateVaultPaths(target?.vault_scope ?? "project", target?.project_id ?? null);
  return { ok: true };
}

export async function addVaultMemberAction(input: {
  vault_id: string;
  user_id: string;
  can_edit?: boolean;
}) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };

  const { data: vault } = await auth.supabase
    .from("project_vaults")
    .select("vault_scope, project_id")
    .eq("id", input.vault_id)
    .maybeSingle<{ vault_scope: VaultScope; project_id: string | null }>();

  const { error } = await auth.supabase
      .from("project_vault_members")
    .upsert(
      {
        vault_id: input.vault_id,
        user_id: input.user_id,
        can_edit: Boolean(input.can_edit),
        created_by: auth.userId,
      },
      { onConflict: "vault_id,user_id" }
    );

  if (error) return { ok: false, message: error.message };

  revalidateVaultPaths(vault?.vault_scope ?? "project", vault?.project_id ?? null);
  return { ok: true };
}

export async function updateVaultMemberPermissionAction(input: {
  member_id: string;
  can_edit: boolean;
}) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };

  const { data: member } = await auth.supabase
    .from("project_vault_members")
    .select("vault_id")
    .eq("id", input.member_id)
    .maybeSingle<{ vault_id: string }>();

  const { error } = await auth.supabase
    .from("project_vault_members")
    .update({
      can_edit: input.can_edit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.member_id);

  if (error) return { ok: false, message: error.message };

  if (member?.vault_id) {
    const { data: vault } = await auth.supabase
      .from("project_vaults")
      .select("vault_scope, project_id")
      .eq("id", member.vault_id)
      .maybeSingle<{ vault_scope: VaultScope; project_id: string | null }>();
    revalidateVaultPaths(vault?.vault_scope ?? "project", vault?.project_id ?? null);
  }

  return { ok: true };
}

export async function removeVaultMemberAction(memberId: string) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };
  if (auth.role !== "admin") return { ok: false, message: "Admin access required" };

  const { data: member } = await auth.supabase
    .from("project_vault_members")
    .select("vault_id")
    .eq("id", memberId)
    .maybeSingle<{ vault_id: string }>();

  const { error } = await auth.supabase
    .from("project_vault_members")
    .delete()
    .eq("id", memberId);

  if (error) return { ok: false, message: error.message };

  if (member?.vault_id) {
    const { data: vault } = await auth.supabase
      .from("project_vaults")
      .select("vault_scope, project_id")
      .eq("id", member.vault_id)
      .maybeSingle<{ vault_scope: VaultScope; project_id: string | null }>();
    revalidateVaultPaths(vault?.vault_scope ?? "project", vault?.project_id ?? null);
  }

  return { ok: true };
}

export async function upsertVaultEntryAction(input: {
  vault_id: string;
  entry_id?: string;
  entry_type: VaultEntryType;
  title: string;
  platform?: string | null;
  username?: string | null;
  secret?: string | null;
  url?: string | null;
  details?: string | null;
  attachment_url?: string | null;
  is_pinned?: boolean;
}) {
  const edit = await canEditVault(input.vault_id);
  if (!edit.ok) return { ok: false, message: edit.message };

  const title = normalizeText(input.title);
  if (!title) return { ok: false, message: "Entry title is required" };

  const basePayload = {
    entry_type: input.entry_type,
    title,
    platform: normalizeText(input.platform),
    username: normalizeText(input.username),
    secret: normalizeText(input.secret),
    url: normalizeText(input.url),
    details: normalizeText(input.details),
    attachment_url: normalizeText(input.attachment_url),
    is_pinned: Boolean(input.is_pinned),
    updated_by: edit.userId,
    updated_at: new Date().toISOString(),
  };

  if (input.entry_id) {
    const { error: updateError } = await edit.supabase
      .from("project_vault_entries")
      .update(basePayload)
      .eq("id", input.entry_id)
      .eq("vault_id", input.vault_id);

    if (updateError) return { ok: false, message: updateError.message };
  } else {
    const { error: insertError } = await edit.supabase
      .from("project_vault_entries")
      .insert({
        ...basePayload,
        vault_id: input.vault_id,
        created_by: edit.userId,
      });

    if (insertError) return { ok: false, message: insertError.message };
  }

  const { data: vault } = await edit.supabase
    .from("project_vaults")
    .select("vault_scope, project_id")
    .eq("id", input.vault_id)
    .maybeSingle<{ vault_scope: VaultScope; project_id: string | null }>();

  revalidateVaultPaths(vault?.vault_scope ?? "project", vault?.project_id ?? null);
  return { ok: true };
}

export async function deleteVaultEntryAction(entryId: string) {
  const auth = await getAuthContext();
  if (!auth.ok) return { ok: false, message: auth.message };

  const { data: entry, error: entryError } = await auth.supabase
    .from("project_vault_entries")
    .select("id, vault_id")
    .eq("id", entryId)
    .single<{ id: string; vault_id: string }>();

  if (entryError || !entry) return { ok: false, message: entryError?.message ?? "Entry not found" };

  const edit = await canEditVault(entry.vault_id);
  if (!edit.ok) return { ok: false, message: edit.message };

  const { error } = await auth.supabase
    .from("project_vault_entries")
    .delete()
    .eq("id", entryId);

  if (error) return { ok: false, message: error.message };

  const { data: vault } = await auth.supabase
    .from("project_vaults")
    .select("vault_scope, project_id")
    .eq("id", entry.vault_id)
    .maybeSingle<{ vault_scope: VaultScope; project_id: string | null }>();

  revalidateVaultPaths(vault?.vault_scope ?? "project", vault?.project_id ?? null);
  return { ok: true };
}
