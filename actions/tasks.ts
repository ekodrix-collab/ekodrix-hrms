"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TaskStatus } from "@/store/task-store";

type TaskSubtask = {
  title: string;
  completed: boolean;
};

async function isAssignedProjectManager(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  projectId?: string | null
) {
  if (!projectId) return false;

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("project_manager_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

async function canManageTask(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  role: string | null | undefined,
  task: { user_id?: string | null; project_id?: string | null }
) {
  if (task.user_id === userId) return true;
  if (role === "admin") return true;
  return isAssignedProjectManager(supabase, userId, task.project_id);
}

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
  status?: TaskStatus;
  dueDate?: string;
  projectId?: string;
  isOpenAssignment?: boolean;
  subtasks?: TaskSubtask[];
  estimatedHours?: number;
  difficultyScore?: number;
  taskType?: string;
}) {
  const { userId, title, description, priority, status, dueDate, projectId, isOpenAssignment, subtasks = [], estimatedHours, difficultyScore, taskType } = params;

  if (!title) return { ok: false, message: "Title is required" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { ok: false, message: "Unauthorized" };
  }

  const isAdmin = profile.role === "admin";
  const canManageProject = isAdmin || await isAssignedProjectManager(supabase, user.id, projectId || null);

  if (!canManageProject) {
    return { ok: false, message: "Unauthorized: project manager or admin access required" };
  }

  if (!isAdmin && !projectId) {
    return { ok: false, message: "Project managers can only create tasks inside assigned projects" };
  }

  let assignedEmployee = null;
  if (!isOpenAssignment && userId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, organization_id, status")
      .eq("id", userId)
      .single();
    assignedEmployee = data;

    if (!assignedEmployee) {
      return { ok: false, message: "Employee not found" };
    }

    /*
        if (assignedEmployee.role !== "employee") {
          return { ok: false, message: "Only employees can be assigned to project tasks" };
        }
    */

    if (assignedEmployee.status !== "active") {
      return { ok: false, message: "Employee is not active" };
    }

    if (profile.organization_id && assignedEmployee.organization_id && profile.organization_id !== assignedEmployee.organization_id) {
      return { ok: false, message: "Cannot assign employee from another organization" };
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
      status: status || "todo",
      priority,
      due_date: dueDate || null,
      subtasks: subtasks || [],
      project_id: projectId || null,
      is_open_assignment: isOpenAssignment || false,
      assignment_status: isOpenAssignment ? 'open' : 'assigned',
      estimated_hours: estimatedHours ?? null,
      difficulty_score: difficultyScore ?? null,
      task_type: taskType || null,
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
  if (projectId) {
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/employee/projects/${projectId}`);
  }
  return { ok: true, task };
}

export async function updateTaskAction(params: {
  id: string;
  title: string;
  description?: string;
  priority: string;
  subtasks?: TaskSubtask[];
}) {
  const supabase = createSupabaseServerClient();
  const { id, title, description, priority } = params;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const [{ data: profile }, { data: task, error: taskError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("tasks").select("id, user_id, project_id").eq("id", id).maybeSingle()
  ]);

  if (taskError || !task) return { ok: false, message: taskError?.message || "Task not found" };

  const canManage = await canManageTask(supabase, user.id, profile?.role, task);
  if (!canManage) return { ok: false, message: "Unauthorized" };

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
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
  return { ok: true };
}

export async function deleteTaskAction(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const [{ data: profile }, { data: task, error: taskError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("tasks").select("id, user_id, project_id").eq("id", id).maybeSingle()
  ]);

  if (taskError || !task) return { ok: false, message: taskError?.message || "Task not found" };

  const canManage = await canManageTask(supabase, user.id, profile?.role, task);
  if (!canManage) return { ok: false, message: "Unauthorized" };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/tasks");
  revalidatePath("/admin/projects");
  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
  return { ok: true };
}

export async function updateAdminTaskAction(params: {
  id: string;
  userId?: string | null;
  title: string;
  description?: string;
  priority: string;
  status?: TaskStatus;
  dueDate?: string;
  isOpenAssignment?: boolean;
  subtasks?: TaskSubtask[];
  estimatedHours?: number;
  difficultyScore?: number;
  taskType?: string;
}) {
  const supabase = createSupabaseServerClient();
  const { id, userId, title, description, priority, status, dueDate, isOpenAssignment, subtasks, estimatedHours, difficultyScore, taskType } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const [{ data: profile }, { data: task, error: taskError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("tasks").select("id, project_id").eq("id", id).maybeSingle(),
  ]);

  if (taskError || !task) return { ok: false, message: taskError?.message || "Task not found" };

  const isAdmin = profile?.role === "admin";
  const canManageProject = isAdmin || await isAssignedProjectManager(supabase, user.id, task.project_id);

  if (!canManageProject) {
    return { ok: false, message: "Unauthorized: project manager or admin access required" };
  }

  const updateData: {
    title: string;
    description?: string;
    priority: string;
    due_date: string | null;
    subtasks: TaskSubtask[];
    updated_at: string;
    status?: TaskStatus;
    is_open_assignment?: boolean;
    assignment_status?: "open" | "assigned";
    user_id?: string | null;
    estimated_hours?: number | null;
    difficulty_score?: number | null;
    task_type?: string | null;
  } = {
    title,
    description,
    priority,
    due_date: dueDate || null,
    subtasks: subtasks || [],
    updated_at: new Date().toISOString(),
    estimated_hours: estimatedHours ?? null,
    difficulty_score: difficultyScore ?? null,
    task_type: taskType || null,
  };

  if (status) {
    updateData.status = status;
  }

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
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
  return { ok: true };
}

export async function moveTaskAction(params: {
  id: string;
  status: TaskStatus;
  position: number;
}) {
  const supabase = createSupabaseServerClient();
  const { id, status, position } = params;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const [{ data: profile }, { data: task, error: taskError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("tasks").select("id, user_id, project_id").eq("id", id).maybeSingle()
  ]);

  if (taskError || !task) return { ok: false, message: taskError?.message || "Task not found" };

  const canManage = await canManageTask(supabase, user.id, profile?.role, task);
  if (!canManage) return { ok: false, message: "Unauthorized" };

  const updateData: { status: TaskStatus, position: number, updated_at: string } = { status, position, updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/employee/dashboard");
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
  return { ok: true };
}

export async function toggleSubtaskAction(params: {
  taskId: string;
  subtaskIndex: number;
  completed: boolean;
}) {
  const supabase = createSupabaseServerClient();
  const { taskId, subtaskIndex, completed } = params;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // 1. Get current subtasks
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("subtasks, user_id, project_id")
    .eq("id", taskId)
    .single();

  if (fetchError || !task) return { ok: false, message: fetchError?.message || "Task not found" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canManage = await canManageTask(supabase, user.id, profile?.role, task);
  if (!canManage) return { ok: false, message: "Unauthorized" };

  const subtasks = [...((task.subtasks as TaskSubtask[]) || [])];
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
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
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
  const adminClient = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Fetch marketplace tasks that are currently available or pending review.
  // This keeps "claimed by me/others" visible in marketplace below unclaimed.
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects(name),
      assignee:profiles!user_id(full_name, avatar_url)
    `)
    .eq("is_open_assignment", true)
    .in("assignment_status", ["open", "pending_approval"])
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  const tasks = data || [];
  if (!tasks.length) return { ok: true, data: [] };

  const taskIds = tasks.map((task) => task.id);
  const { data: claimRows } = await adminClient
    .from("admin_inbox")
    .select("entity_id, metadata, created_at")
    .eq("entity_type", "task_review")
    .eq("is_handled", false)
    .in("entity_id", taskIds);

  const claimsByTask = new Map<string, { id: string; name: string }[]>();
  for (const row of claimRows || []) {
    const metadata = row.metadata as { claimant_id?: string; claimant_name?: string } | null;
    const claimantId = metadata?.claimant_id;
    if (!claimantId) continue;

    const claimantName = metadata?.claimant_name || "Employee";
    const list = claimsByTask.get(row.entity_id) || [];
    if (!list.some((entry) => entry.id === claimantId)) {
      list.push({ id: claimantId, name: claimantName });
      claimsByTask.set(row.entity_id, list);
    }
  }

  const enriched = tasks.map((task) => {
    const claimants = claimsByTask.get(task.id) || [];

    // Backward compatibility for legacy pending_approval rows where user_id carried claimant.
    if (task.assignment_status === "pending_approval" && task.user_id) {
      const exists = claimants.some((entry) => entry.id === task.user_id);
      if (!exists) {
        claimants.push({
          id: task.user_id,
          name: task.assignee?.full_name || "Employee",
        });
      }
    }

    const claimedByOthers = claimants.filter((c) => c.id !== user.id).map((c) => c.name);
    const hasMyClaim = claimants.some((c) => c.id === user.id);

    return {
      ...task,
      claimants,
      claimed_by_others: claimedByOthers,
      has_my_claim: hasMyClaim,
    };
  });

  // UX requirement: show unclaimed first, then my-claimed, then claimed-by-others.
  enriched.sort((a, b) => {
    const getBucket = (task: typeof a) => {
      const hasClaimants = (task.claimants?.length || 0) > 0;
      const hasMine = !!task.has_my_claim;
      if (!hasClaimants) return 0;
      if (hasMine) return 1;
      return 2;
    };

    const aBucket = getBucket(a);
    const bBucket = getBucket(b);
    if (aBucket !== bBucket) return aBucket - bBucket;

    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });

  return { ok: true, data: enriched };
}

export async function claimOpenTaskAction(taskId: string) {
  const supabase = createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, priority, is_open_assignment, assignment_status")
    .eq("id", taskId);
  const taskRow = task?.[0];

  if (taskError || !taskRow) return { ok: false, message: taskError?.message || "Task not found" };
  if (!taskRow.is_open_assignment) return { ok: false, message: "This is not a marketplace task" };
  if (taskRow.assignment_status === "assigned") return { ok: false, message: "Task already assigned" };

  const { data: existingClaims } = await adminClient
    .from("admin_inbox")
    .select("id")
    .eq("entity_type", "task_review")
    .eq("entity_id", taskId)
    .eq("is_handled", false)
    .contains("metadata", { claimant_id: user.id })
    .limit(1);

  if (existingClaims && existingClaims.length > 0) {
    return { ok: false, message: "You already requested this task" };
  }

  const claimerName = profile?.full_name || "Employee";
  const { error: claimError } = await adminClient.from("admin_inbox").insert({
    title: `Task Claim: ${claimerName}`,
    description: `Wants to claim: "${taskRow.title || "a task"}"`,
    entity_type: "task_review",
    entity_id: taskId,
    priority: taskRow.priority || "medium",
    is_handled: false,
    metadata: {
      claimant_id: user.id,
      claimant_name: claimerName,
      task_id: taskId,
      task_title: taskRow.title || "",
    },
  });

  if (claimError) return { ok: false, message: claimError.message };

  revalidatePath("/employee/tasks");
  revalidatePath("/admin/inbox");
  revalidatePath("/employee/marketplace");
  return { ok: true };
}

export async function getMyClaimedTasksAction() {
  const supabase = createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: claims, error: claimsError } = await adminClient
    .from("admin_inbox")
    .select("entity_id, metadata, created_at")
    .eq("entity_type", "task_review")
    .eq("is_handled", false)
    .contains("metadata", { claimant_id: user.id })
    .order("created_at", { ascending: false });

  if (claimsError) return { ok: false, message: claimsError.message };
  const taskIds = Array.from(new Set((claims || []).map((claim) => claim.entity_id)));
  if (!taskIds.length) return { ok: true, data: [] };

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects(name),
      assignee:profiles!user_id(full_name, avatar_url)
    `)
    .in("id", taskIds)
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
    .in("role", ["employee", "founder"])
    .eq("is_active", true);

  if (error) return { ok: false, message: error.message };

  // Filter to find employees with < 3 active tasks (simplified)
  // In a real prod app, we'd do a better count aggregation in SQL
  const freeEmployees = (data || []).filter((p: { tasks?: Array<{ id: string }> | null }) => (p.tasks?.length || 0) < 3);

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
      email,
      avatar_url,
      role,
      department,
      tasks:tasks!tasks_user_id_fkey(id)
    `)
    .eq("is_active", true)
    .in("role", ["employee", "founder"]);

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

export async function approveTaskClaimAction(taskId: string, claimantId?: string) {
  const supabase = createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  const { data: task } = await supabase
    .from("tasks")
    .select("title, user_id, project_id")
    .eq("id", taskId)
    .single();
  if (!task) return { ok: false, message: "Task not found" };

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (!profile) return { ok: false, message: "Unauthorized" };

  const canManageProject = profile.role === "admin" || await isAssignedProjectManager(supabase, user.id, task.project_id);
  if (!canManageProject) return { ok: false, message: "Unauthorized: project manager or admin access required" };

  const { data: pendingClaims } = await adminClient
    .from("admin_inbox")
    .select("id, metadata")
    .eq("entity_id", taskId)
    .eq("entity_type", "task_review")
    .eq("is_handled", false);

  let selectedClaimantId = claimantId || task?.user_id || null;
  if (!selectedClaimantId && pendingClaims && pendingClaims.length > 0) {
    const metadata = pendingClaims[0].metadata as { claimant_id?: string } | null;
    selectedClaimantId = metadata?.claimant_id || null;
  }

  if (!selectedClaimantId) return { ok: false, message: "No claimant available to approve" };

  const { error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "assigned",
      user_id: selectedClaimantId,
      assigned_by: user.id
    })
    .eq("id", taskId);

  if (error) return { ok: false, message: error.message };

  // Mark all pending claims for this task as handled once one claimant is approved.
  await adminClient
    .from("admin_inbox")
    .update({ is_handled: true, updated_at: new Date().toISOString() })
    .eq("entity_id", taskId)
    .eq("entity_type", "task_review")
    .eq("is_handled", false);

  const claimantIds = new Set<string>();
  for (const claim of pendingClaims || []) {
    const metadata = claim.metadata as { claimant_id?: string } | null;
    if (metadata?.claimant_id) claimantIds.add(metadata.claimant_id);
  }
  claimantIds.add(selectedClaimantId);

  for (const requestedUserId of claimantIds) {
    const approved = requestedUserId === selectedClaimantId;
    await supabase.from("notifications").insert({
      user_id: requestedUserId,
      type: approved ? "task_assigned" : "task_rejected",
      title: approved ? "Task Claim Approved" : "Task Claim Closed",
      message: approved
        ? `${profile?.full_name} approved your claim for: "${task?.title || "Task"}"`
        : `${profile?.full_name} assigned "${task?.title || "Task"}" to another employee.`,
      entity_type: "task",
      entity_id: taskId,
      is_read: false
    });
  }

  // Backward-compatible notification path for legacy claim flow records.
  if (claimantIds.size === 0 && task?.user_id) {
    await supabase.from("notifications").insert({
      user_id: task.user_id,
      type: "task_assigned",
      title: "Task Claim Approved",
      message: `${profile?.full_name} approved your claim for: "${task?.title || "Task"}"`,
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
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
  return { ok: true };
}

export async function rejectTaskClaimAction(taskId: string, claimantId?: string) {
  const supabase = createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Get task info and current requester (legacy field) plus active claim requests
  const { data: task } = await supabase.from("tasks").select("title, user_id, rejected_user_ids, project_id").eq("id", taskId).single();
  if (!task) return { ok: false, message: "Task not found" };

  const { data: pendingClaims } = await adminClient
    .from("admin_inbox")
    .select("id, metadata")
    .eq("entity_id", taskId)
    .eq("entity_type", "task_review")
    .eq("is_handled", false);

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (!profile) return { ok: false, message: "Unauthorized" };

  const canManageProject = profile.role === "admin" || await isAssignedProjectManager(supabase, user.id, task.project_id);
  if (!canManageProject) return { ok: false, message: "Unauthorized: project manager or admin access required" };

  const claimantIdsFromInbox = new Set<string>();
  for (const claim of pendingClaims || []) {
    const metadata = claim.metadata as { claimant_id?: string } | null;
    if (metadata?.claimant_id) claimantIdsFromInbox.add(metadata.claimant_id);
  }

  const targetClaimantId = claimantId || task.user_id || Array.from(claimantIdsFromInbox)[0] || null;
  if (!targetClaimantId) return { ok: false, message: "No claimant available to reject" };

  const claimantsToReject = claimantId ? [targetClaimantId] : Array.from(new Set([targetClaimantId, ...claimantIdsFromInbox]));

  // Revert task to 'open', clear user_id, and keep track of all rejected claimants.
  const rejectedUserIds = Array.from(new Set([...(task.rejected_user_ids || []), ...claimantsToReject]));

  const { error } = await supabase
    .from("tasks")
    .update({
      assignment_status: "open",
      user_id: null,
      rejected_user_ids: rejectedUserIds
    })
    .eq("id", taskId);

  if (error) return { ok: false, message: error.message };

  // Mark matching Admin Inbox claim items as handled.
  if (claimantId) {
    const matchingClaimIds = (pendingClaims || [])
      .filter((claim) => {
        const metadata = claim.metadata as { claimant_id?: string } | null;
        return metadata?.claimant_id === claimantId;
      })
      .map((claim) => claim.id);

    if (matchingClaimIds.length > 0) {
      await adminClient
        .from("admin_inbox")
        .update({ is_handled: true, updated_at: new Date().toISOString() })
        .in("id", matchingClaimIds);
    }
  } else {
    await adminClient
      .from("admin_inbox")
      .update({ is_handled: true, updated_at: new Date().toISOString() })
      .eq("entity_id", taskId)
      .eq("entity_type", "task_review");
  }

  // Notify rejected claimants.
  for (const rejectedId of claimantsToReject) {
    await supabase.from("notifications").insert({
      user_id: rejectedId,
      type: "task_rejected",
      title: "Task Claim Rejected",
      message: `${profile?.full_name} rejected your claim for: "${task.title}"`,
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
  if (task.project_id) {
    revalidatePath(`/admin/projects/${task.project_id}`);
    revalidatePath(`/employee/projects/${task.project_id}`);
  }
  return { ok: true };
}
