"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Calendar,
    Rocket,
    Clock,
    KanbanSquare,
    Search,
    ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface EmployeeProjectsClientProps {
    initialProjects: any[];
    userId?: string;
}

const statusConfig: Record<string, string> = {
    active: "text-primary border-primary/20 bg-primary/5",
    completed: "text-green-600 border-green-200 bg-green-50/50",
    on_hold: "text-amber-600 border-amber-200 bg-amber-50/50",
    planned: "text-blue-600 border-blue-200 bg-blue-50/50",
};

export function EmployeeProjectsClient({ initialProjects, userId }: EmployeeProjectsClientProps) {
    const [search, setSearch] = useState("");

    // Only show projects where the employee has at least one task
    const relevantProjects = useMemo(() => {
        const withTasks = initialProjects.filter((p) => {
            const tasks = p.tasks ?? [];
            if (tasks.length === 0) return false;
            if (!userId) return true;
            return tasks.some((t: any) => t.user_id === userId || t.assignee?.id === userId);
        });
        // Fall back to all if none have assigned tasks (e.g., fetched differently)
        const list = withTasks.length > 0 ? withTasks : initialProjects;
        if (!search) return list;
        return list.filter(
            (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.description ?? "").toLowerCase().includes(search.toLowerCase())
        );
    }, [initialProjects, userId, search]);

    return (
        <div className="space-y-8">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
                <div className="space-y-2 relative z-10">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Rocket className="h-8 w-8 text-primary fill-current" />
                        Active Initiatives
                    </h1>
                    <p className="text-zinc-400 font-medium max-w-xl">
                        Projects you are contributing to. Track progress and stay aligned with company objectives.
                    </p>
                </div>
                <div className="relative z-10">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                        <span className="text-primary font-black text-2xl">{relevantProjects.length}</span>
                        <span className="text-white/60 font-bold text-xs uppercase ml-2 tracking-widest">Projects</span>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-50" />
            </div>

            {/* Search */}
            {initialProjects.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        className="pl-10 h-10 rounded-xl border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relevantProjects.map((project) => {
                    const totalTasks = project.tasks?.length || 0;
                    const completedTasks = project.tasks?.filter((t: any) => t.status === "done").length || 0;
                    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    const statusClass = statusConfig[project.status] ?? statusConfig.active;

                    return (
                        <Link
                            key={project.id}
                            href={`/employee/projects/${project.id}`}
                            className="group block"
                        >
                            <Card className="border-zinc-100 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem] overflow-hidden h-full">
                                <CardContent className="p-0 flex flex-col h-full">
                                    <div className="p-6 md:p-8 space-y-5 flex-1">
                                        {/* Status + Priority */}
                                        <div className="flex items-start justify-between">
                                            <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${statusClass}`}>
                                                {project.status}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-400 border-zinc-200/50">
                                                {project.priority}
                                            </Badge>
                                        </div>

                                        {/* Name + Description */}
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors line-clamp-1 uppercase tracking-tight">
                                                {project.name}
                                            </h3>
                                            <p className="text-sm text-zinc-500 font-medium line-clamp-2 min-h-[2.5rem]">
                                                {project.description || "Track your progress and tasks for this initiative."}
                                            </p>
                                        </div>

                                        {/* Progress */}
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between font-black uppercase tracking-tighter text-[10px]">
                                                <span className="text-zinc-400">Momentum</span>
                                                <span className="text-primary">{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                                        </div>

                                        {/* Footer */}
                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {project.deadline ? format(new Date(project.deadline), "MMM d") : "No Due Date"}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 justify-end">
                                                <KanbanSquare className="h-3.5 w-3.5" />
                                                {totalTasks} Tasks
                                            </div>
                                        </div>
                                    </div>

                                    {/* CTA strip */}
                                    <div className="px-6 md:px-8 py-3 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            {completedTasks}/{totalTasks} done
                                        </span>
                                        <span className="flex items-center gap-1 text-xs font-black text-primary group-hover:gap-2 transition-all">
                                            View Details <ChevronRight className="h-3.5 w-3.5" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}

                {relevantProjects.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                        <Clock className="h-16 w-16 text-zinc-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                            {search ? "No Projects Match" : "No Active Projects"}
                        </h3>
                        <p className="text-zinc-500 font-medium mt-2 max-w-sm mx-auto">
                            {search
                                ? "Try a different search term."
                                : "You are not currently assigned to any active projects."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
