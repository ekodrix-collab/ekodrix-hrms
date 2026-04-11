import { getProjectDetailsAction } from "@/actions/projects";
import { getAllEmployeesAction } from "@/actions/tasks";
import { ProjectDetailsClient } from "@/components/admin/projects/project-details-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TaskStatsBar } from "@/components/tasks/task-stats-bar";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { DueDateBadge } from "@/components/tasks/due-date-badge";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, KanbanSquare, Users, Zap } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Employee, Project, Task } from "@/types/dashboard";
import { AdminTaskForm } from "@/components/tasks/admin-task-form";

export const metadata: Metadata = {
    title: "Project Details | Ekodrix",
    description: "View project details and your assigned tasks.",
};

export default async function EmployeeProjectDetailPage({ params }: { params: { id: string } }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const result = await getProjectDetailsAction(params.id);
    if (!result.ok || !result.data) return notFound();

    const employeesRes = await getAllEmployeesAction();
    const allEmployees = employeesRes.ok ? (employeesRes.data as unknown as Employee[] ?? []) : [];

    const project = result.data as Project;
    if (project.can_manage_project) {
        const employeesRes = await getAllEmployeesAction();
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <ProjectDetailsClient
                    project={project}
                    employees={allEmployees}
                    homePath="/employee/projects"
                    showFinanceWorkspace={false}
                    canManageTasks
                    canAssignProjectManager={false}
                />
            </div>
        );
    }

    const tasks = project.tasks ?? [];
    const myTasks = tasks.filter((t) => t.user_id === user?.id || t.assignee?.id === user?.id);
    const allTasks = myTasks.length > 0 ? myTasks : tasks;

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === "done").length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 animate-in fade-in duration-700">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-3 text-sm font-bold text-zinc-500">
                <Link href="/employee/projects" className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" />My Projects
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-zinc-900 dark:text-zinc-100">{project.name}</span>
            </nav>

            {/* Project Overview */}
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-primary border-primary/20 bg-primary/5">{project.status}</Badge>
                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-400 border-zinc-200/50">{project.priority} Priority</Badge>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight leading-none">{project.name}</h1>
                        <p className="text-zinc-500 font-medium leading-relaxed">
                            {project.description || "No detailed objective provided for this project."}
                        </p>
                        <div className="flex items-center gap-6 pt-2 flex-wrap">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <Calendar className="h-4 w-4 text-primary" />
                                Deadline: {project.deadline ? format(new Date(project.deadline), "PP") : "TBD"}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <KanbanSquare className="h-4 w-4 text-primary" />
                                {totalTasks} Task{totalTasks !== 1 ? "s" : ""}
                            </div>
                        </div>
                    </div>

                    <Card className="w-full md:w-72 border-none bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] shadow-inner shrink-0">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between font-black uppercase tracking-tighter text-xs">
                                <span>Your Progress</span>
                                <span className="text-primary">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-zinc-400">Your Tasks</p>
                                    <p className="text-xl font-black">{totalTasks}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-zinc-400">Done</p>
                                    <p className="text-xl font-black text-green-500">{completedTasks}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Stats Bar */}
            {totalTasks > 0 && <TaskStatsBar tasks={allTasks} />}

            {/* Task List */}
            <div className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">
                    {myTasks.length > 0 ? "Your Tasks in This Project" : "All Project Tasks"}
                </h2>

                {totalTasks > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {allTasks.map((task: Task) => (
                            <AdminTaskForm
                                key={task.id}
                                employees={allEmployees}
                                projectId={project.id}
                                readonly={true}
                                initialData={{
                                    id: task.id,
                                    title: task.title,
                                    description: task.description || "",
                                    priority: task.priority,
                                    status: task.status,
                                    dueDate: task.due_date,
                                    assignment_status: task.assignment_status,
                                    user_id: task.user_id || task.assignee?.id,
                                    subtasks: task.subtasks || [],
                                    estimated_hours: task.estimated_hours,
                                    difficulty_score: task.difficulty_score,
                                    task_type: task.task_type,
                                }}
                                trigger={
                                    <div
                                        className="bg-white/40 dark:bg-zinc-900/40 p-5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 flex-wrap md:flex-nowrap hover:bg-white/70 dark:hover:bg-zinc-900/70 transition-all cursor-pointer group/card"
                                    >
                                        {/* Status icon */}
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${task.status === "done" ? "bg-green-500/10 text-green-500" : task.status === "in_progress" ? "bg-amber-500/10 text-amber-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                                            {task.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                        </div>

                                        {/* Task info */}
                                        <div className="flex-1 min-w-0 space-y-1.5 text-left">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover/card:text-primary transition-colors">{task.title}</span>
                                                <TaskStatusBadge status={task.status} />
                                                <TaskPriorityBadge priority={task.priority} className="text-[8px] h-4 px-1 tracking-tighter" />
                                                {task.is_open_assignment && (
                                                    <Badge className="text-[8px] h-4 px-1 uppercase font-black bg-blue-500 text-white border-none flex items-center gap-0.5">
                                                        <Zap className="h-2.5 w-2.5 fill-current" />Marketplace
                                                    </Badge>
                                                )}
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-zinc-500 font-medium line-clamp-1">{task.description}</p>
                                            )}
                                            {/* Subtasks mini progress */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="flex items-center gap-2 pt-0.5">
                                                    <div className="h-1 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${(task.subtasks.filter((s: { completed: boolean }) => s.completed).length / task.subtasks.length) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase">
                                                        {task.subtasks.filter((s: { completed: boolean }) => s.completed).length}/{task.subtasks.length} subtasks
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assignee */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-800">
                                                <AvatarImage src={task.assignee?.avatar_url || undefined} />
                                                <AvatarFallback className="text-[8px] font-bold uppercase">{task.assignee?.full_name?.charAt(0) || "U"}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col text-left">
                                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest whitespace-nowrap">
                                                    {task.assignee?.full_name || "Unassigned"}
                                                </span>
                                                {task.assignment_status === "pending_approval" && (
                                                    <span className="text-[8px] font-black text-amber-500 uppercase">Pending Approval</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Due date */}
                                        <div className="shrink-0">
                                            <DueDateBadge dueDate={task.due_date} />
                                        </div>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                        <Users className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Tasks Yet</h3>
                        <p className="text-zinc-500 font-medium mt-1">Tasks for this project will appear here once assigned.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
