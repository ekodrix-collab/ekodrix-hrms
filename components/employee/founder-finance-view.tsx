"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Landmark, Loader2, Wallet } from "lucide-react";
import { getCompanyFinanceDashboard, getCompanyFinancials } from "@/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FounderFinanceDashboard = {
    dateRange: {
        from: string;
        to: string;
    };
    summary: {
        openingBalance: number;
        periodRevenue: number;
        periodExpenses: number;
        netChange: number;
        closingBalance: number;
        totalTransactions: number;
        cashRevenue: number;
        approvedClaimRevenue: number;
        directExpenses: number;
        salaryExpenses: number;
        reimbursedClaimExpense: number;
    };
    ledger: {
        id: string;
        title: string;
        category: string;
        date: string;
        amount: number;
        type: "revenue" | "expense";
        sourceType?: "cash_revenue" | "claim_approval" | "claim_reimbursement" | "business_expense" | "salary_payment";
        person: string | null;
    }[];
};

type FounderFinancials = {
    totalRevenue: number;
    totalBusinessExpenses: number;
    netBalance: number;
    projectBreakdown: {
        id: string;
        name: string;
        revenue: number;
        expenses: number;
        net: number;
        brokerAmount?: number;
        employeeShare?: number;
    }[];
};

const inr = (value: number) =>
    `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

const DEFAULT_RANGE = {
    from: format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
};

export function FounderFinanceView() {
    const [range, setRange] = useState(DEFAULT_RANGE);
    const [activePreset, setActivePreset] = useState("12m");

    const { data: dashboard, isLoading: isDashboardLoading } = useQuery<FounderFinanceDashboard>({
        queryKey: ["founder-company-finance-dashboard", range.from, range.to],
        queryFn: () => getCompanyFinanceDashboard(range) as Promise<FounderFinanceDashboard>
    });

    const { data: financials, isLoading: isFinancialsLoading } = useQuery<FounderFinancials>({
        queryKey: ["founder-company-financials"],
        queryFn: () => getCompanyFinancials() as Promise<FounderFinancials>
    });

    const setPreset = (preset: string) => {
        const today = new Date();
        if (preset === "3m") {
            setRange({ from: format(startOfMonth(subMonths(today, 2)), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") });
        } else if (preset === "6m") {
            setRange({ from: format(startOfMonth(subMonths(today, 5)), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") });
        } else if (preset === "ytd") {
            setRange({ from: format(startOfYear(today), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") });
        } else {
            setRange(DEFAULT_RANGE);
            preset = "12m";
        }
        setActivePreset(preset);
    };

    if (isDashboardLoading || isFinancialsLoading) {
        return (
            <div className="flex min-h-[42vh] items-center justify-center rounded-2xl border border-zinc-100 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const summary = dashboard?.summary;
    const ledger = dashboard?.ledger ?? [];
    const projectBreakdown = financials?.projectBreakdown ?? [];


    return (
        <div className="space-y-6 pb-8">
            <header className="treasury-board p-0">
                <div className="relative space-y-2 px-5 py-6">
                    <div className="treasury-chip">
                        <Landmark className="h-3.5 w-3.5" />
                        Founder
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Company Treasury Overview</h1>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                        Read-only finance visibility for treasury and project performance.
                    </p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Time Period</CardTitle>
                    <CardDescription>Select date range to inspect company inflow and outflow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">From</p>
                            <Input
                                type="date"
                                value={range.from}
                                onChange={(event) => {
                                    setRange((previous) => ({ ...previous, from: event.target.value }));
                                    setActivePreset("custom");
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">To</p>
                            <Input
                                type="date"
                                value={range.to}
                                onChange={(event) => {
                                    setRange((previous) => ({ ...previous, to: event.target.value }));
                                    setActivePreset("custom");
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: "3m", label: "3M" },
                            { id: "6m", label: "6M" },
                            { id: "ytd", label: "YTD" },
                            { id: "12m", label: "12M" }
                        ].map((preset) => (
                            <Button
                                key={preset.id}
                                size="sm"
                                variant={activePreset === preset.id ? "default" : "outline"}
                                onClick={() => setPreset(preset.id)}
                            >
                                <CalendarRange className="h-3.5 w-3.5" />
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Opening Balance" value={inr(summary?.openingBalance ?? 0)} />
                <MetricCard label="Total Income" value={inr(summary?.periodRevenue ?? financials?.totalRevenue ?? 0)} tone="text-emerald-600 dark:text-emerald-300" />
                <MetricCard label="Total Expense" value={inr(summary?.periodExpenses ?? financials?.totalBusinessExpenses ?? 0)} tone="text-rose-600 dark:text-rose-300" />
                <MetricCard
                    label="Treasury Net"
                    value={inr(summary?.netChange ?? financials?.netBalance ?? 0)}
                    tone={(summary?.netChange ?? financials?.netBalance ?? 0) >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Income Breakdown</CardTitle>
                        <CardDescription>Where your selected period inflow came from.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Row
                            label="Cash Revenue"
                            value={summary?.cashRevenue ?? 0}
                            tone="text-emerald-600 dark:text-emerald-300"
                        />
                        <Row label="Approved Claims (Inflow)" value={summary?.approvedClaimRevenue ?? 0} tone="text-emerald-600 dark:text-emerald-300" />
                        <Row label="Total Income" value={summary?.periodRevenue ?? 0} tone="text-emerald-700 dark:text-emerald-200" strong />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Expense Breakdown</CardTitle>
                        <CardDescription>How outflow is split in this selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Row label="Direct Business Expense" value={summary?.directExpenses ?? 0} tone="text-rose-600 dark:text-rose-300" />
                        <Row label="Salary Expense" value={summary?.salaryExpenses ?? 0} tone="text-rose-600 dark:text-rose-300" />
                        <Row label="Claim Reimbursement" value={summary?.reimbursedClaimExpense ?? 0} tone="text-rose-600 dark:text-rose-300" />
                        <Row label="Total Expense" value={summary?.periodExpenses ?? 0} tone="text-rose-700 dark:text-rose-200" strong />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Project Finance Snapshot</CardTitle>
                    <CardDescription>Income, expense, and final profit for each project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {projectBreakdown.length === 0 && (
                        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No project finance records available yet.
                        </p>
                    )}

                    {projectBreakdown.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full min-w-[560px]">
                                <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Project</th>
                                        <th className="px-4 py-3">Income</th>
                                        <th className="px-4 py-3">Expense</th>
                                        <th className="px-4 py-3">Broker Fee</th>
                                        <th className="px-4 py-3">Team Share</th>
                                        <th className="px-4 py-3">Final Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {projectBreakdown
                                        .slice()
                                        .sort((left, right) => right.net - left.net)
                                        .map((project) => (
                                            <tr key={project.id}>
                                                <td className="px-4 py-3 text-sm font-semibold">{project.name}</td>
                                                <td className="px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{inr(project.revenue)}</td>
                                                <td className="px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{inr(project.expenses)}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-500">{inr(project.brokerAmount ?? 0)}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-500">{inr(project.employeeShare ?? 0)}</td>
                                                <td className={`px-4 py-3 text-sm font-black ${project.net >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"}`}>
                                                    {inr(project.net)}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Treasury Ledger</CardTitle>
                    <CardDescription>
                        Latest company-level inflow and outflow activity for {dashboard?.dateRange?.from ?? range.from} to {dashboard?.dateRange?.to ?? range.to}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {ledger.slice(0, 10).map((item) => {
                        const isRevenue = item.type === "revenue";
                        return (
                            <div key={item.id} className="flex items-center justify-between rounded-xl border p-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{item.category}</Badge>
                                        <p className="truncate text-sm font-semibold">{item.title}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {format(new Date(item.date), "MMM dd, yyyy, h:mm a")}
                                        {item.person ? ` - ${item.person}` : ""}
                                    </p>
                                </div>
                                <div className={`flex items-center gap-1 text-sm font-black ${isRevenue ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                                    {isRevenue ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                    {inr(Number(item.amount || 0))}
                                </div>
                            </div>
                        );
                    })}
                    {ledger.length === 0 && (
                        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No treasury transactions found for this period.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    {label}
                </div>
                <p className={`mt-3 text-xl font-black ${tone}`}>{value}</p>
            </CardContent>
        </Card>
    );
}

function Row({
    label,
    value,
    tone,
    strong = false,
    badges = []
}: {
    label: string;
    value: number;
    tone: string;
    strong?: boolean;
    badges?: string[];
}) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="truncate text-sm text-muted-foreground">{label}</p>
                {badges.length > 0 && (
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                        {badges.map((badge) => (
                            <Badge key={badge} variant="outline" className="max-w-[160px] truncate text-[10px]">
                                {badge}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
            <p className={`text-sm ${strong ? "font-black" : "font-semibold"} ${tone}`}>{inr(value)}</p>
        </div>
    );
}
