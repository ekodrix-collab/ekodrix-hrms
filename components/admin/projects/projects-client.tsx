"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjectsAction, deleteProjectAction } from "@/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateProjectDialog } from "./create-project-dialog";
import {
    Calendar, ChevronRight, LayoutGrid, ListTodo, MoreVertical,
    Trash2, Search, CheckCircle2, Clock, PauseCircle, FolderKanban,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Project } from "@/types/dashboard";

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
    active: { label: "Active", dot: "bg-primary", badge: "text-primary border-primary/20 bg-primary/5" },
    completed: { label: "Completed", dot: "bg-green-500", badge: "text-green-600 border-green-200 bg-green-50/50" },
    on_hold: { label: "On Hold", dot: "bg-amber-500", badge: "text-amber-600 border-amber-200 bg-amber-50/50" },
    planned: { label: "Planned", dot: "bg-blue-500", badge: "text-blue-600 border-blue-200 bg-blue-50/50" },
};

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const { data: projects = initialProjects } = useQuery({
        queryKey: ["admin-projects"],
        queryFn: async () => {
            const res = await getProjectsAction();
            return res.ok ? res.data ?? [] : [];
        },
        initialData: initialProjects,
        staleTime: 0,
    });

    const filtered = useMemo(() => {
        return projects.filter((p: Project) => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.description ?? "").toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === "all" || p.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [projects, search, statusFilter]);

    // Summary stats
    const stats = useMemo(() => ({
        total: projects.length,
        active: projects.filter((p: Project) => p.status === "active" || (!p.status || p.status === "in_progress")).length,
        completed: projects.filter((p: Project) => p.status === "completed").length,
        on_hold: projects.filter((p: Project) => p.status === "on_hold").length,
    }), [projects]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        const res = await deleteProjectAction(id);
        if (res.ok) {
            toast.success("Project deleted");
            queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-3">
                        <LayoutGrid className="h-6 w-6 text-primary" />
                        Projects Overview
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm">Monitor and manage all active company initiatives.</p>
                </div>
                <CreateProjectDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-projects"] })} />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: stats.total, icon: FolderKanban, color: "text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-800/50", border: "border-zinc-100 dark:border-zinc-800" },
                    { label: "Active", value: stats.active, icon: Clock, color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" },
                    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50/50 dark:bg-green-900/10", border: "border-green-100 dark:border-green-900/30" },
                    { label: "On Hold", value: stats.on_hold, icon: PauseCircle, color: "text-amber-500", bg: "bg-amber-50/50 dark:bg-amber-900/10", border: "border-amber-100 dark:border-amber-900/30" },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${bg} ${border}`}>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${bg} border ${border}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-0.5">{label}</p>
                            <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white/40 dark:bg-zinc-900/40 p-3 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 backdrop-blur-md shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects by name or description..."
                        className="pl-10 h-10 rounded-xl border-none bg-zinc-50 dark:bg-zinc-800/50 focus-visible:ring-primary/20 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {["all", "active", "planned", "on_hold", "completed"].map((s) => (
                        <Button
                            key={s}
                            size="sm"
                            variant={statusFilter === s ? "default" : "outline"}
                            onClick={() => setStatusFilter(s)}
                            className={`h-9 rounded-xl font-bold text-xs capitalize px-4 transition-all ${statusFilter === s ? "shadow-sm" : "border-zinc-200 dark:border-zinc-700"}`}
                        >
                            {s === "all" ? "All" : s.replace("_", " ")}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((project: Project & { task_count?: { count: number }[]; completed_count?: { count: number }[] }) => {
                    const totalTasks = project.task_count?.[0]?.count || 0;
                    const completedTasks = project.completed_count?.[0]?.count || 0;
                    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    const cfg = statusConfig[project.status] ?? statusConfig.active;

                    return (
                        <Card key={project.id} className="group relative border-zinc-100 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem] overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-6 md:p-8 space-y-5">
                                    {/* Status + Actions */}
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
                                                <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${cfg.badge}`}>
                                                    {cfg.label}
                                                </Badge>
                                            </div>
                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                                                {project.name}
                                            </h3>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                                                    <MoreVertical className="h-4 w-4 text-zinc-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-2xl border-zinc-100 dark:border-zinc-800">
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(project.id)}
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-50 font-bold rounded-xl m-1"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />Delete Project
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-zinc-500 font-medium line-clamp-2 min-h-[2.5rem]">
                                        {project.description || "No objective defined for this project."}
                                    </p>

                                    {/* Progress */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-zinc-400">
                                            <div className="flex items-center gap-1.5">
                                                <ListTodo className="h-3.5 w-3.5" />
                                                {completedTasks}/{totalTasks} Tasks
                                            </div>
                                            <span className="text-primary">{Math.round(progress)}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {project.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : "No Deadline"}
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

                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                        <LayoutGrid className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {search || statusFilter !== "all" ? "No Projects Match" : "No Projects Found"}
                        </h3>
                        <p className="text-zinc-500 font-medium mt-1">
                            {search || statusFilter !== "all" ? "Try changing your search or filter." : "Start by creating your first organizational directive."}
                        </p>
                        {!search && statusFilter === "all" && (
                            <div className="mt-6">
                                <CreateProjectDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-projects"] })} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
