"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, CheckSquare } from "lucide-react";

interface EmployeeStats {
    totalHours: number;
    daysPresent: number;
    attendanceRate: number;
}

interface EmployeeStatsCardsProps {
    stats: EmployeeStats;
    totalTasks: number;
}

export function EmployeeStatsCards({ stats, totalTasks }: EmployeeStatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-primary/5 dark:bg-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Hours (30d)</CardTitle>
                    <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black tabular-nums">{stats.totalHours}h</div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Total working time</p>
                </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-emerald-500/5 dark:bg-emerald-500/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-600">Attendance</CardTitle>
                    <Calendar className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black tabular-nums">{stats.attendanceRate}%</div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">{stats.daysPresent} days present (30d)</p>
                </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary/5 dark:bg-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Tasks</CardTitle>
                    <CheckSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black tabular-nums">{totalTasks}</div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">Total assigned tasks</p>
                </CardContent>
            </Card>
        </div>
    );
}
