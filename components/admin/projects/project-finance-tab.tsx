"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCompanyFinancials,
    getFinancialHistory,
    getFinanceVerdicts,
    postFinanceVerdict,
    postRevenue,
    postBusinessExpense,
    getProjectContractAmount,
    updateProjectContractAmount
} from "@/actions/finance";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Plus,
    Loader2,
    ArrowUpRight,
    History,
    MessageSquare,
    PieChart,
    ArrowDownRight,
    FileText,
    Pencil,
    IndianRupee,
    AlertCircle,
    CheckCircle2,
    Receipt,
    Wallet,
    Target
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/types/dashboard";
import { PROJECT_EXPENSE_CATEGORIES } from "@/lib/finance-categories";
import { getProjectMembersAction } from "@/actions/projects";

interface ProjectFinanceTabProps {
    project: Project;
}

interface ProjectLedgerItem {
    id: string;
    type: "revenue" | "expense";
    amount: number | string;
    title: string;
    category: string;
    date: string;
    person?: string | null;
}

interface VerdictItem {
    id: string;
    content: string;
    created_at: string;
    profiles?: {
        avatar_url?: string | null;
        full_name?: string | null;
    } | null;
}



const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

const stagger = {
    animate: { transition: { staggerChildren: 0.08 } }
};

function inr(value: number) {
    return `₹${value.toLocaleString("en-IN")}`;
}

export function ProjectFinanceTab({ project }: ProjectFinanceTabProps) {
    const queryClient = useQueryClient();
    const [isVerdictOpen, setIsVerdictOpen] = useState(false);
    const [verdictContent, setVerdictContent] = useState("");
    const [isRevenueOpen, setIsRevenueOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [isContractOpen, setIsContractOpen] = useState(false);
    const [contractInput, setContractInput] = useState("");

    const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
    const [expenseForm, setExpenseForm] = useState({
        amount: "",
        description: "",
        category: PROJECT_EXPENSE_CATEGORIES[0],
        payment_method: "upi",
        employee_id: ""
    });

    const { data: projectMembers } = useQuery({
        queryKey: ["project-members", project.id],
        queryFn: () => getProjectMembersAction(project.id),
    });

    // ── Queries ──
    const { data: financials, isLoading: loadingFin } = useQuery({
        queryKey: ["project-financials", project.id],
        queryFn: () => getCompanyFinancials(project.id),
    });

    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ["project-history", project.id],
        queryFn: () => getFinancialHistory(project.id),
    });

    const { data: verdicts, isLoading: loadingVerdicts } = useQuery({
        queryKey: ["project-verdicts", project.id],
        queryFn: () => getFinanceVerdicts(project.id),
    });

    const { data: contractData, isLoading: loadingContract } = useQuery({
        queryKey: ["project-contract", project.id],
        queryFn: () => getProjectContractAmount(project.id),
    });

    // ── Mutations ──
    const contractMutation = useMutation({
        mutationFn: (amount: number) => updateProjectContractAmount(project.id, amount),
        onSuccess: (res) => {
            if (res.ok) {
                toast.success("Contract amount updated successfully");
                setIsContractOpen(false);
                setContractInput("");
                queryClient.invalidateQueries({ queryKey: ["project-contract", project.id] });
            } else {
                toast.error(res.message);
            }
        }
    });

    const verdictMutation = useMutation({
        mutationFn: (content: string) => postFinanceVerdict(project.id, content),
        onSuccess: (res) => {
            if (res.ok) {
                toast.success("Verdict posted successfully");
                setIsVerdictOpen(false);
                setVerdictContent("");
                queryClient.invalidateQueries({ queryKey: ["project-verdicts", project.id] });
            } else {
                toast.error(res.message);
            }
        }
    });

    const revenueMutation = useMutation({
        mutationFn: (data: typeof revenueForm) => postRevenue(Number(data.amount), data.source, data.description, project.id),
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Revenue posted successfully");
                setIsRevenueOpen(false);
                setRevenueForm({ amount: "", source: "", description: "" });
                queryClient.invalidateQueries({ queryKey: ["project-financials", project.id] });
                queryClient.invalidateQueries({ queryKey: ["project-history", project.id] });
                queryClient.invalidateQueries({ queryKey: ["project-contract", project.id] });
            } else {
                toast.error(res.error || "Failed to post revenue");
            }
        }
    });

    const expenseMutation = useMutation({
        mutationFn: (data: typeof expenseForm) => postBusinessExpense({
            amount: Number(data.amount),
            description: data.description,
            category: data.category,
            payment_method: data.payment_method,
            project_id: project.id,
            employee_id: data.employee_id || undefined
        }) as Promise<{ success: boolean; error?: string }>,
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Expense logged successfully");
                setIsExpenseOpen(false);
                setExpenseForm({
                    amount: "",
                    description: "",
                    category: PROJECT_EXPENSE_CATEGORIES[0],
                    payment_method: "upi",
                    employee_id: ""
                });
                queryClient.invalidateQueries({ queryKey: ["project-financials", project.id] });
                queryClient.invalidateQueries({ queryKey: ["project-history", project.id] });
            } else {
                toast.error(res.error || "Failed to log expense");
            }
        }
    });

    // ── Derived State ──
    const contractAmount = contractData?.amount ?? 0;
    const receivedAmount = financials?.totalRevenue ?? 0;
    const dueAmount = Math.max(0, contractAmount - receivedAmount);
    const receivedPercent = contractAmount > 0 ? Math.min(100, (receivedAmount / contractAmount) * 100) : 0;
    const isFullyPaid = contractAmount > 0 && dueAmount === 0;

    if (loadingFin || loadingHistory || loadingVerdicts || loadingContract) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Loading financials…</p>
            </div>
        );
    }

    return (
        <motion.div className="space-y-8" initial="initial" animate="animate" variants={stagger}>

            {/* ━━━ Contract Tracker Hero ━━━ */}
            <motion.div variants={fadeUp}>
                <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-xl shadow-primary/[0.04] dark:shadow-none overflow-hidden relative group rounded-2xl">
                    {/* Light Mode: Clean gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-primary/[0.02] to-violet-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800" />
                    {/* Accent Glow — subtle in light, pronounced in dark */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.06] dark:bg-primary/20 blur-[100px] -mr-32 -mt-32 rounded-full transition-all duration-700 group-hover:bg-primary/[0.1] dark:group-hover:bg-primary/30" />
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-violet-500/[0.04] dark:bg-violet-500/10 blur-[80px] -ml-20 -mb-20 rounded-full" />

                    <CardContent className="relative z-10 px-8 pb-8 pt-8">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 dark:bg-white/10 backdrop-blur-xl flex items-center justify-center border border-primary/10 dark:border-white/10 shadow-sm">
                                    <Target className="h-6 w-6 text-primary dark:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Contract Tracker</h3>
                                    <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-400 dark:text-white/40 mt-0.5">
                                        {isFullyPaid ? "✓ Fully Collected" : "Income Collection Status"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="bg-primary/10 hover:bg-primary/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-xl border border-primary/15 dark:border-white/10 text-primary dark:text-white font-black text-[10px] uppercase tracking-[0.15em] h-9 px-5 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
                                onClick={() => {
                                    setContractInput(contractAmount > 0 ? String(contractAmount) : "");
                                    setIsContractOpen(true);
                                }}
                            >
                                {contractAmount > 0 ? (
                                    <><Pencil className="h-3 w-3 mr-2" /> Edit</>
                                ) : (
                                    <><Plus className="h-3.5 w-3.5 mr-2" /> Set Contract</>
                                )}
                            </Button>
                        </div>

                        {contractAmount > 0 ? (
                            <>
                                {/* 3-Column Metric Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {/* Total Contract */}
                                    <div className="bg-zinc-50/80 dark:bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-zinc-200/60 dark:border-white/[0.08] hover:border-zinc-300/80 dark:hover:bg-white/[0.09] transition-all duration-300">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-7 w-7 rounded-lg bg-primary/10 dark:bg-white/10 flex items-center justify-center">
                                                <FileText className="h-3.5 w-3.5 text-primary/60 dark:text-white/60" />
                                            </div>
                                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400 dark:text-white/40">Total Contract</p>
                                        </div>
                                        <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                            {inr(contractAmount)}
                                        </p>
                                    </div>
                                    {/* Received */}
                                    <div className="bg-emerald-50/60 dark:bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-emerald-200/50 dark:border-white/[0.08] hover:border-emerald-300/70 dark:hover:bg-white/[0.09] transition-all duration-300">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600/70 dark:text-emerald-400/70">Received</p>
                                        </div>
                                        <p className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                                            {inr(receivedAmount)}
                                        </p>
                                    </div>
                                    {/* Due */}
                                    <div className={`backdrop-blur-xl rounded-2xl p-5 border transition-all duration-300 ${isFullyPaid
                                        ? 'bg-emerald-50/60 dark:bg-white/[0.06] border-emerald-200/50 dark:border-white/[0.08]'
                                        : 'bg-amber-50/60 dark:bg-white/[0.06] border-amber-200/50 dark:border-white/[0.08] hover:border-amber-300/70'
                                        } dark:hover:bg-white/[0.09]`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${isFullyPaid ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-amber-100 dark:bg-amber-500/20'
                                                }`}>
                                                {isFullyPaid ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                ) : (
                                                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                )}
                                            </div>
                                            <p className={`text-[10px] uppercase tracking-[0.2em] font-black ${isFullyPaid ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-amber-600/70 dark:text-amber-400/70'
                                                }`}>Due Amount</p>
                                        </div>
                                        <p className={`text-3xl font-black tracking-tight ${isFullyPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                                            }`}>
                                            {inr(dueAmount)}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400 dark:text-white/40">Collection Progress</span>
                                        <Badge className="text-[10px] font-black uppercase tracking-widest border-none px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                            {receivedPercent.toFixed(1)}%
                                        </Badge>
                                    </div>
                                    <div className="h-3 w-full bg-zinc-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full relative bg-gradient-to-r from-emerald-600 to-emerald-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${receivedPercent}%` }}
                                            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                                        </motion.div>
                                    </div>
                                    {dueAmount > 0 && (
                                        <p className="text-[11px] font-medium text-zinc-400 dark:text-white/30 flex items-center gap-1.5">
                                            <Wallet className="h-3.5 w-3.5" />
                                            {inr(dueAmount)} remaining to be collected
                                        </p>
                                    )}
                                    {isFullyPaid && (
                                        <p className="text-[11px] font-bold text-emerald-600/70 dark:text-emerald-400/60 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            All contract payments have been received
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/60 dark:border-white/10 flex items-center justify-center">
                                    <Receipt className="h-7 w-7 text-zinc-300 dark:text-white/20" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-bold text-zinc-400 dark:text-white/40">No contract amount set</p>
                                    <p className="text-xs text-zinc-300 dark:text-white/20 max-w-xs">Set a total contract value to start tracking collection progress against received revenue.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* ━━━ Stat Cards ━━━ */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5" variants={stagger}>
                <motion.div variants={fadeUp}>
                    <CompactStatCard
                        title="Revenue Collected"
                        value={inr(financials?.totalRevenue ?? 0)}
                        icon={TrendingUp}
                        color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                        description="Total income from this project"
                    />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <CompactStatCard
                        title="Expenditure"
                        value={inr(financials?.totalBusinessExpenses ?? 0)}
                        icon={TrendingDown}
                        color="bg-gradient-to-br from-rose-500 to-rose-600"
                        description="Direct expenses for this project"
                    />
                </motion.div>
                <motion.div variants={fadeUp}>
                    <CompactStatCard
                        title="Net Profitability"
                        value={inr(financials?.netBalance ?? 0)}
                        icon={DollarSign}
                        color="bg-gradient-to-br from-primary to-violet-600"
                        description="Project runway / net balance"
                        trend={financials?.netBalance && financials.netBalance >= 0 ? "positive" : "negative"}
                    />
                </motion.div>
            </motion.div>

            {/* ━━━ Ledger + Sidebar ━━━ */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8" variants={fadeUp}>
                {/* Transaction Ledger */}
                <Card className="lg:col-span-2 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/30 dark:shadow-none bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg font-black flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <History className="h-4 w-4 text-primary" />
                                </div>
                                Project Ledger
                            </CardTitle>
                            <CardDescription className="mt-1 ml-[42px]">Financial history of {project.name}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 dark:hover:border-emerald-800 transition-all duration-200"
                                onClick={() => setIsRevenueOpen(true)}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Revenue
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:hover:bg-rose-950 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-all duration-200"
                                onClick={() => setIsExpenseOpen(true)}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Expense
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 text-[10px] uppercase font-black text-muted-foreground/60 border-y border-zinc-100 dark:border-zinc-800 tracking-[0.15em]">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left">Date</th>
                                        <th className="px-6 py-3.5 text-left">Transaction</th>
                                        <th className="px-6 py-3.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100/80 dark:divide-zinc-800/60">
                                    {(history as ProjectLedgerItem[] | undefined)?.map((item, idx: number) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                            className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors duration-200"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-[11px] font-bold text-muted-foreground/70 tabular-nums">{format(new Date(item.date), 'MMM dd, yyyy')}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${item.type === 'revenue'
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                                                        }`}>
                                                        {item.type === 'revenue' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                                                            {item.person && !item.title ? item.person : (item.title || item.category)}
                                                        </p>
                                                        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50">
                                                            {item.category}{item.person && item.title ? ` — ${item.person}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-sm font-black tabular-nums ${item.type === 'revenue' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {item.type === 'revenue' ? '+' : '−'} {inr(Number(item.amount))}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {(!history || history.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                        <History className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                                                    </div>
                                                    <p className="text-sm font-bold text-muted-foreground/40">No financial activity recorded</p>
                                                    <p className="text-xs text-muted-foreground/30">Add revenue or expenses to get started</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Financial Verdicts */}
                    <Card className="border-none shadow-xl shadow-zinc-200/30 dark:shadow-none bg-primary text-white overflow-hidden relative rounded-2xl">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 blur-2xl -ml-8 -mb-8 rounded-full" />
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-black flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 opacity-80" />
                                Financial Verdicts
                            </CardTitle>
                            <CardDescription className="text-white/50 text-xs">Strategic decisions & budget notes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {(verdicts?.data as VerdictItem[] | undefined)?.slice(0, 3).map((verdict) => (
                                    <motion.div
                                        key={verdict.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white/[0.08] backdrop-blur-md p-3.5 rounded-xl border border-white/[0.12] hover:bg-white/[0.12] transition-colors duration-200"
                                    >
                                        <p className="text-[11px] font-medium leading-relaxed mb-2.5 text-white/90">&quot;{verdict.content}&quot;</p>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 border border-white/20">
                                                    <AvatarImage src={verdict.profiles?.avatar_url ?? undefined} />
                                                    <AvatarFallback className="text-[8px] font-black text-primary bg-white">{verdict.profiles?.full_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] font-bold opacity-70">{verdict.profiles?.full_name}</span>
                                            </div>
                                            <span className="text-[9px] opacity-40 font-black uppercase tracking-widest">{format(new Date(verdict.created_at), 'MMM dd')}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {(!verdicts?.data || (verdicts.data as VerdictItem[]).length === 0) && (
                                <p className="text-[11px] italic opacity-40 text-center py-6">No verdicts logged yet.</p>
                            )}

                            <Button
                                className="w-full bg-white text-primary hover:bg-zinc-100 font-black uppercase text-[10px] h-10 tracking-[0.15em] rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
                                onClick={() => setIsVerdictOpen(true)}
                            >
                                <MessageSquare className="h-3.5 w-3.5 mr-2" /> Log Decision
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Profitability Ratio */}
                    <Card className="border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/30 dark:shadow-none bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-black flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <PieChart className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                </div>
                                Profitability Ratio
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${financials?.totalRevenue ? 100 : 0}%` }}
                                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${financials?.totalRevenue ? (financials.totalBusinessExpenses / financials.totalRevenue) * 100 : 0}%` }}
                                        style={{
                                            marginLeft: `-${financials?.totalRevenue ? (financials.totalBusinessExpenses / financials.totalRevenue) * 100 : 0}%`
                                        }}
                                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Revenue
                                    </span>
                                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Expenses
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground/50 font-medium leading-relaxed">
                                    Direct cost vs return ratio for this specific project.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>

            {/* ━━━ Dialogs ━━━ */}

            {/* Verdict Dialog */}
            <Dialog open={isVerdictOpen} onOpenChange={setIsVerdictOpen}>
                <DialogContent className="rounded-2xl border-zinc-100 dark:border-zinc-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                            Log Finance Verdict
                        </DialogTitle>
                        <DialogDescription>Record a strategic financial decision or an important note regarding this project&apos;s budget.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.15em] mb-2.5 block text-muted-foreground">Verdict / Decision</Label>
                        <textarea
                            className="w-full min-h-[120px] bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all duration-200 resize-none"
                            placeholder="e.g. Budget approved for extra server costs, or Client payment milestone reached..."
                            value={verdictContent}
                            onChange={(e) => setVerdictContent(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsVerdictOpen(false)}>Cancel</Button>
                        <Button
                            disabled={!verdictContent || verdictMutation.isPending}
                            onClick={() => verdictMutation.mutate(verdictContent)}
                            className="bg-primary font-black px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            {verdictMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Verdict"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revenue Dialog */}
            <Dialog open={isRevenueOpen} onOpenChange={setIsRevenueOpen}>
                <DialogContent className="rounded-2xl border-zinc-100 dark:border-zinc-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            Log Revenue
                        </DialogTitle>
                        <DialogDescription>Record income specifically belonging to {project.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Amount</Label>
                            <Input
                                type="number"
                                placeholder="₹ 0.00"
                                className="h-12 border-2 rounded-xl font-bold text-lg border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                                value={revenueForm.amount}
                                onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Source / Milestone</Label>
                            <Input
                                placeholder="e.g. Milestone 1, Final Payout..."
                                className="h-12 border-2 rounded-xl border-zinc-200 dark:border-zinc-700"
                                value={revenueForm.source}
                                onChange={(e) => setRevenueForm({ ...revenueForm, source: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Description</Label>
                            <Input
                                placeholder="Optional details..."
                                className="h-12 border-2 rounded-xl border-zinc-200 dark:border-zinc-700"
                                value={revenueForm.description}
                                onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                            />
                        </div>

                        {/* Live Impact Preview when contract is set */}
                        {contractAmount > 0 && revenueForm.amount && Number(revenueForm.amount) > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/50 space-y-2"
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">After this payment</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground font-medium">New Received</span>
                                    <span className="font-black text-emerald-600">{inr(receivedAmount + Number(revenueForm.amount))}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground font-medium">New Due</span>
                                    <span className={`font-black ${Math.max(0, contractAmount - receivedAmount - Number(revenueForm.amount)) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {inr(Math.max(0, contractAmount - receivedAmount - Number(revenueForm.amount)))}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsRevenueOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                            onClick={() => revenueMutation.mutate(revenueForm)}
                            disabled={!revenueForm.amount || !revenueForm.source || revenueMutation.isPending}
                        >
                            {revenueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Income"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Expense Dialog */}
            <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <DialogContent className="rounded-2xl border-zinc-100 dark:border-zinc-800 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            Log Expense
                        </DialogTitle>
                        <DialogDescription>Record an expenditure for {project.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="₹ 0.00"
                                    className="h-12 border-2 rounded-xl font-bold border-zinc-200 dark:border-zinc-700 focus:border-rose-500"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Category</Label>
                                <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm({ ...expenseForm, category: val as typeof PROJECT_EXPENSE_CATEGORIES[number], employee_id: ["Project Share", "Commision / Broker"].includes(val) ? expenseForm.employee_id : "" })}>
                                    <SelectTrigger className="h-12 border-2 rounded-xl border-zinc-200 dark:border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {PROJECT_EXPENSE_CATEGORIES.map((category) => (
                                            <SelectItem key={category} value={category}>
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {["Project Share", "Commision / Broker"].includes(expenseForm.category) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Select Employee</Label>
                                <Select value={expenseForm.employee_id} onValueChange={(val) => setExpenseForm({ ...expenseForm, employee_id: val })}>
                                    <SelectTrigger className="h-12 border-2 rounded-xl border-zinc-200 dark:border-zinc-700">
                                        <SelectValue placeholder="Select team member" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {projectMembers?.data?.map((member: { id: string; avatar_url: string; full_name: string }) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={member.avatar_url} />
                                                        <AvatarFallback>{member.full_name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{member.full_name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </motion.div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Description (Optional)</Label>
                            <Input
                                placeholder="e.g. Server hosting for March..."
                                className="h-12 border-2 rounded-xl border-zinc-200 dark:border-zinc-700"
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsExpenseOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                            onClick={() => expenseMutation.mutate(expenseForm)}
                            disabled={!expenseForm.amount || expenseMutation.isPending}
                        >
                            {expenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Cost"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contract Amount Dialog */}
            <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
                <DialogContent className="rounded-2xl border-zinc-100 dark:border-zinc-800 sm:max-w-md">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                            <IndianRupee className="h-6 w-6 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-black">
                            {contractAmount > 0 ? "Update Contract Amount" : "Set Contract Amount"}
                        </DialogTitle>
                        <DialogDescription>
                            Enter the total contract value (income) for <span className="font-bold text-foreground">{project.name}</span>. This tracks how much has been received and how much is still due.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Contract Amount</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/40">₹</span>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    className="h-16 border-2 text-2xl font-black pl-10 rounded-xl border-zinc-200 dark:border-zinc-700 focus:border-primary"
                                    value={contractInput}
                                    onChange={(e) => setContractInput(e.target.value)}
                                    min={0}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Live Preview */}
                        <AnimatePresence>
                            {contractInput && Number(contractInput) > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: "auto" }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-5 space-y-3 border border-zinc-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Preview</p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5" /> Contract Value
                                            </span>
                                            <span className="font-black text-base">{inr(Number(contractInput))}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Already Received
                                            </span>
                                            <span className="font-black text-emerald-600 text-base">{inr(receivedAmount)}</span>
                                        </div>
                                        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex justify-between items-center">
                                            <span className="text-muted-foreground font-bold flex items-center gap-2 text-sm">
                                                <Wallet className="h-3.5 w-3.5" /> Will Be Due
                                            </span>
                                            <span className={`font-black text-lg ${Math.max(0, Number(contractInput) - receivedAmount) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {inr(Math.max(0, Number(contractInput) - receivedAmount))}
                                            </span>
                                        </div>
                                        {/* Mini progress preview */}
                                        <div className="pt-1">
                                            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${receivedAmount >= Number(contractInput) ? 'bg-emerald-500' : 'bg-amber-500'
                                                        }`}
                                                    style={{ width: `${Math.min(100, (receivedAmount / Number(contractInput)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsContractOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-primary font-black px-8 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 min-w-[140px]"
                            onClick={() => contractMutation.mutate(Number(contractInput))}
                            disabled={!contractInput || Number(contractInput) < 0 || contractMutation.isPending}
                        >
                            {contractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Contract"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div >
    );
}

function CompactStatCard({
    title,
    value,
    icon: Icon,
    color,
    description,
    trend
}: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    description: string;
    trend?: "positive" | "negative";
}) {
    return (
        <Card className="border border-zinc-100 dark:border-zinc-800 shadow-lg shadow-zinc-200/20 dark:shadow-none bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl overflow-hidden group rounded-2xl hover:shadow-xl hover:shadow-zinc-200/30 transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {trend && (
                        <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest border-none px-2.5 py-1 ${trend === 'positive'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                            {trend}
                        </Badge>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">{title}</p>
                    <p className="text-2xl font-black tracking-tight">{value}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/40">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
