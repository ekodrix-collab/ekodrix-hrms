"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getUrgentBlockers } from "@/actions/dashboard";
import type { Blocker } from "@/types/dashboard";

export function BlockersList({ data: initialData }: { data?: Blocker[] }) {
    const { data: blockers, isLoading } = useQuery({
        queryKey: ["urgent-blockers"],
        queryFn: () => getUrgentBlockers(),
        initialData,
        refetchInterval: initialData ? false : 60000,
    });

    if (isLoading) {
        return <Card className="col-span-3 animate-pulse bg-muted/20 border-none h-[350px]" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="h-full"
        >
            <Card className="h-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
                <CardHeader>
                    <CardTitle>Team Blockers</CardTitle>
                    <CardDescription>
                        Urgent issues reported in today&apos;s standups
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {!blockers || blockers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
                                <div className="p-3 bg-green-100 rounded-full text-green-600">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-medium">All clear!</p>
                                <p className="text-xs text-muted-foreground">No urgent blockers reported today.</p>
                            </div>
                        ) : (
                            blockers.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + index * 0.1 }}
                                    className="group flex items-start space-x-4 rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:shadow-md"
                                >
                                    <div className={`mt-1 rounded-lg p-2 ${item.priority === 'high' ? 'bg-red-100 text-red-600' :
                                        item.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                            'bg-primary/10 text-primary'
                                        }`}>
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold leading-none">{item.userName}</p>
                                            <Badge
                                                variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'warning' : 'secondary'}
                                                className="capitalize text-[10px] font-bold"
                                            >
                                                {item.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
