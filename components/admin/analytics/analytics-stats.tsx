"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Users, Target, Activity, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAnalyticsStats } from "@/actions/analytics";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const icons = {
    "Total Employees": Users,
    "Attendance Rate": Activity,
    "Task Completion": Target,
    "Monthly Spend": Heart,
};

interface AnalyticsStat {
    label: string;
    value: string;
    change: string;
    trend: string;
    description: string;
}

export function AnalyticsStats({ data: initialData }: { data?: AnalyticsStat[] }) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ["analytics-stats"],
        queryFn: () => getAnalyticsStats(),
        initialData,
        refetchInterval: initialData ? false : 30000,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats?.map((stat: AnalyticsStat, index: number) => {
                const Icon = icons[stat.label as keyof typeof icons] || Activity;
                const isTrendUp = stat.trend === "up";

                return (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2 rounded-lg ${isTrendUp ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-600'}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-bold ${isTrendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isTrendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {stat.change}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{stat.value}</h3>
                                    <p className="text-xs text-zinc-400 mt-1">{stat.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
