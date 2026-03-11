"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Project {
    id: string;
    name: string;
    description: string | null;
    status: 'active' | 'completed' | 'on_hold' | 'planned';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    deadline: string | null;
    contract_amount?: number | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    project_manager_id: string | null;
    project_manager?: {
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null;
}

type ProjectRow = {
    id: string;
    name: string;
    description: string | null;
    status: 'active' | 'completed' | 'on_hold' | 'planned';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    deadline: string | null;
    contract_amount?: number | null;
    created_at: string;
    updated_at: string;
    created_by: string;
    project_manager_id: string | null;
    task_count?: { count: number }[];
    completed_count?: { count: number }[];
    [key: string]: unknown;
};

function parseTeamMemberIds(raw: FormDataEntryValue | null): string[] {
    if (!raw) return [];
    const value = String(raw).trim();
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return Array.from(new Set(parsed.map((item) => String(item).trim()).filter(Boolean)));
    } catch {
        return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
    }
}

export async function createProjectAction(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const priority = String(formData.get("priority") ?? "medium");
    const deadline = String(formData.get("deadline") ?? "");
    const projectManagerIdRaw = String(formData.get("projectManagerId") ?? "").trim();
    const projectManagerId = projectManagerIdRaw || null;
    const teamMemberIds = parseTeamMemberIds(formData.get("teamMemberIds"));

    if (!name) return { ok: false, message: "Project name is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    // Check admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();
    if (profile?.role !== 'admin') return { ok: false, message: "Admin access required" };

    if (projectManagerId) {
        const { data: manager } = await supabase
            .from("profiles")
            .select("id, role, organization_id, status")
            .eq("id", projectManagerId)
            .maybeSingle();

        if (!manager || manager.role !== "employee") {
            return { ok: false, message: "Project manager must be an active employee" };
        }

        if (manager.status !== "active") {
            return { ok: false, message: "Selected employee is inactive" };
        }

        if (profile.organization_id && manager.organization_id && profile.organization_id !== manager.organization_id) {
            return { ok: false, message: "Selected employee belongs to another organization" };
        }
    }

    if (teamMemberIds.length > 0) {
        let teamQuery = supabase
            .from("profiles")
            .select("id")
            .in("id", teamMemberIds)
            .eq("role", "employee")
            .eq("status", "active");

        if (profile.organization_id) {
            teamQuery = teamQuery.eq("organization_id", profile.organization_id);
        }

        const { data: validTeamMembers, error: validTeamError } = await teamQuery;
        if (validTeamError) return { ok: false, message: validTeamError.message };

        const validCount = validTeamMembers?.length || 0;
        if (validCount !== teamMemberIds.length) {
            return { ok: false, message: "Some selected team members are invalid or inactive" };
        }
    }

    const { data, error } = await supabase
        .from("projects")
        .insert({
            name,
            description: description || null,
            priority,
            deadline: deadline || null,
            created_by: user.id,
            project_manager_id: projectManagerId
        })
        .select("*")
        .single();

    if (error) return { ok: false, message: error.message };

    if (teamMemberIds.length > 0) {
        const { error: teamInsertError } = await supabase
            .from("project_team_members")
            .insert(
                teamMemberIds.map((memberId) => ({
                    project_id: data.id,
                    user_id: memberId,
                    added_by: user.id,
                }))
            );

        if (teamInsertError) {
            await supabase.from("projects").delete().eq("id", data.id);
            const missingTable =
                teamInsertError.code === "PGRST205" ||
                teamInsertError.code === "42P01" ||
                teamInsertError.message?.toLowerCase().includes("project_team_members") ||
                teamInsertError.message?.toLowerCase().includes("schema cache");

            if (missingTable) {
                return {
                    ok: false,
                    message: "Project team table is missing. Run migration: supabase/migrations/20260307_add_project_team_members.sql, then retry.",
                };
            }

            return { ok: false, message: `Failed to assign project team: ${teamInsertError.message}` };
        }
    }

    revalidatePath("/admin/projects");
    revalidatePath("/employee/projects");
    return { ok: true, project: data as Project };
}

export async function getProjectsAction() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const baseSelect = `
      *,
      task_count:tasks(count),
      completed_count:tasks(count)
    `;

    if (profile?.role === "admin") {
        const { data, error } = await supabase
            .from("projects")
            .select(baseSelect)
            .eq("completed_count.status", "done")
            .order("created_at", { ascending: false });

        if (error) return { ok: false, message: error.message };
        const withManagers = await attachProjectManagerProfiles(supabase, (data || []) as unknown as ProjectRow[]);
        return { ok: true, data: withManagers };
    }

    const [managedRes, taskProjectRes] = await Promise.all([
        supabase
            .from("projects")
            .select(baseSelect)
            .eq("project_manager_id", user.id)
            .eq("completed_count.status", "done")
            .order("created_at", { ascending: false }),
        supabase
            .from("tasks")
            .select("project_id")
            .eq("user_id", user.id)
            .not("project_id", "is", null),
    ]);

    if (managedRes.error) return { ok: false, message: managedRes.error.message };
    if (taskProjectRes.error) return { ok: false, message: taskProjectRes.error.message };

    const managedProjects = (managedRes.data || []) as unknown as ProjectRow[];
    const managedProjectIds = new Set(managedProjects.map((project) => project.id));

    const taskProjectIds = Array.from(
        new Set(
            (taskProjectRes.data || [])
                .map((row) => row.project_id)
                .filter((projectId): projectId is string => Boolean(projectId))
        )
    ).filter((projectId) => !managedProjectIds.has(projectId));

    let taskProjects: ProjectRow[] = [];
    if (taskProjectIds.length > 0) {
        const { data: projectRows, error: projectError } = await supabase
            .from("projects")
            .select(baseSelect)
            .in("id", taskProjectIds)
            .eq("completed_count.status", "done")
            .order("created_at", { ascending: false });

        if (projectError) return { ok: false, message: projectError.message };
        taskProjects = (projectRows || []) as unknown as ProjectRow[];
    }

    const merged = [...managedProjects, ...taskProjects].sort((a, b) => {
        const aTs = new Date(a.created_at || 0).getTime();
        const bTs = new Date(b.created_at || 0).getTime();
        return bTs - aTs;
    });

    const withManagers = await attachProjectManagerProfiles(supabase, merged);
    return { ok: true, data: withManagers };
}

export async function getProjectDetailsAction(id: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
        const [managedProject, assignedTask] = await Promise.all([
            supabase
                .from("projects")
                .select("id")
                .eq("id", id)
                .eq("project_manager_id", user.id)
                .maybeSingle(),
            supabase
                .from("tasks")
                .select("id")
                .eq("project_id", id)
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle(),
        ]);

        if (managedProject.error) return { ok: false, message: managedProject.error.message };
        if (assignedTask.error) return { ok: false, message: assignedTask.error.message };

        if (!managedProject.data && !assignedTask.data) {
            return { ok: false, message: "You do not have access to this project" };
        }
    }

    const { data: projectRow, error: projectError } = await supabase
        .from("projects")
        .select(`
            *,
            tasks:tasks(*, assignee:profiles!tasks_user_id_fkey(id, full_name, avatar_url)),
            project_team_members(user_id, profiles:user_id(id, full_name, email, avatar_url, role))
        `)
        .eq("id", id)
        .single();

    if (projectError) return { ok: false, message: projectError.message };

    let projectManager: {
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null = null;

    if (projectRow.project_manager_id) {
        const { data: managerRow } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url")
            .eq("id", projectRow.project_manager_id)
            .maybeSingle();

        if (managerRow) {
            projectManager = managerRow;
        }
    }

    const members = (projectRow.project_team_members || []).map((m: any) =>
        Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    ).filter(Boolean);

    const enriched = {
        ...projectRow,
        project_manager: projectManager,
        members,
        is_project_manager: projectRow.project_manager_id === user.id,
        can_manage_project: isAdmin || projectRow.project_manager_id === user.id,
    };

    return { ok: true, data: enriched };
}

export async function updateProjectDescriptionAction(
    projectId: string,
    params: { name?: string; description?: string }
) {
    if (!projectId) return { ok: false, message: "Project ID is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return { ok: false, message: "Admin access required" };

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.name !== undefined) updatePayload.name = params.name.trim() || null;
    if (params.description !== undefined) updatePayload.description = params.description.trim() || null;

    const { error } = await supabase
        .from("projects")
        .update(updatePayload)
        .eq("id", projectId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath("/employee/projects");
    revalidatePath(`/employee/projects/${projectId}`);

    return { ok: true };
}

export async function deleteProjectAction(id: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return { ok: false, message: "Admin access required" };

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/projects");
    revalidatePath("/employee/projects");
    return { ok: true };
}

export async function assignProjectManagerAction(projectId: string, managerId: string | null) {
    if (!projectId) return { ok: false, message: "Project ID is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return { ok: false, message: "Admin access required" };

    if (managerId) {
        const { data: manager } = await supabase
            .from("profiles")
            .select("id, role, organization_id, status")
            .eq("id", managerId)
            .maybeSingle();

        if (!manager || manager.role !== "employee") {
            return { ok: false, message: "Project manager must be an employee" };
        }

        if (manager.status !== "active") {
            return { ok: false, message: "Selected employee is inactive" };
        }

        if (profile.organization_id && manager.organization_id && profile.organization_id !== manager.organization_id) {
            return { ok: false, message: "Selected employee belongs to another organization" };
        }
    }

    const { error } = await supabase
        .from("projects")
        .update({
            project_manager_id: managerId,
            updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath("/employee/projects");
    revalidatePath(`/employee/projects/${projectId}`);

    return { ok: true };
}

async function attachProjectManagerProfiles(
    supabase: ReturnType<typeof createSupabaseServerClient>,
    projects: ProjectRow[]
) {
    const managerIds = Array.from(
        new Set(
            projects
                .map((project) => project.project_manager_id)
                .filter((managerId): managerId is string => Boolean(managerId))
        )
    );

    if (managerIds.length === 0) return projects;

    const { data: managerRows } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", managerIds);

    const managerMap = new Map((managerRows || []).map((manager) => [manager.id, manager]));

    return projects.map((project) => ({
        ...project,
        project_manager: project.project_manager_id ? managerMap.get(project.project_manager_id) ?? null : null,
    }));
}
export async function getProjectMembersAction(projectId: string) {
    if (!projectId) return { ok: false, message: "Project ID is required" };
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: members, error } = await supabase
        .from("project_team_members")
        .select(`
            user_id,
            profiles:user_id (id, full_name, avatar_url, role, email)
        `)
        .eq("project_id", projectId);

    if (error) return { ok: false, message: error.message };

    const formattedMembers = members.map(m =>
        Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    ).filter(Boolean);
    return { ok: true, data: formattedMembers };
}

export async function updateProjectMembersAction(projectId: string, memberIds: string[]) {
    if (!projectId) return { ok: false, message: "Project ID is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    // Check admin or manager access
    const { data: project } = await supabase
        .from("projects")
        .select("id, project_manager_id")
        .eq("id", projectId)
        .single();

    if (!project) return { ok: false, message: "Project not found" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const canManageMembers = profile?.role === 'admin' || project.project_manager_id === user.id;
    if (!canManageMembers) return { ok: false, message: "Unauthorized to manage project members" };

    // Start a simple transaction-like flow (delete existing, insert new)
    // Note: This is an HRMS internal tool, so this pattern is acceptable here.
    const { error: deleteError } = await supabase
        .from("project_team_members")
        .delete()
        .eq("project_id", projectId);

    if (deleteError) return { ok: false, message: `Failed to clear existing members: ${deleteError.message}` };

    if (memberIds.length > 0) {
        const { error: insertError } = await supabase
            .from("project_team_members")
            .insert(
                memberIds.map(id => ({
                    project_id: projectId,
                    user_id: id,
                    added_by: user.id
                }))
            );

        if (insertError) return { ok: false, message: `Failed to insert new members: ${insertError.message}` };
    }

    revalidatePath(`/admin/projects/${projectId}`);
    return { ok: true };
}
