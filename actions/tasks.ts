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
  const projectId = formData.get("projectId") ? String(formData.get("projectId")) : null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title,
      description,
      status: "todo",
      priority,
      subtasks,
      project_id: projectId
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true, task: data };
}

export async function createAdminTaskAction(params: {
  userId: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  projectId?: string;
  isOpenAssignment?: boolean;
  subtasks?: any[];
}) {
  const { userId, title, description, priority, dueDate, projectId, isOpenAssignment, subtasks = [] } = params;

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

  let assignedEmployee = null;
  if (!isOpenAssignment && userId) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
    assignedEmployee = data;

    if (!assignedEmployee) {
      return { ok: false, message: "Employee not found" };
    }
  }

  // Create task
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: isOpenAssignment ? null : userId,
      assigned_by: user.id,
      created_by: user.id,
      title,
      description,
      status: "todo",
      priority,
      due_date: dueDate || null,
      subtasks: subtasks || [],
      project_id: projectId || null,
      is_open_assignment: isOpenAssignment || false,
      assignment_status: isOpenAssignment ? 'open' : 'assigned'
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  // Create notification for assigned employee if not marketplace
  if (!isOpenAssignment && userId) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "task_assigned",
      title: "New Task Assigned",
      message: `${profile.full_name} assigned you a new task: "${title}"`,
      entity_type: "task",
      entity_id: task.id,
      is_read: false
    });
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
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

  revalidatePath("/admin/tasks");
  revalidatePath("/admin/projects");
  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  return { ok: true };
}

export async function updateAdminTaskAction(params: {
  id: string;
  userId?: string | null;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  isOpenAssignment?: boolean;
  subtasks?: any[];
}) {
  const supabase = createSupabaseServerClient();
  const { id, userId, title, description, priority, dueDate, isOpenAssignment, subtasks } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false, message: "Unauthorized: Admin access required" };
  }

  const updateData: any = {
    title,
    description,
    priority,
    due_date: dueDate || null,
    subtasks: subtasks || [],
    updated_at: new Date().toISOString()
  };

  if (isOpenAssignment !== undefined) {
    updateData.is_open_assignment = isOpenAssignment;
    updateData.assignment_status = isOpenAssignment ? 'open' : 'assigned';
    updateData.user_id = isOpenAssignment ? null : userId;
  } else if (userId !== undefined) {
    updateData.user_id = userId;
    updateData.assignment_status = userId ? 'assigned' : 'open';
  }

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/tasks");
  revalidatePath("/admin/projects");
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
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      project:projects(name)
    `)
    .eq("user_id", user.id)
    .eq("assignment_status", "assigned")
    .order("position", { ascending: true });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data || [] };
}

export async function getOpenTasksAction() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Fetch tasks that are 'open' OR 'pending_approval' (if requested by current user)
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects(name),
      assignee:profiles!user_id(full_name, avatar_url)
    `)
    .or(`assignment_status.eq.open,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

export async function claimOpenTaskAction(taskId: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Get user profile for inbox title
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  // Get task title for inbox description
  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single();

  const { error } = await supabase
    .from("tasks")
    .update({
      user_id: user.id,
      assignment_status: "pending_approval"
    })
    .eq("id", taskId);
  // Removed .eq("assignment_status", "open") to allow re-claiming from 'open' state even if previously rejected

  if (error) return { ok: false, message: error.message };

  // Create or Update Admin Inbox item for this task claim
  const { data: existingInbox } = await supabase
    .from("admin_inbox")
    .select("id")
    .eq("entity_id", taskId)
    .eq("entity_type", "task_review")
    .maybeSingle();

  if (existingInbox) {
    await supabase
      .from("admin_inbox")
      .update({
        is_handled: false,
        title: `Task Re-claim: ${profile?.full_name || 'Employee'}`,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingInbox.id);
  } else {
    await supabase.from("admin_inbox").insert({
      title: `Task Claim: ${profile?.full_name || 'Employee'}`,
      description: `Wants to claim: "${task?.title || 'a task'}"`,
      entity_type: 'task_review',
      entity_id: taskId,
      priority: 'medium'
    });
  }

  revalidatePath("/employee/tasks");
  revalidatePath("/admin/inbox");
  revalidatePath("/employee/marketplace"); // Important for re-claim UI refresh
  return { ok: true };
}

export async function getMyClaimedTasksAction() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects(name),
      assignee:profiles!user_id(full_name, avatar_url)
    `)
    .eq("user_id", user.id)
    .eq("assignment_status", "pending_approval")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

export async function getFreeEmployeesAction() {
  const supabase = createSupabaseServerClient();

  // Logic: Get employees and count their active tasks (todo or in_progress)
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      avatar_url,
      role,
      tasks:tasks(id)
    `)
    .eq("role", "employee")
    .eq("is_active", true);

  if (error) return { ok: false, message: error.message };

  // Filter to find employees with < 3 active tasks (simplified)
  // In a real prod app, we'd do a better count aggregation in SQL
  const freeEmployees = data.filter((p: any) => (p.tasks?.length || 0) < 3);

  return { ok: true, data: freeEmployees };
}

export async function getAllEmployeesAction() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Not authenticated" };

  // 1. Get current user's organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  // 2. Fetch employees (RLS will also filter, but explicit organization_id helps)
  const query = supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      avatar_url,
      role,
      department,
      tasks:tasks!tasks_user_id_fkey(id)
    `)
    .eq("is_active", true);

  if (profile?.organization_id) {
    query.eq("organization_id", profile.organization_id);
  }

  const { data, error } = await query.order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching employees:", error);
    return { ok: false, message: error.message };
  }

  return { ok: true, data: data || [] };
}

export async function approveTaskClaimAction(taskId: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Check admin
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== 'admin') return { ok: false, message: "Admin access required" };

  // Get task info for notification
  const { data: task } = await supabase.from("tasks").select("title, user_id").eq("id", taskId).single();

  const { error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "assigned",
      assigned_by: user.id
    })
    .eq("id", taskId);

  if (error) return { ok: false, message: error.message };

  // Mark Admin Inbox items as handled
  await supabase
    .from("admin_inbox")
    .update({ is_handled: true, updated_at: new Date().toISOString() })
    .eq("entity_id", taskId)
    .eq("entity_type", "task_review");

  // Create notification for employee
  if (task?.user_id) {
    await supabase.from("notifications").insert({
      user_id: task.user_id,
      type: "task_assigned",
      title: "Task Claim Approved",
      message: `${profile?.full_name} approved your claim for: "${task.title}"`,
      entity_type: "task",
      entity_id: taskId,
      is_read: false
    });
  }

  revalidatePath("/admin/inbox");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/projects");
  revalidatePath("/employee/tasks");
  revalidatePath("/employee/projects");
  revalidatePath("/employee/marketplace");
  return { ok: true };
}

export async function rejectTaskClaimAction(taskId: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Check admin
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== 'admin') return { ok: false, message: "Admin access required" };

  // Get task info and current requester
  const { data: task } = await supabase.from("tasks").select("title, user_id, rejected_user_ids").eq("id", taskId).single();

  if (!task || !task.user_id) return { ok: false, message: "Requester not found" };
  const requesterId = task.user_id;

  // Revert task to 'open', clear user_id, and add to rejected list
  const rejectedUserIds = [...(task.rejected_user_ids || []), requesterId];

  const { error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "open",
      user_id: null,
      rejected_user_ids: rejectedUserIds
    })
    .eq("id", taskId);

  if (error) return { ok: false, message: error.message };

  // Mark Admin Inbox items as handled
  await supabase
    .from("admin_inbox")
    .update({ is_handled: true, updated_at: new Date().toISOString() })
    .eq("entity_id", taskId)
    .eq("entity_type", "task_review");

  // Create notification for employee
  await supabase.from("notifications").insert({
    user_id: requesterId,
    type: "task_rejected",
    title: "Task Claim Rejected",
    message: `${profile?.full_name} rejected your claim for: "${task.title}"`,
    entity_type: "task",
    entity_id: taskId,
    is_read: false
  });

  revalidatePath("/admin/inbox");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/projects");
  revalidatePath("/employee/tasks");
  revalidatePath("/employee/projects");
  revalidatePath("/employee/marketplace");
  return { ok: true };
}
