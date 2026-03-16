"use client";

import { StatsCards } from "@/components/admin/dashboard/stats-cards";
import { AttendanceChart } from "@/components/admin/dashboard/attendance-chart";
import { BlockersList } from "@/components/admin/dashboard/blockers-list";
import { TeamOverview } from "@/components/admin/dashboard/team-overview";
import { RecentActivity } from "@/components/admin/dashboard/recent-activity";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import { TeamMood } from "@/components/admin/dashboard/team-mood";
import { InviteEmployeeModal } from "@/components/admin/dashboard/invite-employee-modal";
import { RealTimeMetrics } from "@/components/admin/dashboard/real-time-metrics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, LayoutDashboard, RefreshCcw, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { getAdminDashboardData } from "@/actions/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["admin-dashboard-data"],
    queryFn: () => getAdminDashboardData(),
    refetchInterval: 60000, // Refresh every 1m
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-20 w-1/3 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="h-[400px] w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-0">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Administrative Hub</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Executive Dashboard</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              Real-time intelligence for your organization&apos;s performance and operations.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className={`gap-2 h-10 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all ${isRefreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:flex h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <Link href="/admin/analytics">
                <FileText className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <InviteEmployeeModal triggerClassName="h-10 px-6 gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 bg-primary hover:bg-primary/90 font-bold border-none" />
          </motion.div>
        </header>

        <section className="space-y-8">
          <QuickActions />
          <StatsCards
            data={dashboardData?.stats}
            teamPresence={dashboardData?.teamPresence}
          />
        </section>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <TabsList className="bg-transparent gap-8 h-auto p-0">
              {["Overview", "Real-time Metrics", "Team Dynamics"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase().split(' ')[0]}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Updates Enabled
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6 outline-none mt-4 pb-0">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8">
                <AttendanceChart data={dashboardData?.trends} />
              </div>
              <div className="xl:col-span-4">
                <TeamMood />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch mb-0">
              <BlockersList data={dashboardData?.blockers} />
              <TeamOverview data={dashboardData?.distributions} />
              <RecentActivity data={dashboardData?.activities} />
            </div>
          </TabsContent>

          <TabsContent value="real-time" className="space-y-6 outline-none mt-4 pb-0">
            <RealTimeMetrics
              teamPresence={dashboardData?.teamPresence || []}
              totalEmployees={dashboardData?.stats?.totalEmployees || 0}
            />
          </TabsContent>

          <TabsContent value="dynamics" className="space-y-6 outline-none mt-4 pb-0">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-4">
                <TeamOverview data={dashboardData?.distributions} />
              </div>
              <div className="xl:col-span-8">
                <Card className="h-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg p-8">
                  <div className="flex flex-col h-full justify-center space-y-6">
                    <div>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Workforce Intelligence</h3>
                      <p className="text-zinc-500 font-medium">Deep insights into team composition and performance metrics.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Male/Female Ratio", value: "52% / 48%", color: "text-blue-500" },
                        { label: "Contractor Ratio", value: "15%", color: "text-purple-500" },
                        { label: "Avg. Tenure", value: "2.4 Years", color: "text-orange-500" },
                        { label: "Culture Score", value: "4.8/5.0", color: "text-green-500" }
                      ].map((stat) => (
                        <div key={stat.label} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                          <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-1">{stat.label}</p>
                          <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold">Team stability is trending upwards this quarter.</span>
                      </div>
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none font-bold">+4.2%</Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
