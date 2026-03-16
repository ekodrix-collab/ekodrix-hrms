"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAttendanceLogs, getDashboardStats } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { AttendanceLog } from "@/types/dashboard";
import { AdminTeamPresence } from "@/components/admin/dashboard/admin-team-presence";

type StatCardKey = "employees" | "attendance" | "standups" | "health";

export function StatsCards({ data: initialData, teamPresence = [] }: {
    data?: {
        totalEmployees: number;
        presentToday: number;
        pendingRequests: number;
        performance: number;
    },
    teamPresence?: any[]
}) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: () => getDashboardStats(),
        initialData,
        refetchInterval: initialData ? false : 30000,
    });
    const [activeCard, setActiveCard] = useState<StatCardKey | null>(null);
    const todayIstDate = useMemo(
        () =>
            new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date()),
        []
    );

    const { data: attendanceLogs = [], isLoading: isAttendanceLoading } = useQuery<AttendanceLog[]>({
        queryKey: ["dashboard-attendance-modal", todayIstDate],
        queryFn: () => getAttendanceLogs(todayIstDate),
        enabled: activeCard === "attendance",
    });

    const cards = [
        {
            key: "employees" as const,
            title: "Total Employees",
            value: stats?.totalEmployees ?? "0",
            change: "+2 this month",
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/10",
            border: "border-primary/20",
        },
        {
            key: "attendance" as const,
            title: "Present Today",
            value: stats?.presentToday ?? "0",
            change: `${stats?.totalEmployees ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% attendance`,
            icon: UserCheck,
            color: "text-green-600",
            bg: "bg-green-100/50",
            border: "border-green-200/50",
        },
        {
            key: "standups" as const,
            title: "Pending Standups",
            value: stats?.pendingRequests ?? "0",
            change: "Items to review",
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-100/50",
            border: "border-amber-200/50",
        },
        {
            key: "health" as const,
            title: "Company Health",
            value: `${stats?.performance ?? 92}%`,
            change: "Target: 95%",
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-100/50",
            border: "border-purple-200/50",
        },
    ];

    const activeStat = cards.find((card) => card.key === activeCard) || null;
    const currentAttendance = attendanceLogs.filter((log) => log.status === "present");

    const modalContent = useMemo(
        () => ({
            employees: {
                title: "Team Capacity",
                description: "Headcount trends, invite status, and role distribution.",
                primaryCta: "Open Employee Directory",
                primaryHref: "/admin/employees",
                secondaryCta: "Invite Employee",
                secondaryHref: "/admin/employees/invite",
            },
            attendance: {
                title: "Attendance Snapshot",
                description: "Track who is in, late arrivals, and recent attendance patterns.",
                primaryCta: "Open Attendance",
                primaryHref: "/admin/attendance",
                secondaryCta: "Review Standups",
                secondaryHref: "/admin/standups",
            },
            standups: {
                title: "Standup Review Queue",
                description: "Review daily standup submissions and blockers from the team.",
                primaryCta: "Open Standups",
                primaryHref: "/admin/standups",
                secondaryCta: "Open Inbox",
                secondaryHref: "/admin/inbox",
            },
            health: {
                title: "Performance Pulse",
                description: "Cross-check company score against analytics and current operational signals.",
                primaryCta: "Open Analytics",
                primaryHref: "/admin/analytics",
                secondaryCta: "Open Finance",
                secondaryHref: "/admin/finance",
            },
        }),
        []
    );

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
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveCard(stat.key)}
                            className="w-full text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                            aria-label={`Open details for ${stat.title}`}
                        >
                            <Card className={`relative overflow-hidden border ${stat.border} bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer`}>
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
                        </button>
                    </motion.div>
                ))}
            </div>

            <Dialog open={Boolean(activeCard)} onOpenChange={(open) => !open && setActiveCard(null)}>
                <DialogContent className="sm:max-w-[560px]">
                    {activeStat && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{modalContent[activeStat.key].title}</DialogTitle>
                                <DialogDescription>{modalContent[activeStat.key].description}</DialogDescription>
                            </DialogHeader>

                            <div className={`rounded-2xl border ${activeStat.border} p-4 space-y-2`}>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {activeStat.title}
                                    </p>
                                    <div className={`p-1.5 rounded-lg ${activeStat.bg} ${activeStat.color} border ${activeStat.border}`}>
                                        <activeStat.icon className="h-4 w-4" />
                                    </div>
                                </div>
                                <p className="text-3xl font-black">{activeStat.value}</p>
                                <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeStat.bg} ${activeStat.color} border ${activeStat.border}`}>
                                    {activeStat.change}
                                </span>
                            </div>

                        </>
                    )}
                </DialogContent>
            </Dialog>

            <AdminTeamPresence
                isOpen={activeCard === "attendance"}
                onOpenChange={(open: boolean) => !open && setActiveCard(null)}
                teamPresence={teamPresence}
                triggerElement={<span className="hidden" />}
            />
        </>
    );
}
