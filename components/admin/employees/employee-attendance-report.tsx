"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Calendar as CalendarIcon, Home, Building2 } from "lucide-react";
import { motion } from "framer-motion";

import { useQuery } from "@tanstack/react-query";
import { getEmployeeAttendance } from "@/actions/employees";

import { AttendanceRecord } from "@/types/dashboard";

interface EmployeeAttendanceReportProps {
    logs: AttendanceRecord[];
    employeeId: string;
}

export function EmployeeAttendanceReport({ logs: initialLogs, employeeId }: EmployeeAttendanceReportProps) {
    const { data: logs } = useQuery({
        queryKey: ["employee-attendance", employeeId],
        queryFn: async () => {
            const res = await getEmployeeAttendance(employeeId);
            return res.logs;
        },
        initialData: initialLogs,
        refetchInterval: 30000,
    });
    return (
        <Card className="border-none shadow-sm bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-lg">Recent Attendance</CardTitle>
                <CardDescription>Detailed logs of punch-ins and punch-outs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Work Mode</th>
                                <th className="px-6 py-4">Punch In</th>
                                <th className="px-6 py-4">Punch Out</th>
                                <th className="px-6 py-4 text-right">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {logs.length > 0 ? (
                                logs.map((log: AttendanceRecord, index: number) => (
                                    <motion.tr
                                        key={log.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                {format(new Date(log.date), 'MMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                variant={log.status === 'present' ? 'success' : 'destructive'}
                                                className="font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md"
                                            >
                                                {log.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                                {log.work_mode === 'home' ? (
                                                    <><Home className="h-3 w-3" /> Home</>
                                                ) : (
                                                    <><Building2 className="h-3 w-3" /> Office</>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <Clock className="h-3 h-3 text-muted-foreground" />
                                                {log.punch_in ? format(new Date(log.punch_in), 'hh:mm aa') : '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold">
                                                <Clock className="h-3 h-3 text-muted-foreground" />
                                                {log.punch_out ? format(new Date(log.punch_out), 'hh:mm aa') : log.punch_in ? 'In progress' : '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black tabular-nums">
                                                {log.total_hours ? `${log.total_hours}h` : '—'}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center opacity-40">
                                        <p className="text-sm font-bold">No attendance records found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
