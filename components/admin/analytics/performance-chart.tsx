"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getPerformanceTrends } from "@/actions/analytics";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface PerformanceTrend {
    month: string;
    total: number;
    completed: number;
}

export function PerformanceChart({ data: initialData }: { data?: PerformanceTrend[] }) {
    const { data, isLoading } = useQuery({
        queryKey: ["performance-trends"],
        queryFn: () => getPerformanceTrends(),
        initialData,
        refetchInterval: initialData ? false : 30000,
    });

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-3xl" />;
    }

    return (
        <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Organizational Performance</CardTitle>
                <CardDescription>Metrics across completed vs total tasks</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                            />
                            <Area
                                type="monotone"
                                dataKey="completed"
                                stroke="#8B5CF6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCompleted)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
