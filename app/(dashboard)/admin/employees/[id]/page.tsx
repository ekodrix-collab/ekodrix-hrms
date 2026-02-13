import { getEmployeeById, getEmployeeAttendance, getEmployeeStats, getEmployeeStandups, getEmployeeTasks } from "@/actions/employees";
import { EmployeeDetailsHeader } from "@/components/admin/employees/employee-details-header";
import { EmployeeAttendanceReport } from "@/components/admin/employees/employee-attendance-report";
import { EmployeeStandups } from "@/components/admin/employees/employee-standups";
import { EmployeeCompensation } from "@/components/admin/employees/employee-compensation";
import { EmployeeStatsCards } from "@/components/admin/employees/employee-stats-cards";
import { EmployeeTasks } from "@/components/admin/employees/employee-tasks";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, ListTodo, Banknote, ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";

export default async function EmployeeDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { profile, error } = await getEmployeeById(id);

    if (error || !profile) {
        return notFound();
    }

    const [attendance, stats, standups, tasks] = await Promise.all([
        getEmployeeAttendance(id),
        getEmployeeStats(id),
        getEmployeeStandups(id),
        getEmployeeTasks(id),
    ]);

    return (
        <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
            <EmployeeDetailsHeader profile={profile} />

            <EmployeeStatsCards employeeId={id} initialStats={stats} totalTasks={tasks.tasks.length} />

            <Tabs defaultValue="attendance" className="space-y-6">
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

                <TabsContent value="attendance" className="mt-0 space-y-6">
                    <AttendanceCalendar logs={attendance.logs} />
                    <EmployeeAttendanceReport logs={attendance.logs} employeeId={id} />
                </TabsContent>
                <TabsContent value="standups" className="mt-0">
                    <EmployeeStandups standups={standups.standups} />
                </TabsContent>
                <TabsContent value="tasks" className="mt-0">
                    <EmployeeTasks tasks={tasks.tasks} />
                </TabsContent>
                <TabsContent value="compensation" className="mt-0">
                    <EmployeeCompensation profile={profile} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
