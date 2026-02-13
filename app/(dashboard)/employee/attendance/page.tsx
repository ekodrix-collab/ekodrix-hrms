"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  MapPin,
  PlayCircle,
  LogOut,
  AlertCircle,
  Coffee,
  CheckCircle2,
  TrendingUp,
  History as HistoryIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAttendance } from "@/hooks/use-attendance";
import { getAttendanceHistory, punchInAction, punchOutAction, startBreakAction, resumeWorkAction } from "@/actions/attendance";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import type { AttendanceRecord } from "@/types/dashboard";
import { WorkModeToggle } from "@/components/attendance/work-mode-toggle";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";

export default function EmployeeAttendancePage() {
  const queryClient = useQueryClient();
  const {
    status,
    punchInAt,
    punchOutAt,
    isLoading: isAttendanceLoading,
    setPunchIn,
    setPunchOut,
    setBreak
  } = useAttendance();
  const todayIST = new Date().toISOString().slice(0, 10);

  const { data: history = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-history"],
    queryFn: async () => {
      const res = await getAttendanceHistory();
      if (!res.ok) throw new Error(res.message || "Failed to fetch attendance history");
      return res.data || [];
    }
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPunching, setIsPunching] = useState(false);
  const [isBreakPending, setIsBreakPending] = useState(false);
  const [workMode, setWorkMode] = useState<"office" | "home">("office");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "working" && punchInAt) {
      const calculateElapsed = () => {
        const start = new Date(punchInAt).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      };

      calculateElapsed();
      interval = setInterval(calculateElapsed, 1000);
    } else if (status === "on_break") {
      setElapsedTime(prev => prev);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [status, punchInAt]);

  const handlePunchIn = async () => {
    setIsPunching(true);
    const formData = new FormData();
    formData.append("workMode", workMode);
    const res = await punchInAction(formData);
    if (res.ok && res.data?.punch_in) {
      setPunchIn(res.data.punch_in);
      toast.success("Punched in successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
    } else if (!res.ok) {
      toast.error(res.message || "Failed to punch in");
    }
    setIsPunching(false);
  };

  const handleToggleBreak = async () => {
    setIsBreakPending(true);
    if (status === "on_break") {
      const res = await resumeWorkAction();
      if (res.ok) {
        setBreak(false);
        toast.success("Resumed work");
      } else {
        toast.error(res.message || "Failed to resume work");
      }
    } else {
      const res = await startBreakAction();
      if (res.ok) {
        setBreak(true);
        toast.success("Break started");
      } else {
        toast.error(res.message || "Failed to start break");
      }
    }
    setIsBreakPending(false);
  };

  const handlePunchOut = async () => {
    setIsPunching(true);
    const res = await punchOutAction();
    if (res.ok && res.data?.punch_out) {
      setPunchOut(res.data.punch_out);
      toast.success("Punched out successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
    } else if (!res.ok) {
      toast.error(res.message || "Failed to punch out");
    }
    setIsPunching(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isAttendanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen pb-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Attendance Tracker</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Daily Presence</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              Manage your work hours and maintain a healthy work-life balance.
            </p>
          </motion.div>
        </header>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Current Session</CardTitle>
                  <CardDescription>Real-time tracking of your shift</CardDescription>
                </div>
                <Badge variant={status === "working" ? "default" : "secondary"} className="uppercase font-black">
                  {status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-8 pt-4">
                <div className="flex flex-col md:flex-row items-center justify-around gap-8 py-8 border-y border-zinc-100 dark:border-zinc-800">
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Time Elapsed</p>
                    <h2 className="text-6xl font-black tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatTime(elapsedTime)}
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 w-full max-w-[240px]">
                    {status === "offline" ? (
                      <div className="space-y-4">
                        <WorkModeToggle value={workMode} onChange={setWorkMode} disabled={isPunching} />
                        <Button
                          onClick={handlePunchIn}
                          disabled={isPunching}
                          size="lg"
                          className="w-full h-14 gap-3 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-lg font-black"
                        >
                          <PlayCircle className="h-6 w-6" />
                          START SHIFT
                        </Button>
                      </div>
                    ) : status === "completed" ? (
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-100 dark:border-green-900/30">
                        <p className="text-green-600 font-black mb-1 flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5" /> Completed
                        </p>
                        <p className="text-xs text-green-700/60 font-bold uppercase">Shift finished for today</p>
                        <Button onClick={handlePunchIn} variant="outline" size="sm" className="text-xs text-zinc-500 mt-2">Re-punch?</Button>
                      </div>
                    ) : (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Button
                            onClick={handlePunchOut}
                            disabled={isPunching}
                            size="lg"
                            variant="destructive"
                            className="w-full h-14 gap-3 shadow-lg shadow-red-500/20 text-lg font-black"
                          >
                            <LogOut className="h-6 w-6" />
                            END SHIFT
                          </Button>
                        </motion.div>
                        <Button
                          variant="outline"
                          className="h-12 font-bold gap-2"
                          onClick={handleToggleBreak}
                          disabled={isBreakPending || isPunching}
                        >
                          <Coffee className="h-5 w-5" />
                          {status === "on_break" ? "Resume Work" : "Take Break"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "PUNCH IN", value: punchInAt ? format(new Date(punchInAt), "hh:mm a") : "-", icon: PlayCircle },
                    { label: "PUNCH OUT", value: punchOutAt ? format(new Date(punchOutAt), "hh:mm a") : "-", icon: LogOut },
                    { label: "LOCATION", value: "Office HQ", icon: MapPin },
                    { label: "WORK MODE", value: history.find((h: AttendanceRecord) => h.date === todayIST)?.work_mode || "Office", icon: AlertCircle },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <item.icon className="h-3 w-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-xs">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <AttendanceCalendar logs={history} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none bg-primary text-white shadow-xl shadow-primary/20 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-transparent pointer-events-none" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-8 w-8 text-white/50" />
                  <Badge className="bg-white/20 hover:bg-white/30 border-none text-white font-bold">Week 04</Badge>
                </div>
                <h3 className="text-lg font-bold text-white/80">Weekly Performance</h3>
                <div className="text-4xl font-black mt-1">98.5%</div>
                <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "98.5%" }}
                    className="h-full bg-white"
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-white/60">2.5% higher than last week</p>
              </CardContent>
            </Card>

            <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-xl shadow-zinc-200/50 dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-primary" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-sm font-bold text-zinc-500">Avg. Punch In</span>
                  <span className="font-black">09:12 AM</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-sm font-bold text-zinc-500">Overtime Hours</span>
                  <span className="font-black text-orange-600">12.5h</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="text-sm font-bold text-zinc-500">Days Present</span>
                  <span className="font-black text-green-600">22 / 24</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Recent History</h2>
            <Button variant="outline" size="sm" className="font-bold text-primary">View Full Logs</Button>
          </div>

          <div className="grid gap-3">
            {history.map((entry: AttendanceRecord, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-md transition-all group">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                        {format(new Date(entry.date), "dd")}
                      </div>
                      <div>
                        <p className="font-black text-sm">{format(new Date(entry.date), "EEEE, MMMM dd")}</p>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{entry.status}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">In</p>
                        <p className="text-sm font-bold">{entry.punch_in ? format(new Date(entry.punch_in), "hh:mm a") : "-"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Out</p>
                        <p className="text-sm font-bold">{entry.punch_out ? format(new Date(entry.punch_out), "hh:mm a") : "-"}</p>
                      </div>
                      <div className="text-center min-w-[60px]">
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Total</p>
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black">
                          {entry.total_hours || "0"}h
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
