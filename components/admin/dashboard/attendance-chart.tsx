"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getAttendanceTrends } from "@/actions/dashboard";
import { motion } from "framer-motion";

interface AttendanceTrend {
    name: string;
    attendance: number;
    date?: string;
    isToday?: boolean;
}

export function AttendanceChart({ data: initialData }: { data?: AttendanceTrend[] }) {
    const { data: trends, isLoading } = useQuery({
        queryKey: ["attendance-trends"],
        queryFn: () => getAttendanceTrends(),
        initialData,
        refetchInterval: initialData ? false : 30000,
    });

    if (isLoading) {
        return <Card className="col-span-4 animate-pulse bg-muted/20 border-none h-[350px]" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="col-span-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
                <CardHeader>
                    <CardTitle>Attendance Trends</CardTitle>
                    <CardDescription>
                        Presence over the last 7 days
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [
                                        `${value} ${value === 1 ? "employee" : "employees"}`,
                                        "Present",
                                    ]}
                                    labelFormatter={(_, payload) => {
                                        const entry = payload?.[0]?.payload as AttendanceTrend | undefined;
                                        if (!entry?.date) return "Presence";
                                        const formattedDate = new Intl.DateTimeFormat("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            timeZone: "Asia/Kolkata",
                                        }).format(new Date(`${entry.date}T00:00:00+05:30`));
                                        return `${entry.name} - ${formattedDate}`;
                                    }}
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "none",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                                    }}
                                    cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                                />
                                <Bar
                                    dataKey="attendance"
                                    radius={[8, 8, 0, 0]}
                                    fill="hsl(var(--primary))"
                                    maxBarSize={56}
                                >
                                    {trends?.map((entry: AttendanceTrend, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--primary)/0.35)"}
                                            className="transition-all duration-300 hover:opacity-80"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
