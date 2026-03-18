"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Users, Target, Coffee, PlayCircle, LogOut, Zap, CheckCircle2, AlertCircle, Edit2, CheckSquare, TrendingUp, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAttendance } from "@/hooks/use-attendance";
import { getEmployeeDashboardStats, submitStandupAction } from "@/actions/employee-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { punchInAction, punchOutAction, startBreakAction, resumeWorkAction } from "@/actions/attendance";
import { toast } from "sonner";
import { format } from "date-fns";
import { WorkModeToggle } from "@/components/attendance/work-mode-toggle";
import { Task, Standup } from "@/types/dashboard";

interface TeamMemberPresence {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  status: string;
  punch_in: string | null;
  punch_out: string | null;
}

interface DashboardStats {
  todayHours: number;
  focusTasks: number;
  weeklyHours: number;
  streak: number;
  totalBreakSeconds: number;
  lastBreakStartTime: string | null;
  focusTasksList: Task[];
  teamPresence: TeamMemberPresence[];
  todayStandup: Standup | null;
  completedToday: { id: string, title: string }[];
}

export default function EmployeeDashboardPage() {
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

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["employee-dashboard-stats"],
    queryFn: async () => {
      const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const res = await getEmployeeDashboardStats(localDate);
      return res.ok ? (res.stats as DashboardStats) : null;
    },
    staleTime: 30000,
    refetchInterval: 30000, // Poll every 30s so team presence stays live
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0); // Displayed break time
  const [baseBreakSeconds, setBaseBreakSeconds] = useState(0); // Completed breaks only
  const [lastBreakStartTime, setLastBreakStartTime] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [isBreakPending, setIsBreakPending] = useState(false);
  const [workMode, setWorkMode] = useState<"office" | "home">("office");
  const [isSubmittingStandup, setIsSubmittingStandup] = useState(false);
  const [isEditingStandup, setIsEditingStandup] = useState(false);
  const [showTeamPresence, setShowTeamPresence] = useState(false);
  const [accomplishedText, setAccomplishedText] = useState("");
  const isFirstLoad = useRef(true);

  // Refetch team presence data every time the popup is opened
  useEffect(() => {
    if (showTeamPresence) {
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
    }
  }, [showTeamPresence, queryClient]);

  // Sync state with stats from useQuery
  useEffect(() => {
    if (stats) {
      const totalBreaks = stats.totalBreakSeconds || 0;
      const currentBreakStart = stats.lastBreakStartTime;
      setLastBreakStartTime(currentBreakStart);

      setBreakSeconds(totalBreaks);

      if (currentBreakStart) {
        const startTs = new Date(currentBreakStart).getTime();
        const nowTs = new Date().getTime();
        const currentDuration = Math.floor((nowTs - startTs) / 1000);
        setBaseBreakSeconds(Math.max(0, totalBreaks - currentDuration));
      } else {
        setBaseBreakSeconds(totalBreaks);
      }

      // Pre-fill accomplished if no standup exists yet
      if (isFirstLoad.current) {
        if (!stats.todayStandup && (stats.completedToday?.length ?? 0) > 0) {
          const suggestions = stats.completedToday.map((t: { id: string, title: string }) => `• ${t.title}`).join('\n');
          setAccomplishedText(suggestions);
        } else if (stats.todayStandup) {
          setAccomplishedText(stats.todayStandup.tasks_completed || "");
        }
        isFirstLoad.current = false;
      }
    }
  }, [stats]);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();

      // 1. Calculate Break Time
      let currentBreakDuration = 0;
      if (status === "on_break" && lastBreakStartTime) {
        const start = new Date(lastBreakStartTime).getTime();
        currentBreakDuration = Math.max(0, Math.floor((now - start) / 1000));
        setBreakSeconds(baseBreakSeconds + currentBreakDuration);
      } else {
        // Not on break, so break time is just the base (completed)
        setBreakSeconds(baseBreakSeconds);
      }

      // 2. Calculate Working Time
      if ((status === "working" || status === "on_break") && punchInAt) {
        const start = new Date(punchInAt).getTime();
        const timeSincePunchIn = Math.floor((now - start) / 1000);

        // Working time = (Time since punch in) - (Total Break Time)
        // Total Break Time = baseBreakSeconds + currentBreakDuration
        const totalBreak = baseBreakSeconds + currentBreakDuration;
        setElapsedTime(Math.max(0, timeSincePunchIn - totalBreak));

      } else if (status === "completed" && punchInAt && punchOutAt) {
        const start = new Date(punchInAt).getTime();
        const end = new Date(punchOutAt).getTime();
        // In completed state, baseBreakSeconds should hold the final total break time from server
        setElapsedTime(Math.max(0, Math.floor((end - start) / 1000) - baseBreakSeconds));
      } else {
        setElapsedTime(0);
      }
    };

    calculateTime(); // Initial update
    const intervalId = setInterval(calculateTime, 1000);

    return () => clearInterval(intervalId);
  }, [status, punchInAt, punchOutAt, lastBreakStartTime, baseBreakSeconds]);

  const handleToggleBreak = async () => {
    setIsBreakPending(true);
    if (status === "on_break") {
      const res = await resumeWorkAction();
      if (res.ok) {
        setBreak(false);
        toast.success("Resumed work");
        // Invalidate both status and dashboard stats
        queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
        queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
      } else {
        toast.error(res.message || "Failed to resume work");
      }
    } else {
      const res = await startBreakAction();
      if (res.ok) {
        setBreak(true);
        toast.success("Break started");
        queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
        queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
      } else {
        toast.error(res.message || "Failed to start break");
      }
    }
    setIsBreakPending(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePunchIn = async () => {
    setIsPunching(true);
    const formData = new FormData();
    formData.append("workMode", workMode);
    const res = await punchInAction(formData);
    if (res.ok && res.data?.punch_in) {
      setPunchIn(res.data.punch_in);
      toast.success("Punched in successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
    } else if (!res.ok) {
      toast.error(res.message || "Failed to punch in");
    }
    setIsPunching(false);
  };

  const handlePunchOut = async () => {
    setIsPunching(true);
    const res = await punchOutAction();
    if (res.ok && res.data?.punch_out) {
      setPunchOut(res.data.punch_out);
      toast.success("Punched out successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
    } else if (!res.ok) {
      toast.error(res.message || "Failed to punch out");
    }
    setIsPunching(false);
  };

  const handleStandupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingStandup(true);
    const formData = new FormData(e.currentTarget);
    const res = await submitStandupAction(formData);
    if (res.ok) {
      toast.success("Standup updated successfully");
      setIsEditingStandup(false);
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
    } else {
      toast.error(res.message || "Failed to update standup");
    }
    setIsSubmittingStandup(false);
  };

  // Helper to format text into bullet points for display
  const formatPointWise = (text: string) => {
    if (!text) return null;
    return text.split('\n').filter(line => line.trim()).map((line, i) => (
      <div key={i} className="flex gap-2 items-start mb-1">
        <span className="text-blue-500 mt-1.5">•</span>
        <span>{line.replace(/^[•\-\*]\s*/, '')}</span>
      </div>
    ));
  };

  const handleAppendSuggestion = (title: string) => {
    const point = `• ${title}`;
    if (accomplishedText.includes(point)) {
      toast.info("Already added to your list");
      return;
    }
    setAccomplishedText(prev => prev ? `${prev}\n${point}` : point);
    toast.success("Added to accomplishments");
  };

  const isPunchedIn = status === "working" || status === "on_break";
  const isCompleted = status === "completed";
  const workingTime = formatTime(elapsedTime);
  const breakTime = formatTime(breakSeconds);
  const isOvertime = elapsedTime > 8 * 3600;

  // Show a full-screen spinner ONLY if we have NO data at all (first load)
  if ((isAttendanceLoading || isLoadingStats) && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const teamPresent = stats?.teamPresence?.filter((m: TeamMemberPresence) => m.status === 'present') || [];
  const teamOnBreak = stats?.teamPresence?.filter((m: TeamMemberPresence) => m.status === 'on_break') || [];
  const teamCompleted = stats?.teamPresence?.filter((m: TeamMemberPresence) => m.status === 'completed') || [];
  // All currently punched-in (working + on break)
  const teamPunchedIn = [...teamPresent, ...teamOnBreak];

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                <Target className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">My Workspace</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Welcome Back</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              Track your day, manage tasks, and stay connected with your team.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
            {status === "offline" ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <WorkModeToggle value={workMode} onChange={setWorkMode} disabled={isPunching} />
                <Button
                  onClick={handlePunchIn}
                  disabled={isPunching}
                  className="gap-2 font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                >
                  <PlayCircle className="h-4 w-4" />
                  Punch In
                </Button>
              </div>
            ) : status === "working" ? (
              <>
                <Button
                  onClick={handleToggleBreak}
                  disabled={isBreakPending}
                  variant="outline"
                  className="gap-2 font-bold border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400"
                >
                  <Coffee className="h-4 w-4" />
                  Take Break
                </Button>
                <Button
                  onClick={handlePunchOut}
                  disabled={isPunching}
                  variant="destructive"
                  className="gap-2 font-bold shadow-lg shadow-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  Punch Out
                </Button>
              </>
            ) : status === "on_break" ? (
              <>
                <Button
                  onClick={handleToggleBreak}
                  disabled={isBreakPending}
                  className="gap-2 font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                >
                  <PlayCircle className="h-4 w-4" />
                  Resume Work
                </Button>
                <Button
                  onClick={handlePunchOut}
                  disabled={isPunching}
                  variant="destructive"
                  className="gap-2 font-bold shadow-lg shadow-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  Punch Out
                </Button>
              </>
            ) : status === "completed" ? (
              <Badge variant="outline" className="gap-2 py-1.5 px-3 border-zinc-200 bg-zinc-50 text-zinc-600 font-black uppercase">
                <CheckCircle2 className="h-4 w-4" />
                Shift Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-2 py-1.5 px-3 border-zinc-200 bg-zinc-50 text-zinc-400 font-black uppercase">
                <Zap className="h-4 w-4" />
                Offline
              </Badge>
            )}
          </motion.div>
        </header>

        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          {(isPunchedIn || isCompleted) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1"
            >
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden h-full flex flex-col">
                <CardContent className="p-0 flex-1 flex flex-col">
                  <div className="p-6 text-center md:text-left space-y-1.5 flex-1 flex flex-col justify-center border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-zinc-500 dark:text-zinc-400">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Active Session</span>
                    </div>
                    <div className={`text-4xl font-black ${isOvertime ? 'text-orange-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {workingTime}
                    </div>
                    {isOvertime && (
                      <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-600 text-[8px] font-black uppercase tracking-widest px-1.5 h-4 w-fit mx-auto md:mx-0">
                        Overtime
                      </Badge>
                    )}
                  </div>

                  <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-6 space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.1em]">
                        <span className="text-zinc-400">Shift Progress</span>
                        <span className="text-primary font-bold">{Math.min(Math.round((elapsedTime / (8 * 3600)) * 100), 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-1000"
                          style={{ width: `${Math.min((elapsedTime / (8 * 3600)) * 100), 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <Coffee className={`h-3 w-3 ${status === "on_break" ? "text-orange-500 animate-pulse" : "text-zinc-400"}`} />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Break Time</span>
                        </div>
                        <span className={`text-xl font-black ${status === "on_break" ? "text-orange-500" : "text-zinc-300 dark:text-zinc-700"}`}>
                          {breakTime}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Live Status</span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${status === "on_break" ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20" :
                            status === "working" ? "bg-primary/10 text-primary dark:bg-primary/20" :
                              "bg-zinc-50 text-zinc-400 dark:bg-zinc-800"
                            }`}
                        >
                          {status === "on_break" ? "Resting" : status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className={`${(isPunchedIn || isCompleted) ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className={`grid gap-4 ${(isPunchedIn || isCompleted) ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
              <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Today&apos;s Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                    {stats?.todayHours || 0}h
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Expected: 8h</p>
                </CardContent>
              </Card>

              <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Today&apos;s Focus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stats?.focusTasks || 0}</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Tasks marked for today</p>
                </CardContent>
              </Card>

              <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Current Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-orange-600">🔥 {stats?.streak || 0} days</div>
                  <Badge
                    variant="outline"
                    className="mt-2 h-5 w-fit border-orange-200 bg-orange-50 px-2 text-[9px] font-black uppercase tracking-widest text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300"
                  >
                    Excludes Sundays
                  </Badge>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Keep it going!</p>
                </CardContent>
              </Card>

              <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{stats?.weeklyHours || 0}h</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Target: 40h</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Daily Standup</CardTitle>
                  <CardDescription>Keep your team updated on your progress</CardDescription>
                </div>
                {stats?.todayStandup && !isEditingStandup && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingStandup(true)} className="gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {(!stats?.todayStandup || isEditingStandup) ? (
                  <form onSubmit={handleStandupSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-zinc-500 uppercase tracking-wider">What I accomplished</label>
                          {stats?.completedToday && (stats.completedToday.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                              {stats.completedToday.map((task: { id: string, title: string }) => (
                                <Badge
                                  key={task.id}
                                  variant="outline"
                                  className="text-[9px] bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20 text-primary border-primary/20 cursor-pointer transition-colors"
                                  onClick={() => handleAppendSuggestion(task.title)}
                                >
                                  + {task.title}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Textarea
                          name="accomplished"
                          placeholder="What did you achieve recently?"
                          value={accomplishedText}
                          onChange={(e) => setAccomplishedText(e.target.value)}
                          className="min-h-[120px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-sm"
                          required
                        />
                        <p className="text-[10px] text-zinc-400 font-medium">Tip: Click suggestions above to add them</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase tracking-wider">What I&apos;m planning</label>
                        <Textarea
                          name="planned"
                          placeholder="What are your goals for today?"
                          defaultValue={stats?.todayStandup?.tasks_planned || ""}
                          className="min-h-[120px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase tracking-wider">Blockers (Optional)</label>
                        <Textarea
                          name="blockers"
                          placeholder="Anything slowing you down?"
                          defaultValue={stats?.todayStandup?.blockers || ""}
                          className="min-h-[80px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-500 uppercase tracking-wider">Status</label>
                        <Select name="status" defaultValue={stats?.todayStandup?.notes || "on_track"}>
                          <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-bold">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on_track">On Track</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="pt-4 flex gap-3">
                          <Button type="submit" disabled={isSubmittingStandup} className="flex-1 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold h-11">
                            {isSubmittingStandup ? "Submitting..." : stats?.todayStandup ? "Save Changes" : "Submit Standup"}
                          </Button>
                          {isEditingStandup && (
                            <Button type="button" variant="outline" onClick={() => setIsEditingStandup(false)} className="h-11">
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg text-white">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-black text-primary uppercase text-xs tracking-widest">Status: {stats?.todayStandup?.notes?.replace('_', ' ') || 'ON TRACK'}</p>
                          <p className="text-[10px] text-primary/80 dark:text-primary/60 font-bold">Last updated {stats?.todayStandup ? format(new Date(stats.todayStandup.updated_at || stats.todayStandup.created_at), 'hh:mm a') : 'N/A'}</p>
                        </div>
                      </div>
                      <Badge className="bg-primary font-bold">LIVE UPDATE</Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Accomplishments</p>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                          {formatPointWise(stats?.todayStandup?.tasks_completed || "")}
                        </div>
                      </div>
                      <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Plans for today</p>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                          {formatPointWise(stats?.todayStandup?.tasks_planned || "")}
                        </div>
                      </div>
                    </div>
                    {stats?.todayStandup?.blockers && (
                      <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Current Blockers</p>
                        </div>
                        <div className="text-sm text-red-700 dark:text-red-400 font-medium">
                          {formatPointWise(stats?.todayStandup?.blockers || "")}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Team Presence Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => {
                  setShowTeamPresence(true);
                  // Always fetch fresh presence data when opening the popup
                  queryClient.invalidateQueries({ queryKey: ["employee-dashboard-stats"] });
                }}
                className="w-full group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-5 hover:shadow-xl hover:shadow-green-500/10 hover:border-green-400/40 dark:hover:border-green-600/30 transition-all duration-300 text-left"
              >
                {/* Animated bg glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon with pulse ring */}
                    <div className="relative">
                      <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      {teamPunchedIn.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                          <span className="text-[8px] font-black text-white leading-none">{teamPunchedIn.length}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">Team Presence</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                        {teamPunchedIn.length > 0
                          ? `${teamPresent.length} working · ${teamOnBreak.length} on break`
                          : 'No one punched in yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/30 rounded-full px-2.5 py-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                      <span className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 tracking-wider">Live</span>
                    </div>

                    {/* Arrow */}
                    <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors duration-300">
                      <Radio className="h-3.5 w-3.5 text-zinc-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300" />
                    </div>
                  </div>
                </div>

                {/* Mini avatar row preview */}
                {teamPunchedIn.length > 0 && (
                  <div className="relative mt-4 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {teamPunchedIn.slice(0, 5).map((m: TeamMemberPresence, i: number) => (
                        <div
                          key={i}
                          title={m.full_name || 'Member'}
                          className={`h-7 w-7 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-sm bg-gradient-to-br ${m.status === 'on_break' ? 'from-orange-400 to-amber-500' : 'from-green-400 to-emerald-600'}`}
                          style={{ zIndex: 5 - i }}
                        >
                          {m.avatar_url ? (
                            <Image src={m.avatar_url} alt={m.full_name || ''} width={28} height={28} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-white">{(m.full_name as string)?.charAt(0) || '?'}</span>
                          )}
                        </div>
                      ))}
                      {teamPunchedIn.length > 5 && (
                        <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-sm">
                          <span className="text-[9px] font-black text-zinc-500">+{teamPunchedIn.length - 5}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">Click to view all active members</span>
                  </div>
                )}
              </button>
            </motion.div>

            {/* Active Members Dialog */}
            <Dialog open={showTeamPresence} onOpenChange={setShowTeamPresence}>
              <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200/60 dark:border-green-800/40 flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100">Who&apos;s In Today</DialogTitle>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                          {teamPresent.length} working &nbsp;·&nbsp; {teamOnBreak.length} on break &nbsp;·&nbsp; {teamCompleted.length} punched out
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200/40 rounded-full px-2.5 py-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                      <span className="text-[10px] font-black uppercase text-green-600 tracking-wider">Live</span>
                    </div>
                  </div>
                </DialogHeader>

                <div className="max-h-[440px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
                  {teamPunchedIn.length === 0 && teamCompleted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                        <Users className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">No one has punched in yet</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-1">Employees who punch in today will appear here.</p>
                    </div>
                  ) : (
                    <>
                      {/* Active members: working + on break */}
                      {teamPunchedIn.map((m: TeamMemberPresence, i: number) => {
                        const isOnBreak = m.status === 'on_break';
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md bg-gradient-to-br ${isOnBreak ? 'from-orange-400 to-amber-500' : 'from-green-400 to-emerald-600'}`}>
                                  {m.avatar_url ? (
                                    <Image src={m.avatar_url} alt={m.full_name || 'Member'} width={40} height={40} className="h-full w-full rounded-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-black text-white">{(m.full_name as string)?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 ${isOnBreak ? 'bg-orange-400' : 'bg-green-500'}`}></span>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{m.full_name || 'Unknown'}</p>
                                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-tight">{m.role || 'Member'}</p>
                              </div>
                            </div>
                            <Badge className={`text-[10px] font-black uppercase tracking-wide px-2 h-5 border ${isOnBreak
                              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/40'
                              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200/60 dark:border-green-800/40'
                              }`}>
                              {isOnBreak ? '☕ On Break' : '● Working'}
                            </Badge>
                          </motion.div>
                        );
                      })}

                      {/* Punched-out members */}
                      {teamCompleted.length > 0 && (
                        <>
                          <div className="px-6 py-2 bg-red-50/60 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900/30">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/70">Punched Out</p>
                          </div>
                          {teamCompleted.map((m: TeamMemberPresence, i: number) => (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex items-center justify-between px-6 py-4 bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="h-10 w-10 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700 opacity-80">
                                    {m.avatar_url ? (
                                      <Image src={m.avatar_url} alt={m.full_name || 'Member'} width={40} height={40} className="h-full w-full rounded-full object-cover grayscale opacity-70" />
                                    ) : (
                                      <span className="text-sm font-black text-white">{(m.full_name as string)?.charAt(0) || '?'}</span>
                                    )}
                                  </div>
                                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 bg-red-500"></span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{m.full_name || 'Unknown'}</p>
                                  <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-tight">{m.role || 'Member'}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <Badge className="text-[10px] font-black uppercase tracking-wide px-2 h-5 border bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-800/40">
                                  ✕ Punched Out
                                </Badge>
                                {m.punch_out && (
                                  <span className="text-[10px] font-bold text-red-400 dark:text-red-500">
                                    at {format(new Date(m.punch_out), 'hh:mm a')}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Footer summary */}
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <span className="text-green-600">{teamPresent.length} Working</span>
                    <span className="text-orange-500">{teamOnBreak.length} On Break</span>
                    <span className="text-blue-500">{teamCompleted.length} Done</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold">Todo Overview</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 font-bold px-2" onClick={() => window.location.href = '/employee/tasks'}>View All</Button>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {!stats?.focusTasksList || stats.focusTasksList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-6 w-6 text-zinc-300" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {stats.focusTasksList.map((task: Task, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-orange-500' : 'bg-primary'}`} />
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{task.title}</span>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-black uppercase px-1 h-4">
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            {task.due_date ? `Due: ${format(new Date(task.due_date), 'MMM d')}` : 'No due date'}
                          </span>
                          <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-[9px] uppercase font-bold h-4">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
