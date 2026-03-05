"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Zap,
    Clock,
    ArrowUpRight,
    LayoutGrid,
    Search,
    ShieldAlert,
    CheckCircle2,
    ListChecks
} from "lucide-react";
import { claimOpenTaskAction } from "@/actions/tasks";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Task } from "@/types/dashboard";

interface MarketplaceClientProps {
    initialTasks: Task[];
    currentUserId?: string;
}

export function MarketplaceClient({ initialTasks, currentUserId }: MarketplaceClientProps) {
    const router = useRouter();
    const [tasks, setTasks] = useState(initialTasks);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    const handleClaim = async (taskId: string) => {
        setClaimingId(taskId);
        const res = await claimOpenTaskAction(taskId);
        if (res.ok) {
            toast.success("Claim request sent to admin!");
            router.refresh();
        } else {
            toast.error(res.message);
        }
        setClaimingId(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/10 dark:bg-primary/5 p-8 rounded-[2.5rem] border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="space-y-2 relative z-10">
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-3">
                        <Zap className="h-8 w-8 text-primary fill-current" />
                        Task Marketplace
                    </h1>
                    <p className="text-zinc-500 font-medium max-w-xl">
                        Explore unassigned tasks from various projects. Claim tasks to contribute and earn recognition for your work.
                    </p>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl flex items-center gap-2 border border-zinc-100 dark:border-zinc-800">
                        <Search className="h-4 w-4 text-zinc-400 ml-2" />
                        <input
                            placeholder="Find your next task..."
                            className="bg-transparent border-none outline-none text-sm font-bold w-48"
                        />
                    </div>
                </div>
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => {
                    const claimants = task.claimants || [];
                    const hasMyClaim = !!currentUserId && claimants.some((c) => c.id === currentUserId);
                    const claimedByOthers = claimants.filter((c) => c.id !== currentUserId).map((c) => c.name);
                    const claimedByLabel =
                        claimedByOthers.length > 1
                            ? `${claimedByOthers[0]} +${claimedByOthers.length - 1}`
                            : claimedByOthers[0];

                    return (
                    <Card key={task.id} className="group border-zinc-100 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem] overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-primary border-primary/20 bg-primary/5">
                                            Open Assignment
                                        </Badge>
                                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors line-clamp-1">
                                            {task.title}
                                        </h3>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-400 border-zinc-200/50">
                                        {task.priority}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-zinc-400 tracking-widest">
                                        <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                                        Project: {task.projects?.name || 'General'}
                                    </div>
                                    <p className="text-sm text-zinc-500 font-medium line-clamp-2 min-h-[2.5rem]">
                                        {task.description || "No description provided for this marketplace task."}
                                    </p>

                                    {/* Subtask Count Badge */}
                                    {task.subtasks && task.subtasks.length > 0 && (
                                        <div className="flex items-center gap-2 pt-2">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-zinc-50 text-zinc-400 border-zinc-200">
                                                {task.subtasks.length} Subtasks included
                                            </Badge>
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-0 text-[11px] font-black uppercase tracking-wider text-primary hover:bg-transparent hover:text-primary/80"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        View Details
                                    </Button>
                                </div>

                                <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No Deadline'}
                                        </div>
                                        {task.assignment_status === "open" && claimedByOthers.length > 0 && (
                                            <Badge variant="outline" className="text-[9px] font-black uppercase border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                                                Claimed by {claimedByLabel}
                                            </Badge>
                                        )}
                                    </div>

                                    {task.assignment_status === 'assigned' && task.user_id === currentUserId && (
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Approved
                                        </div>
                                    )}

                                    {task.assignment_status === "open" && hasMyClaim && (
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-xl border border-amber-100 dark:border-amber-900/50">
                                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                                            Requested
                                        </div>
                                    )}

                                    {task.assignment_status === 'open' && currentUserId && task.rejected_user_ids?.includes(currentUserId) && (
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50">
                                                <ShieldAlert className="h-3 w-3" />
                                                Claim Rejected
                                            </div>
                                            <Button
                                                onClick={() => handleClaim(task.id)}
                                                disabled={claimingId === task.id}
                                                variant="outline"
                                                size="sm"
                                                className="border-zinc-200 dark:border-zinc-800 hover:border-primary hover:text-primary font-black rounded-xl h-9 px-4 transition-all group text-[11px] uppercase tracking-wider"
                                            >
                                                {claimingId === task.id ? "Requesting..." : "Try Again"}
                                                <ArrowUpRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </Button>
                                        </div>
                                    )}

                                    {task.assignment_status === 'open' &&
                                        !hasMyClaim &&
                                        (!currentUserId || !task.rejected_user_ids?.includes(currentUserId)) && (
                                        <Button
                                            onClick={() => handleClaim(task.id)}
                                            disabled={claimingId === task.id}
                                            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black rounded-xl h-10 px-6 shadow-xl hover:scale-105 active:scale-95 transition-all group"
                                        >
                                            {claimingId === task.id ? "Requesting..." : "Claim Task"}
                                            <ArrowUpRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[3rem] bg-zinc-50/10">
                        <ShieldAlert className="h-16 w-16 text-zinc-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Marketplace Empty</h3>
                        <p className="text-zinc-500 font-medium mt-2 max-w-sm mx-auto">
                            There are currently no open assignments. Check back later or focus on your assigned tasks.
                        </p>
                    </div>
                )}
            </div>

            <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border-zinc-200 dark:border-zinc-800">
                    {selectedTask && (
                        <div className="space-y-6">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                                    {selectedTask.title}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-primary border-primary/20 bg-primary/5">
                                    Open Assignment
                                </Badge>
                                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-500 border-zinc-200/70 dark:border-zinc-700">
                                    {selectedTask.priority}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-zinc-500 border-zinc-200/70 dark:border-zinc-700">
                                    {selectedTask.due_date ? format(new Date(selectedTask.due_date), "MMM d, yyyy") : "No Deadline"}
                                </Badge>
                            </div>

                            <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                                    <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                                    Project
                                </div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {selectedTask.projects?.name || "General"}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    Description
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                                    {selectedTask.description || "No description provided for this task."}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                                    <ListChecks className="h-3.5 w-3.5 text-primary" />
                                    Subtasks
                                </div>

                                {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                                    <ul className="space-y-2">
                                        {selectedTask.subtasks.map((subtask, idx) => (
                                            <li
                                                key={`${selectedTask.id}-subtask-${idx}`}
                                                className="flex items-start gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2"
                                            >
                                                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                    {subtask.title}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-zinc-500">No subtasks added for this task.</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
