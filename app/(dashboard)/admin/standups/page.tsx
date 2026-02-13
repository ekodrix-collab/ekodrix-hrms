"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllStandups, getAllEmployees } from "@/actions/standups";
import { StandupList } from "@/components/admin/standups/standup-list";
import { StandupFilters, type StandupEmployee } from "@/components/admin/standups/standup-filters";
import { motion } from "framer-motion";
import { ListTodo, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StandupsPage() {
    const [filters, setFilters] = useState({
        userId: "all",
        startDate: "",
        endDate: "",
        hasBlockers: false,
    });

    const { data: employeesData } = useQuery<{ employees: StandupEmployee[] }>({
        queryKey: ["all-employees"],
        queryFn: () => getAllEmployees(),
    });

    const { data: standupsData, isLoading } = useQuery({
        queryKey: ["all-standups", filters],
        queryFn: () => getAllStandups(filters),
        refetchInterval: 30000, // Auto-refresh every 30 seconds
    });

    const handleReset = () => {
        setFilters({
            userId: "all",
            startDate: "",
            endDate: "",
            hasBlockers: false,
        });
    };

    return (
        <div className="bg-[#fafafa] dark:bg-black/95 min-h-screen transition-colors duration-500">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative space-y-8 px-4 md:px-8 py-8 max-w-[1400px] mx-auto animate-in fade-in duration-700">
                {/* Header */}
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
                                <ListTodo className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Operations</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Daily Standups</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                            Monitor team progress, plan focus areas, and address urgent blockers in real-time.
                        </p>
                    </motion.div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-10 gap-2 font-bold border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                            <Download className="h-4 w-4" />
                            Export Report
                        </Button>
                        <Button className="h-10 px-6 gap-2 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 bg-blue-600 hover:bg-blue-700 font-bold border-none">
                            <Share2 className="h-4 w-4" />
                            Share Summary
                        </Button>
                    </div>
                </header>

                {/* Filters */}
                <StandupFilters
                    employees={employeesData?.employees || []}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={handleReset}
                />

                {/* Stats Summary (Optional) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white/40 dark:bg-zinc-900/40 border-none shadow-sm backdrop-blur-md">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Reports</div>
                        <div className="text-2xl font-black">{standupsData?.standups?.length || 0}</div>
                    </Card>
                    <Card className="p-4 bg-white/40 dark:bg-zinc-900/40 border-none shadow-sm backdrop-blur-md">
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Active Blockers</div>
                        <div className="text-2xl font-black text-red-600">{standupsData?.standups?.filter(s => s.blockers).length || 0}</div>
                    </Card>
                    {/* Add more tiny stats here if needed */}
                </div>

                {/* List Container */}
                <StandupList
                    standups={standupsData?.standups || []}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}

function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 p-6 ${className}`} {...props}>
            {children}
        </div>
    );
}
