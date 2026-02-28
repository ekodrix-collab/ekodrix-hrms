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
    created_at: string;
    updated_at: string;
    created_by: string;
}

export async function createProjectAction(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const priority = String(formData.get("priority") ?? "medium");
    const deadline = String(formData.get("deadline") ?? "");

    if (!name) return { ok: false, message: "Project name is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    // Check admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== 'admin') return { ok: false, message: "Admin access required" };

    const { data, error } = await supabase
        .from("projects")
        .insert({
            name,
            description: description || null,
            priority,
            deadline: deadline || null,
            created_by: user.id
        })
        .select("*")
        .single();

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/projects");
    return { ok: true, project: data as Project };
}

export async function getProjectsAction() {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("projects")
        .select(`
      *,
      task_count:tasks(count),
      completed_count:tasks(count)
    `)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
}

export async function getProjectDetailsAction(id: string) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("projects")
        .select(`
      *,
      tasks:tasks(*, assignee:profiles!user_id(full_name, avatar_url))
    `)
        .eq("id", id)
        .single();

    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
}

export async function deleteProjectAction(id: string) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/projects");
    return { ok: true };
}
