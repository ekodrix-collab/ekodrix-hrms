"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Calendar,
    CheckCircle2,
    Clock,
    Plus,
    Users as UsersIcon,
    KanbanSquare,
    MoreHorizontal,
    ArrowLeft,
    ChevronRight,
    AlertCircle,
    Edit3,
    Trash2
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminTaskForm } from "@/components/tasks/admin-task-form";
import { approveTaskClaimAction, rejectTaskClaimAction, deleteTaskAction } from "@/actions/tasks";
import { toast } from "sonner";
import { XCircle, CheckCircle } from "lucide-react";

interface ProjectDetailsClientProps {
    project: any;
    employees: any[];
}

export function ProjectDetailsClient({ project, employees }: ProjectDetailsClientProps) {
    const [activeTab, setActiveTab] = useState("tasks");
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

    const handleApprove = async (taskId: string) => {
        setIsActionLoading(taskId);
        const res = await approveTaskClaimAction(taskId);
        if (res.ok) {
            toast.success("Task claim approved!");
        } else {
            toast.error(res.message);
        }
        setIsActionLoading(null);
    };

    const handleReject = async (taskId: string) => {
        setIsActionLoading(taskId);
        const res = await rejectTaskClaimAction(taskId);
        if (res.ok) {
            toast.success("Task claim rejected");
        } else {
            toast.error(res.message);
        }
        setIsActionLoading(null);
    };

    const totalTasks = project.tasks?.length || 0;
    const completedTasks = project.tasks?.filter((t: any) => t.status === 'done').length || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="space-y-8">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-4 text-sm font-bold text-zinc-500">
                <Link href="/admin/projects" className="hover:text-primary transition-colors flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Projects
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-zinc-900 dark:text-zinc-100">{project.name}</span>
            </div>

            {/* Project Overview Card */}
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-primary border-primary/20 bg-primary/5">
                                {project.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-400 border-zinc-200/50">
                                {project.priority} Priority
                            </Badge>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight leading-none">
                            {project.name}
                        </h1>
                        <p className="text-zinc-500 font-medium leading-relaxed">
                            {project.description || "No detailed objective provided for this project."}
                        </p>
                        <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <Calendar className="h-4 w-4 text-primary" />
                                Deadline: {project.deadline ? format(new Date(project.deadline), 'PP') : 'TBD'}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <UsersIcon className="h-4 w-4 text-primary" />
                                {employees.length} Members
                            </div>
                        </div>
                    </div>

                    <Card className="w-full md:w-80 border-none bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] shadow-inner">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between font-black uppercase tracking-tighter text-xs">
                                <span>Overall Progress</span>
                                <span className="text-primary">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-zinc-400">Total Tasks</p>
                                    <p className="text-xl font-black">{totalTasks}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-zinc-400">Completed</p>
                                    <p className="text-xl font-black text-green-500">{completedTasks}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="tasks" className="space-y-6" onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                    <TabsList className="bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 h-auto">
                        <TabsTrigger value="tasks" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm transition-all flex items-center gap-2">
                            <KanbanSquare className="h-4 w-4" />
                            Task Board
                        </TabsTrigger>
                        <TabsTrigger value="team" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm transition-all flex items-center gap-2">
                            <UsersIcon className="h-4 w-4" />
                            Project Team
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'tasks' && (
                        <AdminTaskForm
                            employees={employees}
                            projectId={project.id}
                            onSuccess={() => window.location.reload()} // Simple refresh for now
                        />
                    )}
                </div>

                <TabsContent value="tasks" className="space-y-6">
                    {totalTasks > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {project.tasks.map((task: any) => (
                                <div key={task.id} className="group bg-white/40 dark:bg-zinc-900/40 p-5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-6 hover:bg-white dark:hover:bg-zinc-900 transition-all">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${task.status === 'done' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
                                            }`}>
                                            {task.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                        </div>
                                        <div className="space-y-2 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{task.title}</span>
                                                <Badge variant="outline" className={`text-[8px] h-4 px-1 uppercase font-black ${task.priority === 'urgent' ? 'border-red-500/20 text-red-500' :
                                                    task.priority === 'high' ? 'border-orange-500/20 text-orange-500' :
                                                        'border-zinc-200/50 text-zinc-400'
                                                    }`}>
                                                    {task.priority}
                                                </Badge>
                                                {task.is_open_assignment && (
                                                    <Badge className="text-[8px] h-4 px-1 uppercase font-black bg-blue-500 text-white border-none">
                                                        Marketplace
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 font-medium truncate">{task.description || "No description provided."}</p>

                                            {/* Subtasks Progress */}
                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="pt-2 space-y-1.5 max-w-[200px]">
                                                    <div className="flex items-center justify-between text-[8px] uppercase font-black text-zinc-400">
                                                        <span>{Math.round((task.subtasks.filter((s: any) => s.completed).length / task.subtasks.length) * 100)}% Complete</span>
                                                        <span>{task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${(task.subtasks.filter((s: any) => s.completed).length / task.subtasks.length) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 px-6 border-x border-zinc-100 dark:border-zinc-800/50 min-w-[300px]">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-800 ring-1 ring-zinc-100 dark:ring-zinc-800">
                                                <AvatarImage src={task.assignee?.avatar_url} />
                                                <AvatarFallback className="text-[8px] font-bold uppercase">
                                                    {task.assignee?.full_name?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest whitespace-nowrap">
                                                    {task.assignee?.full_name || (task.is_open_assignment ? 'Unassigned' : 'Unknown')}
                                                </span>
                                                {task.assignment_status === 'pending_approval' && (
                                                    <span className="text-[8px] font-black text-amber-500 uppercase">Pending Approval</span>
                                                )}
                                                {task.assignment_status === 'open' && (
                                                    <span className="text-[8px] font-black text-blue-500 uppercase">Marketplace</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap ml-auto">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No Due Date'}
                                        </div>
                                    </div>

                                    {/* Action Buttons for Pending Approvals / Unassigned Tasks */}
                                    <div className="flex items-center gap-2 px-6 pr-8">
                                        {task.assignment_status === 'pending_approval' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-[10px] uppercase px-3"
                                                    onClick={() => handleReject(task.id)}
                                                    disabled={isActionLoading === task.id}
                                                >
                                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                                    Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] uppercase px-3 shadow-sm"
                                                    onClick={() => handleApprove(task.id)}
                                                    disabled={isActionLoading === task.id}
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                    Approve
                                                </Button>
                                            </>
                                        )}

                                        {/* Edit/Delete for Admin */}
                                        <AdminTaskForm
                                            employees={employees}
                                            projectId={project.id}
                                            initialData={{
                                                id: task.id,
                                                title: task.title,
                                                description: task.description || "",
                                                priority: task.priority,
                                                dueDate: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : "",
                                                assignment_status: task.assignment_status,
                                                user_id: task.user_id,
                                                subtasks: task.subtasks || []
                                            }}
                                            onSuccess={() => window.location.reload()}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-primary transition-all">
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                            }
                                        />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-500 hover:text-red-500 transition-all"
                                            onClick={async () => {
                                                if (confirm("Are you sure you want to delete this task?")) {
                                                    setIsActionLoading(task.id);
                                                    const res = await deleteTaskAction(task.id);
                                                    if (res.ok) {
                                                        toast.success("Task deleted successfully");
                                                        window.location.reload();
                                                    } else {
                                                        toast.error(res.message);
                                                    }
                                                    setIsActionLoading(null);
                                                }
                                            }}
                                            disabled={isActionLoading === task.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                            <KanbanSquare className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Tasks Assigned</h3>
                            <p className="text-zinc-500 font-medium mt-1">Break this objective down into actionable steps.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="team" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {employees.map((emp: any) => (
                            <Card key={emp.id} className="border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-white/50 dark:bg-zinc-900/50">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
                                        <AvatarImage src={emp.avatar_url} />
                                        <AvatarFallback className="text-sm font-black uppercase">{emp.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase truncate">{emp.full_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-[8px] h-4 px-1 uppercase font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                                Employee
                                            </Badge>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {emp.tasks?.length || 0} Active
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
