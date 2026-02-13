"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    completed_at?: string;
}

export function EmployeeTasks({ tasks }: { tasks: Task[] }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {tasks.length === 0 ? (
                    <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <Clock className="h-12 w-12 text-zinc-300" />
                            <p className="text-sm font-medium text-zinc-500">No tasks found for this employee.</p>
                        </div>
                    </Card>
                ) : (
                    tasks.map((task, index) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{task.title}</h4>
                                                <Badge
                                                    variant={task.status === "done" ? "success" : "secondary"}
                                                    className="text-[10px] uppercase font-black px-2 py-0"
                                                >
                                                    {task.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-zinc-500 line-clamp-2">{task.description}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <Badge
                                                variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "warning" : "secondary"}
                                                className="text-[10px] uppercase font-black"
                                            >
                                                {task.priority} Priority
                                            </Badge>
                                            <p className="text-[10px] text-zinc-400 font-bold mt-2 uppercase tracking-tighter">
                                                Created {format(new Date(task.created_at), "MMM d, yyyy")}
                                            </p>
                                        </div>
                                    </div>

                                    {task.completed_at && (
                                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Completed {format(new Date(task.completed_at), "MMM d, yyyy 'at' p")}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
