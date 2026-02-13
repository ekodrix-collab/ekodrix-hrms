"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    isToday,
    isAfter,
    isSunday
} from "date-fns";
import { ChevronLeft, ChevronRight, Building2, Home, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { AttendanceRecord } from "@/types/dashboard";

interface AttendanceCalendarProps {
    logs: AttendanceRecord[];
    className?: string;
}

export function AttendanceCalendar({ logs, className }: AttendanceCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get days of the week starting from Sunday (0) or Monday (1)
    // We'll use Monday as start of week
    const startDay = getDay(monthStart);
    const paddingBefore = Array.from({ length: startDay === 0 ? 6 : startDay - 1 });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const getAttendanceForDay = (day: Date) => {
        return logs.find(log => isSameDay(new Date(log.date), day));
    };

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <div className={cn("bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm", className)}>
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                        {format(currentMonth, "MMMM yyyy")}
                    </h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Attendance Geography</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px mb-4">
                {weekDays.map(day => (
                    <div key={day} className="text-center py-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{day}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {paddingBefore.map((_, i) => (
                    <div key={`padding-${i}`} className="aspect-square" />
                ))}
                {days.map(day => {
                    const attendance = getAttendanceForDay(day);
                    const isFuture = isAfter(day, new Date()) && !isToday(day);
                    const isSun = isSunday(day);
                    const isPastWorkday = !isFuture && !isToday(day) && !isSun;
                    const isAbsent = isPastWorkday && !attendance;

                    return (
                        <TooltipProvider key={day.toISOString()}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "aspect-square rounded-xl border flex flex-col items-center justify-center relative cursor-default transition-all duration-300 group",
                                        isToday(day) ? "border-indigo-600 shadow-lg shadow-indigo-500/10" :
                                            isAbsent ? "border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5" :
                                                "border-zinc-100 dark:border-zinc-800",
                                        isFuture ? "opacity-30" : "hover:border-zinc-300 dark:hover:border-zinc-600"
                                    )}>
                                        <span className={cn(
                                            "text-[10px] font-bold mb-1",
                                            isToday(day) ? "text-indigo-600" :
                                                isAbsent ? "text-red-400" :
                                                    "text-zinc-400"
                                        )}>
                                            {format(day, "d")}
                                        </span>

                                        {attendance ? (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className={cn(
                                                    "w-6 h-6 rounded-lg flex items-center justify-center",
                                                    attendance.work_mode === 'home'
                                                        ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20"
                                                        : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20"
                                                )}
                                            >
                                                {attendance.work_mode === 'home' ? <Home className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                            </motion.div>
                                        ) : isAbsent ? (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </motion.div>
                                        ) : !isFuture && !isToday(day) && (
                                            <div className="w-6 h-6 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-300">
                                                {/* Sunday or empty status */}
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                {(attendance || isAbsent) && (
                                    <TooltipContent className="p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        {attendance ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        attendance.status === 'present' ? "bg-green-500" : "bg-red-500"
                                                    )} />
                                                    <span className="text-xs font-black uppercase tracking-widest">{attendance.status}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-bold uppercase">
                                                        {attendance.work_mode || 'office'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] font-black text-zinc-400 uppercase">Punch In</p>
                                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                            {attendance.punch_in ? format(new Date(attendance.punch_in), "hh:mm a") : "-"}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-0.5 text-right">
                                                        <p className="text-[9px] font-black text-zinc-400 uppercase">Punch Out</p>
                                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                            {attendance.punch_out ? format(new Date(attendance.punch_out), "hh:mm a") : "-"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Total Hours</span>
                                                    <span className="text-xs font-black text-indigo-600">{attendance.total_hours || "0"}h</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="text-xs font-black text-red-600 uppercase tracking-widest">Absent</span>
                                                <span className="text-[10px] text-zinc-400 font-medium">No punch-in recorded</span>
                                            </div>
                                        )}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                        <Building2 className="h-2 w-2" />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Office Presence</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                        <Home className="h-2 w-2" />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Remote (WFH)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                        <X className="h-1.5 w-1.5" />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-indigo-600 bg-white dark:bg-zinc-900" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Today</span>
                </div>
            </div>
        </div>
    );
}

