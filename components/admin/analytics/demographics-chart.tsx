"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { getDepartmentDistribution } from "@/actions/analytics";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface DemographicsData {
    name: string;
    value: number;
    color: string;
}

export function DemographicsChart({ data: initialData }: { data?: DemographicsData[] }) {
    const { data, isLoading } = useQuery({
        queryKey: ["department-distribution"],
        queryFn: () => getDepartmentDistribution(),
        initialData,
        refetchInterval: initialData ? false : 300000,
    });

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-3xl" />;
    }

    return (
        <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-sm h-full">
            <CardHeader>
                <CardTitle className="text-lg font-bold">Department Distribution</CardTitle>
                <CardDescription>Employee headcount by department</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data?.map((entry: DemographicsData, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
