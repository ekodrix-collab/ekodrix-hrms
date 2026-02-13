"use client";

import { StatsCards } from "@/components/admin/dashboard/stats-cards";
import { AttendanceChart } from "@/components/admin/dashboard/attendance-chart";
import { BlockersList } from "@/components/admin/dashboard/blockers-list";
import { TeamOverview } from "@/components/admin/dashboard/team-overview";
import { RecentActivity } from "@/components/admin/dashboard/recent-activity";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import { TeamMood } from "@/components/admin/dashboard/team-mood";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText, LayoutDashboard, Settings2, RefreshCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
            <Button variant="outline" size="sm" className="hidden sm:flex h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <FileText className="h-4 w-4" />
              Analytics
            </Button>
            <Button className="h-10 px-6 gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 bg-primary hover:bg-primary/90 font-bold border-none">
              <PlusCircle className="h-4 w-4" />
              Invite Employee
            </Button>
          </motion.div>
        </header>

        <section className="space-y-8">
          <QuickActions />
          <StatsCards data={dashboardData?.stats} />
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

          <TabsContent value="real-time" className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl opacity-50">
            <div className="text-center space-y-3">
              <Settings2 className="h-8 w-8 mx-auto text-zinc-400" />
              <p className="font-bold text-zinc-500">Advanced real-time metrics are being initialized...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
