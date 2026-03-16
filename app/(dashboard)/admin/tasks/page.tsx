"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllTasks } from "@/actions/dashboard";
import type { Task } from "@/types/dashboard";
import { getAllEmployees } from "@/actions/employees";
import { getOrganizationEmployees } from "@/actions/invitations";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Kanban, List, AlertCircle, Users,
  Check, X, Zap, Search, Filter, ChevronDown, FolderSearch, Eye, Edit3, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminTaskForm } from "@/components/tasks/admin-task-form";
import { DueDateBadge } from "@/components/tasks/due-date-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskStatsBar } from "@/components/tasks/task-stats-bar";
import { toast } from "sonner";
import { approveTaskClaimAction, rejectTaskClaimAction, deleteTaskAction } from "@/actions/tasks";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isUnclaimedTask = (task: Task) => task.assignment_status === "open" && !task.user_id;

const getTaskSortRank = (task: Task) => {
  if (isUnclaimedTask(task)) return 0;
  if (task.status === "todo") return 1;
  if (task.status === "in_progress") return 2;
  if (task.status === "review") return 3;
  if (task.status === "done") return 4;
  return 5;
};

export default function AdminTasksPage() {
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-tasks"],
    queryFn: () => getAllTasks(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => getAllEmployees(),
  });
  const { data: organizationEmployees = [] } = useQuery({
    queryKey: ["admin-organization-employees"],
    queryFn: async () => {
      const res = await getOrganizationEmployees();
      return res.employees ?? [];
    },
  });

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const projectOptions = useMemo(() => {
    if (!tasks) return [];
    const uniqueProjectNames = new Set<string>();
    tasks.forEach((task: Task) => {
      const projectName = task.projects?.name?.trim();
      if (projectName) uniqueProjectNames.add(projectName);
    });
    return Array.from(uniqueProjectNames).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const projectScopedAssigneeIds = useMemo(() => {
    const ids = new Set<string>();
    (tasks || []).forEach((task: Task) => {
      const inSelectedProject =
        projectFilter === "all" ||
        (projectFilter === "internal" ? !task.projects?.name : task.projects?.name === projectFilter);

      if (inSelectedProject && task.profiles?.id) {
        ids.add(task.profiles.id);
      }
    });
    return ids;
  }, [tasks, projectFilter]);

  const assigneeOptions = useMemo(() => {
    const byId = new Map<string, { id: string; full_name?: string; avatar_url?: string }>();

    (organizationEmployees || []).forEach((emp: { id: string; full_name?: string; avatar_url?: string }) => {
      if (!emp?.id) return;
      byId.set(emp.id, emp);
    });

    (employees || []).forEach((emp: { id: string; full_name?: string; avatar_url?: string }) => {
      if (!emp?.id) return;
      byId.set(emp.id, emp);
    });

    (tasks || []).forEach((task: Task) => {
      const id = task.profiles?.id;
      if (!id) return;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          full_name: task.profiles?.full_name,
          avatar_url: task.profiles?.avatar_url || undefined,
        });
      }
    });

    const allOptions = Array.from(byId.values()).sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );

    if (projectFilter === "all") return allOptions;
    return allOptions.filter((emp) => projectScopedAssigneeIds.has(emp.id));
  }, [organizationEmployees, employees, tasks, projectFilter, projectScopedAssigneeIds]);

  useEffect(() => {
    if (assigneeFilter === "all" || assigneeFilter === "unassigned") return;
    const stillValid = assigneeOptions.some((emp) => emp.id === assigneeFilter);
    if (!stillValid) {
      setAssigneeFilter("all");
    }
  }, [assigneeFilter, assigneeOptions]);

  const filteredAssignees = useMemo(() => {
    const needle = assigneeSearchQuery.trim().toLowerCase();
    if (!needle) return assigneeOptions;
    return assigneeOptions.filter((emp: { full_name?: string }) =>
      (emp.full_name || "").toLowerCase().includes(needle)
    );
  }, [assigneeOptions, assigneeSearchQuery]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const searchLower = searchQuery.trim().toLowerCase();
    return tasks
      .map((task: Task, index: number) => ({ task, index }))
      .filter(({ task }) => {
        const matchesSearch =
          !searchLower ||
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.profiles?.full_name?.toLowerCase().includes(searchLower) ||
          task.projects?.name?.toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
        const matchesProject =
          projectFilter === "all" ||
          (projectFilter === "internal" ? !task.projects?.name : task.projects?.name === projectFilter);
        const matchesAssignee =
          assigneeFilter === "all" ||
          (assigneeFilter === "unassigned" && !task.profiles) ||
          task.profiles?.id === assigneeFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssignee;
      })
      .sort((a, b) => {
        const rankDiff = getTaskSortRank(a.task) - getTaskSortRank(b.task);
        if (rankDiff !== 0) return rankDiff;
        return a.index - b.index;
      })
      .map(({ task }) => task);
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter, assigneeFilter]);

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    projectFilter !== "all" ||
    assigneeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
    setAssigneeFilter("all");
    setAssigneeSearchQuery("");
  };

  const hasClaimRequests = (task: Task) => (task.claimants?.length || 0) > 0 || task.assignment_status === "pending_approval";

  const primaryClaimantId = (task: Task) => task.claimants?.[0]?.id;

  const pendingClaimTasks = useMemo(() => {
    return (tasks || []).filter((task: Task) => hasClaimRequests(task));
  }, [tasks]);

  const handleApproveClaim = async (taskId: string, claimantId?: string) => {
    setProcessingId(taskId);
    try {
      const res = await approveTaskClaimAction(taskId, claimantId);
      if (res.ok) { toast.success("Task claim approved!"); refetch(); }
      else toast.error(res.message || "Failed to approve claim");
    } catch { toast.error("An unexpected error occurred"); }
    finally { setProcessingId(null); }
  };

  const handleRejectClaim = async (taskId: string, claimantId?: string) => {
    setProcessingId(taskId);
    try {
      const res = await rejectTaskClaimAction(taskId, claimantId);
      if (res.ok) { toast.success("Task claim rejected"); refetch(); }
      else toast.error(res.message || "Failed to reject claim");
    } catch { toast.error("An unexpected error occurred"); }
    finally { setProcessingId(null); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Delete this task?")) return;

    setProcessingId(taskId);
    try {
      const res = await deleteTaskAction(taskId);
      if (res.ok) {
        toast.success("Task deleted");
        if (selectedTask?.id === taskId) setSelectedTask(null);
        refetch();
      } else {
        toast.error(res.message || "Failed to delete task");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const getTaskFormInitialData = (task: Task) => ({
    id: task.id,
    title: task.title,
    description: task.description || "",
    priority: task.priority || "medium",
    status: task.status || "todo",
    dueDate: task.due_date ? String(task.due_date).split("T")[0] : "",
    assignment_status: task.assignment_status || (task.is_open_assignment ? "open" : "assigned"),
    user_id: task.user_id || "",
    subtasks: task.subtasks || [],
    estimated_hours: task.estimated_hours,
    difficulty_score: task.difficulty_score,
    task_type: task.task_type,
  });

  return (
    <main className="space-y-6 p-4 md:p-8 animate-in fade-in duration-700" aria-label="Task Management Dashboard">
      {/* Page Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
            <Kanban className="h-3 w-3" />
            Task Management
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 italic">All Tasks</h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base">Assign, monitor, and manage every employee task.</p>
        </div>
        <div className="flex justify-center md:justify-end">
          <AdminTaskForm employees={employees} onSuccess={() => refetch()} />
        </div>
      </header>

      {/* Stats Bar */}
      {tasks && tasks.length > 0 && (
        <TaskStatsBar tasks={tasks} />
      )}

      {pendingClaimTasks.length > 0 && (
        <section className="rounded-2xl border border-amber-200/60 bg-amber-50/60 dark:bg-amber-950/10 dark:border-amber-900/40 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Pending Task Claims ({pendingClaimTasks.length})
            </h2>
            <span className="text-[10px] md:text-xs font-bold text-amber-700/80 dark:text-amber-300/80 uppercase tracking-wider">
              Quick Actions
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {pendingClaimTasks.slice(0, 6).map((task: Task) => (
              <div key={task.id} className="rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-white/80 dark:bg-zinc-900/40 px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{task.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {(task.claimants?.length || 1)} Claim{(task.claimants?.length || 1) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-600 hover:bg-green-700 px-2.5"
                    onClick={() => handleApproveClaim(task.id, primaryClaimantId(task))}
                    disabled={processingId === task.id}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg text-[10px] font-black uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50 px-2.5"
                    onClick={() => handleRejectClaim(task.id, primaryClaimantId(task))}
                    disabled={processingId === task.id}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white/40 dark:bg-zinc-900/40 p-3 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 backdrop-blur-md shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search task, employee, or project..."
            className="pl-10 h-10 rounded-xl border-none bg-zinc-50 dark:bg-zinc-800/50 focus-visible:ring-blue-500/20 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          <Filter className="h-4 w-4 text-muted-foreground mr-1 shrink-0" />

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 gap-2 font-bold px-3">
                <span className="capitalize text-xs">{statusFilter === "all" ? "Any Status" : statusFilter.replace("_", " ")}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-44 p-1">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50 px-2 py-1.5">Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter("all")} className="rounded-lg font-bold">All Statuses</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("todo")} className="rounded-lg font-medium">To Do</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("in_progress")} className="rounded-lg font-medium">In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("review")} className="rounded-lg font-medium">Under Review</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("done")} className="rounded-lg font-medium">Completed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 gap-2 font-bold px-3">
                <span className="capitalize text-xs">{priorityFilter === "all" ? "Any Priority" : priorityFilter}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-44 p-1">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50 px-2 py-1.5">Priority</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setPriorityFilter("all")} className="rounded-lg font-bold">All Priorities</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPriorityFilter("urgent")} className="rounded-lg font-medium text-red-600">Urgent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("high")} className="rounded-lg font-medium text-orange-600">High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("medium")} className="rounded-lg font-medium text-blue-600">Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("low")} className="rounded-lg font-medium text-zinc-600">Low</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Project Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 gap-2 font-bold px-3 max-w-[180px]">
                <FolderSearch className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-xs truncate">
                  {projectFilter === "all" ? "Any Project" : projectFilter === "internal" ? "Internal" : projectFilter}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-64 p-1 max-h-80 overflow-y-auto mt-1 shadow-2xl">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50 px-2 py-1.5 font-black">Project</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setProjectFilter("all")} className="rounded-lg font-bold">All Projects</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProjectFilter("internal")} className="rounded-lg font-medium">Internal / No Project</DropdownMenuItem>
              <DropdownMenuSeparator />
              {projectOptions.map((projectName) => (
                <DropdownMenuItem
                  key={projectName}
                  onClick={() => setProjectFilter(projectName)}
                  className="rounded-lg font-medium truncate"
                >
                  {projectName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 gap-2 font-bold px-3">
                <Users className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs">
                  {assigneeFilter === "all" ? "Any Assignee" :
                    assigneeFilter === "unassigned" ? "Unassigned" :
                      assigneeOptions.find((e: { id: string; full_name?: string }) => e.id === assigneeFilter)?.full_name?.split(" ")[0] || "Assignee"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-56 p-1 max-h-80 overflow-y-auto mt-1 shadow-2xl">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50 px-2 py-1.5 font-black">Member</DropdownMenuLabel>
              <div className="px-2 pb-2">
                <Input
                  placeholder="Search employee..."
                  className="h-8 text-xs rounded-lg"
                  value={assigneeSearchQuery}
                  onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <DropdownMenuItem onClick={() => setAssigneeFilter("all")} className="rounded-lg font-bold">All Members</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssigneeFilter("unassigned")} className="rounded-lg font-bold text-blue-600">Unassigned / Marketplace</DropdownMenuItem>
              <DropdownMenuSeparator />
              {filteredAssignees.map((emp: { id: string; full_name?: string; avatar_url?: string }) => (
                <DropdownMenuItem key={emp.id} onClick={() => setAssigneeFilter(emp.id)} className="rounded-lg gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={emp.avatar_url} />
                    <AvatarFallback className="text-[8px] font-black">{emp.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm truncate">{emp.full_name}</span>
                </DropdownMenuItem>
              ))}
              {filteredAssignees.length === 0 && (
                <div className="px-2 py-3 text-xs font-medium text-zinc-500">No employee found.</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-[10px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filtered count indicator */}
      {hasActiveFilters && tasks && (
        <p className="text-xs font-bold text-zinc-500 -mt-2 px-1">
          Showing <span className="text-zinc-900 dark:text-zinc-100">{filteredTasks.length}</span> of {tasks.length} tasks
        </p>
      )}

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-zinc-100/50 dark:bg-zinc-800/50 p-1">
          <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> List View</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team Members</TabsTrigger>
        </TabsList>

        {/* LIST VIEW */}
        <TabsContent value="list">
          <section aria-label="Tasks List">
            <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
              <CardContent className="p-0">
                {/* Mobile View */}
                <div className="block lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {isLoading ? (
                    <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
                  ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task: Task) => (
                      <div key={task.id} className="p-5 space-y-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {task.projects && (
                                <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-500 border-blue-100 bg-blue-50/30 px-1 py-0 h-4 tracking-tighter shrink-0 ring-1 ring-blue-500/10">
                                  <FolderSearch className="h-2 w-2 mr-0.5" />{task.projects.name}
                                </Badge>
                              )}
                              <TaskStatusBadge status={task.status} />
                            </div>
                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase leading-none tracking-tight">{task.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-medium">{task.description || "No description provided"}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] font-black">{task.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">{task.profiles?.full_name?.split(" ")[0] || "Unassigned"}</span>
                          </div>
                          <TaskPriorityBadge priority={task.priority} />
                          {hasClaimRequests(task) && (
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-green-50 text-green-600 border border-green-100" onClick={() => handleApproveClaim(task.id, primaryClaimantId(task))} disabled={processingId === task.id}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-red-50 text-red-600 border border-red-100" onClick={() => handleRejectClaim(task.id, primaryClaimantId(task))} disabled={processingId === task.id}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-800">
                          <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Due Date</div>
                          <DueDateBadge dueDate={task.due_date} />
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => setSelectedTask(task)}
                            aria-label="View task"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <AdminTaskForm
                            employees={employees}
                            initialData={getTaskFormInitialData(task)}
                            onSuccess={() => refetch()}
                            trigger={
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-lg"
                                aria-label="Edit task"
                                title="Edit"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={processingId === task.id}
                            aria-label="Delete task"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-20 text-center">
                      <div className="h-16 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <AlertCircle className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No tasks found</p>
                      <p className="text-[11px] text-zinc-500 mt-1 font-medium italic">Adjust your filters or start fresh.</p>
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4">Task</th>
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Assignee</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                          </td>
                        </tr>
                      ) : filteredTasks.length > 0 ? (
                        filteredTasks.map((task: Task, index: number) => (
                          <motion.tr
                            key={task.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all"
                          >
                            {/* Task */}
                            <td className="px-6 py-4 max-w-[280px]">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors uppercase truncate">{task.title}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{task.description || "No description."}</p>
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {task.assigned_by && !task.is_open_assignment && (
                                    <Badge variant="secondary" className="text-[9px] font-black">ADMIN ASSIGNED</Badge>
                                  )}
                                  {task.is_open_assignment && (
                                    <Badge variant="outline" className="text-[9px] font-black text-blue-600 border-blue-100 bg-blue-50/50 flex items-center gap-1 w-fit ring-1 ring-blue-500/10">
                                      <Zap className="h-2.5 w-2.5 fill-current" /> MARKETPLACE
                                    </Badge>
                                  )}
                                  {(task.claimants?.length || 0) > 0 && (
                                    <Badge variant="secondary" className="text-[9px] font-black">
                                      {task.claimants?.length} CLAIM{task.claimants?.length === 1 ? "" : "S"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Project */}
                            <td className="px-6 py-4">
                              {task.projects ? (
                                <div className="flex items-center gap-1.5 text-blue-600">
                                  <FolderSearch className="h-3.5 w-3.5 opacity-40 shrink-0" />
                                  <span className="text-[11px] font-black uppercase tracking-tight">{task.projects.name}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Internal</span>
                              )}
                            </td>

                            {/* Assignee */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
                                    <AvatarImage src={task.profiles?.avatar_url || undefined} />
                                    <AvatarFallback className="text-[9px] font-black bg-muted">{task.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
                                  </Avatar>
                                  {task.profiles && <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border border-white dark:border-zinc-900" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 whitespace-nowrap uppercase tracking-tight leading-none mb-0.5">
                                    {task.profiles?.full_name || "Unassigned"}
                                  </span>
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{task.profiles?.role || "Marketplace"}</span>
                                </div>
                              </div>
                            </td>

                            {/* Status + Priority */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5 items-start">
                                <TaskStatusBadge status={task.status} />
                                <TaskPriorityBadge priority={task.priority} className="text-[8px] px-1.5 h-4 tracking-tighter" />
                              </div>
                            </td>

                            {/* Due Date */}
                            <td className="px-6 py-4 text-sm font-medium">
                              <DueDateBadge dueDate={task.due_date} />
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end gap-2">
                                {hasClaimRequests(task) && (
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" className="h-8 rounded-xl font-black text-[10px] uppercase tracking-widest bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20" onClick={() => handleApproveClaim(task.id, primaryClaimantId(task))} disabled={processingId === task.id}>
                                      {processingId === task.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 rounded-xl font-black text-[10px] uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleRejectClaim(task.id, primaryClaimantId(task))} disabled={processingId === task.id}>
                                      <X className="h-3 w-3 mr-1" />Reject
                                    </Button>
                                  </div>
                                )}
                                <div className="flex justify-end gap-2">
                                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" onClick={() => setSelectedTask(task)} aria-label="View task" title="View">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <AdminTaskForm
                                    employees={employees}
                                    initialData={getTaskFormInitialData(task)}
                                    onSuccess={() => refetch()}
                                    trigger={
                                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl" aria-label="Edit task" title="Edit">
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    }
                                  />
                                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDeleteTask(task.id)} disabled={processingId === task.id} aria-label="Delete task" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-32 text-center">
                            <div className="h-20 w-20 bg-zinc-50 dark:bg-zinc-800/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-dashed border-zinc-100 dark:border-zinc-800">
                              <AlertCircle className="h-8 w-8 text-zinc-200 dark:text-zinc-800" />
                            </div>
                            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">No Results Found</h3>
                            <p className="text-sm text-zinc-500 font-medium italic mt-1 max-w-[200px] mx-auto leading-relaxed">Adjust your filters or search terms.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* TEAM VIEW */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.length > 0 ? (
              employees.map((emp: { id: string; full_name?: string; avatar_url?: string; role?: string; department?: string }, index: number) => {
                const empTaskCount = tasks?.filter((t: Task) => t.profiles?.id === emp.id).length ?? 0;
                return (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl group hover:shadow-2xl transition-all duration-500 rounded-[2rem] overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-4 border-white dark:border-zinc-800 shadow-lg ring-1 ring-primary/20">
                              <AvatarImage src={emp.avatar_url} />
                              <AvatarFallback className="text-xl font-black bg-primary/5 text-primary">{emp.full_name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight truncate leading-none mb-1">{emp.full_name}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 h-4">{emp.role || "Employee"}</Badge>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{emp.department || "Staff"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Active Tasks</span>
                            <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">{empTaskCount}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 text-primary" asChild>
                            <a href={`/admin/employees/${emp.id}`}>Profile →</a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                <Users className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Team Members Found</h3>
                <p className="text-zinc-500 font-medium mt-1">Start by inviting your team in the Employee management section.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] border-zinc-100 dark:border-zinc-800 p-0 overflow-hidden">
          {selectedTask && (
            <div className="max-h-[85vh] overflow-y-auto">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-zinc-500">
                  Full task overview with assignment and execution details.
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-5 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={selectedTask.status} />
                  <TaskPriorityBadge priority={selectedTask.priority} />
                  {selectedTask.is_open_assignment && (
                    <Badge variant="outline" className="text-[10px] font-black uppercase text-blue-600 border-blue-100 bg-blue-50/50">
                      Marketplace
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project</p>
                    <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedTask.projects?.name || "Internal"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assignee</p>
                    <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedTask.profiles?.full_name || "Unassigned"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Due Date</p>
                    <div className="mt-1">
                      <DueDateBadge dueDate={selectedTask.due_date} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Claim Requests</p>
                    <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedTask.claimants?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</p>
                  <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {selectedTask.description || "No description provided."}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Subtasks</p>
                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {selectedTask.subtasks.map((subtask, idx) => (
                        <div key={`${selectedTask.id}-subtask-${idx}`} className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{subtask.title}</span>
                          <Badge variant={subtask.completed ? "default" : "secondary"} className="text-[10px] uppercase font-black">
                            {subtask.completed ? "Done" : "Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-zinc-500">No subtasks added.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
