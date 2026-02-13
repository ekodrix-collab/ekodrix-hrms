"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { getFinancialOverview } from "@/actions/analytics";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialOverview {
    month: string;
    expense: number;
    revenue: number;
}

export function FinancialTrend({ data: initialData }: { data?: FinancialOverview[] }) {
    const { data, isLoading } = useQuery({
        queryKey: ["financial-overview"],
        queryFn: () => getFinancialOverview(),
        initialData,
        refetchInterval: initialData ? false : 30000,
    });

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-3xl" />;
    }

    return (
        <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Financial Overview</CardTitle>
                <CardDescription>Revenue vs Operative Expenses (INR)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
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
                            <Legend verticalAlign="top" align="right" />
                            <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="expense" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
