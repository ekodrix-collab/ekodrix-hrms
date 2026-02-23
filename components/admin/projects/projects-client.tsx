"use client";

import { useState } from "react";
import { Project } from "@/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "./create-project-dialog";
import { Calendar, ChevronRight, LayoutGrid, ListTodo, MoreVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProjectAction } from "@/actions/projects";
import { toast } from "sonner";

interface ProjectsClientProps {
    initialProjects: any[]; // Using any because of the count aggregates
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
    const [projects, setProjects] = useState(initialProjects);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        const res = await deleteProjectAction(id);
        if (res.ok) {
            setProjects(prev => prev.filter(p => p.id !== id));
            toast.success("Project deleted");
        } else {
            toast.error(res.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500';
            case 'on_hold': return 'bg-amber-500';
            case 'planned': return 'bg-blue-500';
            default: return 'bg-primary';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-3">
                        <LayoutGrid className="h-6 w-6 text-primary" />
                        Projects Overview
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm">Monitor and manage all active company initiatives.</p>
                </div>
                <CreateProjectDialog />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => {
                    const totalTasks = project.task_count?.[0]?.count || 0;
                    const completedTasks = project.completed_count?.[0]?.count || 0;
                    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                    return (
                        <Card key={project.id} className="group relative border-zinc-100 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem] overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-6 md:p-8 space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${getStatusColor(project.status)} animate-pulse`} />
                                                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-400 border-zinc-200/50">
                                                    {project.status}
                                                </Badge>
                                            </div>
                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                                                {project.name}
                                            </h3>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                    <MoreVertical className="h-4 w-4 text-zinc-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-2xl border-zinc-100 dark:border-zinc-800">
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(project.id)}
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-50 font-bold rounded-xl m-1"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete Project
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <p className="text-sm text-zinc-500 font-medium line-clamp-2 min-h-[2.5rem]">
                                        {project.description || "No objective defined for this project."}
                                    </p>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-zinc-400">
                                            <div className="flex items-center gap-2">
                                                <ListTodo className="h-3.5 w-3.5" />
                                                {completedTasks}/{totalTasks} Tasks
                                            </div>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {project.deadline ? format(new Date(project.deadline), 'MMM d, yyyy') : 'No Deadline'}
                                        </div>
                                        <Link href={`/admin/projects/${project.id}`}>
                                            <Button variant="ghost" size="sm" className="h-9 px-4 font-bold rounded-xl text-primary hover:bg-primary/5 group/btn active:scale-95 transition-all">
                                                Explore <ChevronRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {projects.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                        <LayoutGrid className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Projects Found</h3>
                        <p className="text-zinc-500 font-medium mt-1">Start by creating your first organizational directive.</p>
                        <div className="mt-6">
                            <CreateProjectDialog />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
