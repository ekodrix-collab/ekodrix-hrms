"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getDepartmentDistribution } from "@/actions/dashboard";
interface DepartmentDistribution {
    name: string;
    count: number;
    total: number;
}

export function TeamOverview({ data: initialData }: { data?: DepartmentDistribution[] }) {
    const { data: departments, isLoading } = useQuery({
        queryKey: ["team-distribution"],
        queryFn: () => getDepartmentDistribution(),
        initialData,
        refetchInterval: initialData ? false : 45000,
    });

    if (isLoading) {
        return <Card className="col-span-3 animate-pulse bg-muted/20 border-none h-[350px]" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="h-full"
        >
            <Card className="h-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Department Insights</CardTitle>
                            <CardDescription>
                                Real-time team distribution
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="font-bold border-zinc-200 dark:border-zinc-800">
                            {departments?.length || 0} Depts
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {departments?.map((dept, index) => (
                            <motion.div
                                key={dept.name}
                                className="space-y-2"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{dept.name}</span>
                                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                        {dept.count} Members
                                    </span>
                                </div>
                                <Progress
                                    value={(dept.count / (dept.total || 1)) * 100}
                                    className="h-2 bg-zinc-100 dark:bg-zinc-800"
                                />
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">
                                Retention Rate
                            </p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">98.5%</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">
                                Engagement
                            </p>
                            <p className="text-2xl font-black text-primary">High</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
