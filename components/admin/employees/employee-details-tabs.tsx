"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    getEmployeeAttendance,
    getEmployeeStats,
    getEmployeeStandups,
    getEmployeeTaskCount,
    getEmployeeTasks,
} from "@/actions/employees";
import { EmployeeDetailsHeader } from "@/components/admin/employees/employee-details-header";
import { EmployeeAttendanceReport } from "@/components/admin/employees/employee-attendance-report";
import { EmployeeStandups } from "@/components/admin/employees/employee-standups";
import { EmployeeCompensation } from "@/components/admin/employees/employee-compensation";
import { EmployeeStatsCards } from "@/components/admin/employees/employee-stats-cards";
import { EmployeeTasks } from "@/components/admin/employees/employee-tasks";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ListTodo, Banknote, ClipboardList } from "lucide-react";
import { Profile } from "@/types/auth";
import { AttendanceRecord, Standup } from "@/types/dashboard";

type EmployeeTask = {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    completed_at?: string;
};

interface EmployeeStats {
    totalHours: number;
    daysPresent: number;
    attendanceRate: number;
}

interface EmployeeDetailsTabsProps {
    employeeId: string;
    profile: Profile;
}

const defaultStats: EmployeeStats = {
    totalHours: 0,
    daysPresent: 0,
    attendanceRate: 0,
};

function AttendanceTabSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-[420px] w-full rounded-2xl" />
            <Skeleton className="h-[360px] w-full rounded-2xl" />
        </div>
    );
}

function ListTabSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
    );
}

export function EmployeeDetailsTabs({ employeeId, profile }: EmployeeDetailsTabsProps) {
    const [activeTab, setActiveTab] = useState("attendance");

    const { data: stats } = useQuery<EmployeeStats>({
        queryKey: ["employee-stats", employeeId],
        queryFn: () => getEmployeeStats(employeeId),
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    const { data: taskCountData } = useQuery({
        queryKey: ["employee-task-count", employeeId],
        queryFn: () => getEmployeeTaskCount(employeeId),
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    const { data: tasksData, isLoading: isTasksLoading } = useQuery({
        queryKey: ["employee-tasks", employeeId],
        queryFn: async () => {
            const res = await getEmployeeTasks(employeeId);
            return res.tasks as EmployeeTask[];
        },
        staleTime: 60_000,
        refetchInterval: 60_000,
        enabled: activeTab === "tasks",
    });

    const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
        queryKey: ["employee-attendance", employeeId],
        queryFn: async () => {
            const res = await getEmployeeAttendance(employeeId);
            return res.logs as AttendanceRecord[];
        },
        staleTime: 30_000,
        refetchInterval: 30_000,
        enabled: activeTab === "attendance",
    });

    const { data: standupsData, isLoading: isStandupsLoading } = useQuery({
        queryKey: ["employee-standups", employeeId],
        queryFn: async () => {
            const res = await getEmployeeStandups(employeeId);
            return res.standups as Standup[];
        },
        staleTime: 60_000,
        refetchInterval: 60_000,
        enabled: activeTab === "standups",
    });

    const tasks = tasksData ?? [];
    const attendanceLogs = attendanceData ?? [];
    const standups = standupsData ?? [];
    const totalTasks = taskCountData?.count ?? 0;

    return (
        <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
            <EmployeeDetailsHeader profile={profile} />

            <EmployeeStatsCards
                stats={stats ?? defaultStats}
                totalTasks={totalTasks}
            />

            <Tabs defaultValue="attendance" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="bg-white/50 dark:bg-zinc-900/50 p-1.5 rounded-xl inline-flex backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 flex-wrap">
                    <TabsList className="bg-transparent gap-1 h-auto py-1">
                        <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all">
                            <BarChart3 className="mr-2 h-4 w-4 font-black" />
                            Attendance
                        </TabsTrigger>
                        <TabsTrigger value="standups" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all">
                            <ListTodo className="mr-2 h-4 w-4 font-black" />
                            Standups
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all">
                            <ClipboardList className="mr-2 h-4 w-4 font-black" />
                            Tasks
                        </TabsTrigger>
                        <TabsTrigger value="compensation" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all">
                            <Banknote className="mr-2 h-4 w-4 font-black" />
                            Compensation
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="attendance" className="space-y-6">
                    {isAttendanceLoading && attendanceLogs.length === 0 ? (
                        <AttendanceTabSkeleton />
                    ) : (
                        <>
                            <AttendanceCalendar logs={attendanceLogs} />
                            <EmployeeAttendanceReport logs={attendanceLogs} />
                        </>
                    )}
                </TabsContent>

                <TabsContent value="standups">
                    {isStandupsLoading && standups.length === 0 ? (
                        <ListTabSkeleton />
                    ) : (
                        <EmployeeStandups standups={standups} />
                    )}
                </TabsContent>

                <TabsContent value="tasks">
                    {isTasksLoading && tasks.length === 0 ? (
                        <ListTabSkeleton />
                    ) : (
                        <EmployeeTasks tasks={tasks} />
                    )}
                </TabsContent>

                <TabsContent value="compensation">
                    <EmployeeCompensation profile={profile} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
