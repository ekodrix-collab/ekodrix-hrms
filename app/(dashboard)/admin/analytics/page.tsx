"use client";

import { motion } from "framer-motion";
import { BarChart3, Download, Filter, Calendar, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsStats } from "@/components/admin/analytics/analytics-stats";
import { PerformanceChart } from "@/components/admin/analytics/performance-chart";
import { DemographicsChart } from "@/components/admin/analytics/demographics-chart";
import { FinancialTrend } from "@/components/admin/analytics/financial-trend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminAnalyticsData } from "@/actions/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function AnalyticsPage() {
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ["admin-analytics-data"],
        queryFn: () => getAdminAnalyticsData(),
        refetchInterval: 300000, // 5 mins
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries({ queryKey: ["admin-analytics-data"] });
        setTimeout(() => setIsRefreshing(false), 800);
    };

    if (isLoading && !analyticsData) {
        return (
            <div className="p-8 space-y-8">
                <div className="h-20 w-1/3 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 space-y-8">
                        <Skeleton className="h-[400px] rounded-3xl" />
                        <Skeleton className="h-[400px] rounded-3xl" />
                    </div>
                    <div className="xl:col-span-4">
                        <Skeleton className="h-[600px] rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#fafafa] dark:bg-black/95 min-h-screen transition-colors duration-500">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative space-y-8 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 py-8">
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                                <BarChart3 className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Insights & Analytics</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Organizational Intel</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                            Comprehensive data visualization of your company&apos;s vital signs and growth metrics.
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
                        <Button variant="outline" size="sm" className="h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <Calendar className="h-4 w-4" />
                            Last 6 Months
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 gap-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
                        <Button className="h-10 px-6 gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 font-bold">
                            <Download className="h-4 w-4" />
                            Export Report
                        </Button>
                    </motion.div>
                </header>

                <AnalyticsStats data={analyticsData?.stats} />

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 space-y-8">
                        <PerformanceChart data={analyticsData?.performance} />
                        <FinancialTrend data={analyticsData?.finance} />
                    </div>
                    <div className="xl:col-span-4 h-full">
                        <DemographicsChart data={analyticsData?.departments} />
                    </div>
                </div>
            </div>
        </div>
    );
}
