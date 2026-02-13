"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/actions/dashboard";

export function StatsCards({ data: initialData }: {
    data?: {
        totalEmployees: number;
        presentToday: number;
        pendingRequests: number;
        performance: number;
    }
}) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: () => getDashboardStats(),
        initialData,
        refetchInterval: initialData ? false : 30000,
    });

    const cards = [
        {
            title: "Total Employees",
            value: stats?.totalEmployees ?? "0",
            change: "+2 this month",
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/10",
            border: "border-primary/20",
        },
        {
            title: "Present Today",
            value: stats?.presentToday ?? "0",
            change: `${stats?.totalEmployees ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% attendance`,
            icon: UserCheck,
            color: "text-green-600",
            bg: "bg-green-100/50",
            border: "border-green-200/50",
        },
        {
            title: "Pending Standups",
            value: stats?.pendingRequests ?? "0",
            change: "Items to review",
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-100/50",
            border: "border-amber-200/50",
        },
        {
            title: "Company Health",
            value: `${stats?.performance ?? 92}%`,
            change: "Target: 95%",
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-100/50",
            border: "border-purple-200/50",
        },
    ];

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse bg-muted/20 border-none h-24" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((stat, index) => (
                <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                    <Card className={`relative overflow-hidden border ${stat.border} bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full ${stat.bg} blur-2xl opacity-50`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.title}</CardTitle>
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} border ${stat.border}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stat.bg} ${stat.color} border ${stat.border}`}>
                                    {stat.change}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
