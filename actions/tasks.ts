"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/store/task-store";

export async function createTaskAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");

  if (!title) return { ok: false, message: "Title is required" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const subtasksRaw = formData.get("subtasks");
  const subtasks = subtasksRaw ? JSON.parse(String(subtasksRaw)) : [];

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title,
      description,
      status: "todo",
      priority,
      subtasks
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  return { ok: true, task: data };
}

export async function createAdminTaskAction(params: {
  userId: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
}) {
  const { userId, title, description, priority, dueDate } = params;

  if (!title) return { ok: false, message: "Title is required" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false, message: "Unauthorized: Admin access required" };
  }

  // Get assigned employee info
  const { data: assignedEmployee } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  if (!assignedEmployee) {
    return { ok: false, message: "Employee not found" };
  }

  // Create task
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      assigned_by: user.id,
      created_by: user.id,
      title,
      description,
      status: "todo",
      priority,
      due_date: dueDate || null,
      subtasks: []
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  // Create notification for assigned employee
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "task_assigned",
    title: "New Task Assigned",
    message: `${profile.full_name} assigned you a new task: "${title}"`,
    entity_type: "task",
    entity_id: task.id,
    is_read: false
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  return { ok: true, task };
}

export async function updateTaskAction(params: {
  id: string;
  title: string;
  description?: string;
  priority: string;
  subtasks?: any[];
}) {
  const supabase = createSupabaseServerClient();
  const { id, title, description, priority } = params;

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      priority,
      subtasks: params.subtasks || [],
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  return { ok: true };
}

export async function deleteTaskAction(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  return { ok: true };
}

export async function moveTaskAction(params: {
  id: string;
  status: TaskStatus;
  position: number;
}) {
  const supabase = createSupabaseServerClient();
  const { id, status, position } = params;

  const updateData: { status: TaskStatus, position: number, updated_at: string } = { status, position, updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  return { ok: true };
}

export async function toggleSubtaskAction(params: {
  taskId: string;
  subtaskIndex: number;
  completed: boolean;
}) {
  const supabase = createSupabaseServerClient();
  const { taskId, subtaskIndex, completed } = params;

  // 1. Get current subtasks
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("subtasks")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) return { ok: false, message: fetchError?.message || "Task not found" };

  const subtasks = [...(task.subtasks as any[])];
  if (subtasks[subtaskIndex]) {
    subtasks[subtaskIndex].completed = completed;
  }

  // 2. Update subtasks
  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      subtasks,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId);

  if (updateError) return { ok: false, message: updateError.message };

  revalidatePath("/employee/tasks");
  return { ok: true };
}


export async function getTasksAction() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data || [] };
  } catch (err: unknown) {
    console.error("getTasksAction Error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch tasks";
    return { ok: false, message };
  }
}
