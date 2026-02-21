"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAttendanceLogs, getAbsentEmployees } from "@/actions/dashboard";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Loader2, Search, Filter, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function AdminAttendancePage() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-attendance-logs", date],
    queryFn: () => getAttendanceLogs(date),
  });

  const { data: absentEmployees, isLoading: isAbsentLoading } = useQuery({
    queryKey: ["admin-absent-employees", date],
    queryFn: () => getAbsentEmployees(date),
  });


  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100">Attendance Logs</h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base">Monitor real-time check-ins and check-outs.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 w-full sm:w-[240px] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-zinc-200 dark:border-zinc-800" placeholder="Search employee..." />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 sm:w-[160px] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-zinc-200 dark:border-zinc-800"
            />
            <Badge variant="outline" className="h-10 px-3 cursor-pointer hover:bg-muted transition-colors border-zinc-200 dark:border-zinc-800 shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Badge>
          </div>
        </div>
      </header>

      <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-lg">Daily activity</CardTitle>
          <CardDescription>Comprehensive list of all attendance records</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile View */}
          <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-muted-foreground">Syncing records....</p>
              </div>
            ) : logs && logs.length > 0 ? (
              logs.map((log: any) => (
                <div key={log.id} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/10">
                        <AvatarImage src={log.profiles.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black">
                          {log.profiles.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{log.profiles.full_name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{log.profiles.department}</p>
                      </div>
                    </div>
                    <Badge
                      variant={log.status === 'present' ? 'success' : 'destructive'}
                      className="text-[9px] font-black uppercase tracking-widest"
                    >
                      {log.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-zinc-400">Punch In</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Clock className="h-3 w-3 text-primary" />
                        {log.punch_in ? format(new Date(log.punch_in), 'hh:mm aa') : '—'}
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] font-black uppercase text-zinc-400">Punch Out</p>
                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold">
                        <Clock className="h-3 w-3 text-primary" />
                        {log.punch_out ? format(new Date(log.punch_out), 'hh:mm aa') : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-800">
                    <Badge variant="outline" className="text-[9px] font-bold bg-zinc-50 dark:bg-zinc-800/50">
                      {log.work_mode || 'office'}
                    </Badge>
                    <span className="text-xs font-black">
                      Total {log.total_hours ? `${log.total_hours}h` : '—'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center opacity-40">
                <p className="text-sm font-bold">No records found.</p>
              </div>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Work Mode</th>
                  <th className="px-6 py-4">Punch In</th>
                  <th className="px-6 py-4">Punch Out</th>
                  <th className="px-6 py-4 text-right">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                      <p className="text-sm font-bold text-muted-foreground">Syncing records...</p>
                    </td>
                  </tr>
                ) : logs && logs.length > 0 ? (
                  logs.map((log: any, index: number) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="group transition-colors hover:bg-primary/5 dark:hover:bg-primary/10"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-zinc-100 dark:border-zinc-800 shadow-sm transition-transform group-hover:scale-105">
                            <AvatarImage src={log.profiles.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                              {log.profiles.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{log.profiles.full_name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{log.profiles.department}</p>
                          </div>
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
                        <Badge
                          variant="outline"
                          className={`font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md ${log.work_mode === 'office'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : log.work_mode === 'home'
                              ? 'bg-purple-50 text-purple-600 border-purple-200'
                              : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                            }`}
                        >
                          {log.work_mode || 'office'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {log.punch_in ? format(new Date(log.punch_in), 'hh:mm aa') : '—'}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{format(new Date(log.date), 'MMM dd, yyyy')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {log.punch_out ? format(new Date(log.punch_out), 'hh:mm aa') : 'In progress'}
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
                    <td colSpan={6} className="px-6 py-20 text-center opacity-40">
                      <p className="text-sm font-bold">No attendance records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-lg text-rose-600">Absent Employees</CardTitle>
          <CardDescription>Employees who have not punched in for {format(new Date(date), 'MMM dd, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile View */}
          <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {isAbsentLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-rose-600 mb-2" />
                <p className="text-sm font-bold text-muted-foreground">Checking records...</p>
              </div>
            ) : absentEmployees && absentEmployees.length > 0 ? (
              absentEmployees.map((emp: any) => (
                <div key={emp.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-rose-100 dark:border-rose-900/30">
                      <AvatarImage src={emp.avatar_url} />
                      <AvatarFallback className="bg-rose-50 text-rose-600 font-black">
                        {emp.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{emp.full_name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{emp.department}</p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-[9px] font-black uppercase">Absent</Badge>
                </div>
              ))
            ) : (
              <div className="p-12 text-center opacity-40">
                <p className="text-sm font-bold">No absent employees.</p>
              </div>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isAbsentLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-rose-600 mb-2" />
                      <p className="text-sm font-bold text-muted-foreground">Checking records...</p>
                    </td>
                  </tr>
                ) : absentEmployees && absentEmployees.length > 0 ? (
                  absentEmployees.map((emp: any, index: number) => (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="group transition-colors hover:bg-rose-50/30 dark:hover:bg-rose-900/10"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="bg-rose-50 text-rose-600 font-black text-xs">
                              {emp.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{emp.full_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{emp.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                          Absent
                        </Badge>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center opacity-40">
                      <p className="text-sm font-bold">No absent employees found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
