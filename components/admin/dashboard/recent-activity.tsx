"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getRecentActivities } from "@/actions/dashboard";
import type { Activity } from "@/types/dashboard";
import { formatDistanceToNow } from "date-fns";
import { History as HistoryIcon } from "lucide-react";

export function RecentActivity({ data: initialData }: { data?: Activity[] }) {
    const { data: activities, isLoading } = useQuery({
        queryKey: ["recent-activities"],
        queryFn: () => getRecentActivities(),
        initialData,
        refetchInterval: initialData ? false : 15000,
    });

    if (isLoading) {
        return <Card className="animate-pulse bg-muted/20 border-none h-[400px]" />;
    }

    return (
        <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg h-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold">Activity Feed</CardTitle>
                    <CardDescription>Latest events from across the platform</CardDescription>
                </div>
                <HistoryIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-[320px] overflow-y-auto px-6 py-4 scrollbar-hide">
                    <div className="relative space-y-3">
                        <div className="absolute left-6 top-2 bottom-2 w-px bg-zinc-100 dark:bg-zinc-800" />

                        <AnimatePresence mode="popLayout">
                            {activities && activities.length > 0 ? (
                                activities.map((activity, index) => (
                                    <motion.div
                                        key={activity.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="relative flex items-center gap-3 pl-2"
                                    >
                                        <div className="relative z-10 p-0.5 bg-white dark:bg-zinc-900 rounded-full">
                                            <Avatar className="h-7 w-7 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                <AvatarImage src={activity.user.avatar || undefined} />
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-black">
                                                    {activity.user.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold leading-tight truncate">
                                                <span className="text-primary">{activity.user.name.split(' ')[0]}</span>{" "}
                                                <span className="text-zinc-500 font-medium">{activity.action}</span>{" "}
                                                <span className="text-zinc-900 dark:text-zinc-100">{activity.type}</span>
                                            </p>
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">
                                                {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center opacity-30">
                                    <HistoryIcon className="h-8 w-8 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest">Quiet for now</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
