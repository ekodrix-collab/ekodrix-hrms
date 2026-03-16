"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Activity, Clock, Zap } from "lucide-react";

interface TeamMember {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    status: string;
    punch_in: string | null;
}

interface RealTimeMetricsProps {
    teamPresence: TeamMember[];
    totalEmployees: number;
}

export function RealTimeMetrics({ teamPresence = [], totalEmployees }: RealTimeMetricsProps) {
    const workingCount = teamPresence.filter(m => m.status === "present").length;
    const attendanceRate = totalEmployees > 0 ? (workingCount / totalEmployees) * 100 : 0;

    return (
        <div className="space-y-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Attendance Gauge Card */}
                <Card className="md:col-span-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg flex flex-col items-center justify-center p-8 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors duration-700" />

                    <div className="relative w-48 h-48 mb-6">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-zinc-100 dark:text-zinc-800"
                            />
                            <motion.circle
                                cx="96"
                                cy="96"
                                r="88"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeDasharray={2 * Math.PI * 88}
                                initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - attendanceRate / 100) }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="text-primary"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100">{Math.round(attendanceRate)}%</span>
                            <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Attendance</span>
                        </div>
                    </div>

                    <div className="text-center space-y-1">
                        <CardTitle className="text-xl font-bold tracking-tight">{workingCount} of {totalEmployees}</CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Team Active Now</CardDescription>
                    </div>
                </Card>

                {/* Team Pulse Grid */}
                <Card className="md:col-span-8 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary animate-pulse" />
                                Real-time Team Pulse
                            </CardTitle>
                            <CardDescription>Live status of your active team</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-green-500/5 text-green-500 border-green-500/20 gap-1.5 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                            Live Updates
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {teamPresence.filter(m => m.status !== "completed").length === 0 ? (
                                <div className="col-span-full py-12 text-center text-zinc-500 flex flex-col items-center gap-3">
                                    <Clock className="w-8 h-8 text-zinc-300" />
                                    <p className="font-bold text-sm">No team members active right now.</p>
                                </div>
                            ) : (
                                teamPresence.filter(m => m.status !== "completed").map((member, idx) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="relative group h-full"
                                    >
                                        <div className="p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col items-center text-center gap-2">
                                            <div className="relative">
                                                <Avatar className="h-14 w-14 border-2 border-white dark:border-zinc-950 ring-2 ring-zinc-50 dark:ring-zinc-900 group-hover:scale-110 transition-transform duration-500">
                                                    <AvatarImage src={member.avatar_url || ""} />
                                                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary text-lg font-black">
                                                        {member.full_name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-950 ${member.status === 'present' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-orange-500'}`} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate w-24">
                                                    {member.full_name?.split(' ')[0]}
                                                </p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                    {member.status === 'present' ? 'Working' : 'On Break'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Micro Activity Feed / Recent Trends Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Live Insights</h4>
                            <p className="text-xs text-zinc-500">Instant signals from your team activity</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Peak Presence today</span>
                            <span className="text-sm font-black">{workingCount} members @ 10:30 AM</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Avg. Punch-in Time</span>
                            <span className="text-sm font-black">09:15 AM</span>
                        </div>
                    </div>
                </Card>

                <Card className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg overflow-hidden group">
                    <div className="p-6 h-full flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-48 h-48 -mb-24 -mr-24 bg-primary/10 blur-3xl rounded-full" />
                        <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-2">Team Engagement</h4>
                        <p className="text-sm text-zinc-500 mb-6 font-medium">Your team&apos;s active presence is <span className="text-primary font-bold">Excellent</span> compared to last week.</p>
                        <div className="flex gap-2">
                            <Badge className="bg-primary/20 text-primary border-none font-bold">+12% vs last week</Badge>
                            <Badge variant="outline" className="font-bold border-zinc-200 dark:border-zinc-800">High Sync</Badge>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
