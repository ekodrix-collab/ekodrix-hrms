"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvoiceSummary } from "@/actions/invoices";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "framer-motion";

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    color,
    delay,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: "easeOut" }}
        >
            <Card className="border-none shadow-lg shadow-zinc-200/40 dark:shadow-none bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl overflow-hidden">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                {label}
                            </p>
                            <p className="text-2xl font-black tabular-nums text-zinc-900 dark:text-zinc-100">
                                {value}
                            </p>
                            {sub && (
                                <p className="mt-1 text-[11px] font-bold text-muted-foreground truncate">
                                    {sub}
                                </p>
                            )}
                        </div>
                        <div className={`p-2.5 rounded-xl ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

interface InvoiceStatsCardsProps {
    currencySymbol?: string;
}

export function InvoiceStatsCards({ currencySymbol = "₹" }: InvoiceStatsCardsProps) {
    const { data: summary } = useQuery({
        queryKey: ["invoice-summary"],
        queryFn: getInvoiceSummary,
        staleTime: 30_000,
    });

    const fmt = (n: number) =>
        `${currencySymbol}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Total Invoices"
                value={summary?.total ?? 0}
                icon={FileText}
                color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                delay={0}
            />
            <StatCard
                label="Paid"
                value={summary?.paid ?? 0}
                sub={`Revenue: ${fmt(summary?.totalRevenue ?? 0)}`}
                icon={CheckCircle2}
                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                delay={0.05}
            />
            <StatCard
                label="Pending"
                value={summary?.pending ?? 0}
                sub={`Awaiting: ${fmt(summary?.pendingRevenue ?? 0)}`}
                icon={Clock}
                color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                delay={0.1}
            />
            <StatCard
                label="Cancelled"
                value={summary?.cancelled ?? 0}
                icon={XCircle}
                color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                delay={0.15}
            />
        </div>
    );
}
