"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCompanyFinancials,
    getFinancialHistory,
    getFinanceVerdicts,
    postFinanceVerdict,
    postRevenue,
    postBusinessExpense
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
    ArrowDownRight
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

export function ProjectFinanceTab({ project }: ProjectFinanceTabProps) {
    const queryClient = useQueryClient();
    const [isVerdictOpen, setIsVerdictOpen] = useState(false);
    const [verdictContent, setVerdictContent] = useState("");
    const [isRevenueOpen, setIsRevenueOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);

    const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
    const [expenseForm, setExpenseForm] = useState({ amount: "", description: "", category: "Miscellaneous", payment_method: "upi" });

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
            project_id: project.id
        }) as Promise<{ success: boolean; error?: string }>,
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Expense logged successfully");
                setIsExpenseOpen(false);
                setExpenseForm({ amount: "", description: "", category: "Miscellaneous", payment_method: "upi" });
                queryClient.invalidateQueries({ queryKey: ["project-financials", project.id] });
                queryClient.invalidateQueries({ queryKey: ["project-history", project.id] });
            } else {
                toast.error(res.error || "Failed to log expense");
            }
        }
    });

    if (loadingFin || loadingHistory || loadingVerdicts) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Project Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CompactStatCard
                    title="Revenue Collected"
                    value={`₹${financials?.totalRevenue.toLocaleString()}`}
                    icon={TrendingUp}
                    color="bg-emerald-500"
                    description="Total income from this project"
                />
                <CompactStatCard
                    title="Expenditure"
                    value={`₹${financials?.totalBusinessExpenses.toLocaleString()}`}
                    icon={TrendingDown}
                    color="bg-rose-500"
                    description="Direct expenses for this project"
                />
                <CompactStatCard
                    title="Net Profitability"
                    value={`₹${financials?.netBalance.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-primary"
                    description="Project runway / net balance"
                    trend={financials?.netBalance && financials.netBalance >= 0 ? "positive" : "negative"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transaction Ledger */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                Project Ledger
                            </CardTitle>
                            <CardDescription>Financial history of {project.name}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-9 px-4 font-bold text-xs uppercase" onClick={() => setIsRevenueOpen(true)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Revenue
                            </Button>
                            <Button size="sm" variant="outline" className="h-9 px-4 font-bold text-xs uppercase" onClick={() => setIsExpenseOpen(true)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Expense
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase font-black text-muted-foreground border-y border-zinc-100 dark:border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Date</th>
                                        <th className="px-6 py-4 text-left">Transaction</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(history as ProjectLedgerItem[] | undefined)?.map((item, idx: number) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-muted-foreground">{format(new Date(item.date), 'MMM dd, yyyy')}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.type === 'revenue' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {item.type === 'revenue' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{item.title}</p>
                                                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{item.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-black ${item.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {item.type === 'revenue' ? '+' : '-'} ₹{Number(item.amount).toLocaleString()}
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {(!history || history.length === 0) && (
                                        <tr><td colSpan={3} className="py-20 text-center opacity-40 font-bold italic">No financial activity recorded.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Verdicts / Decisions */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-primary text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                        <CardHeader>
                            <CardTitle className="text-lg">Financial Verdicts</CardTitle>
                            <CardDescription className="text-white/70">Strategic decisions & budget notes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {(verdicts?.data as VerdictItem[] | undefined)?.slice(0, 3).map((verdict) => (
                                    <motion.div
                                        key={verdict.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20"
                                    >
                                        <p className="text-xs font-medium leading-relaxed mb-2">&quot;{verdict.content}&quot;</p>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 border border-white/20">
                                                    <AvatarImage src={verdict.profiles?.avatar_url} />
                                                    <AvatarFallback className="text-[8px] font-black text-primary">{verdict.profiles?.full_name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] font-bold opacity-80">{verdict.profiles?.full_name}</span>
                                            </div>
                                            <span className="text-[8px] opacity-60 font-black uppercase">{format(new Date(verdict.created_at), 'MMM dd')}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {(!verdicts?.data || (verdicts.data as VerdictItem[]).length === 0) && (
                                <p className="text-xs italic opacity-60 text-center py-4">No verdicts logged yet.</p>
                            )}

                            <Button
                                className="w-full bg-white text-primary hover:bg-zinc-100 font-black uppercase text-xs h-10 tracking-widest"
                                onClick={() => setIsVerdictOpen(true)}
                            >
                                <MessageSquare className="h-3.5 w-3.5 mr-2" /> Log Decision
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Budget Progress or something similar */}
                    <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-purple-600" />
                                Profitability Ratio
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${financials?.totalRevenue ? 100 : 0}%` }}
                                    />
                                    <div
                                        className="h-full bg-rose-500 transition-all duration-1000"
                                        style={{
                                            width: `${financials?.totalRevenue ? (financials.totalBusinessExpenses / financials.totalRevenue) * 100 : 0}%`,
                                            marginLeft: `-${financials?.totalRevenue ? (financials.totalBusinessExpenses / financials.totalRevenue) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-emerald-600">Revenue</span>
                                    <span className="text-rose-600">Expenses</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium italic">
                                    * This ratio represents the direct cost vs return of this specific project.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Verdict Dialog */}
            <Dialog open={isVerdictOpen} onOpenChange={setIsVerdictOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Finance Verdict</DialogTitle>
                        <DialogDescription>Record a strategic financial decision or an important note regarding this project&apos;s budget.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Verdict / Decision</Label>
                        <textarea
                            className="w-full min-h-[100px] bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                            placeholder="e.g. Budget approved for extra server costs, or Client payment milestone reached..."
                            value={verdictContent}
                            onChange={(e) => setVerdictContent(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsVerdictOpen(false)}>Cancel</Button>
                        <Button
                            disabled={!verdictContent || verdictMutation.isPending}
                            onClick={() => verdictMutation.mutate(verdictContent)}
                            className="bg-primary font-bold px-8"
                        >
                            {verdictMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Verdict"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revenue Dialog */}
            <Dialog open={isRevenueOpen} onOpenChange={setIsRevenueOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Project Revenue</DialogTitle>
                        <DialogDescription>Log income specifically belonging to {project.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Amount</Label>
                            <Input
                                type="number"
                                placeholder="₹ 0.00"
                                className="h-12 border-2"
                                value={revenueForm.amount}
                                onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Source / Milestone</Label>
                            <Input
                                placeholder="e.g. Milestone 1, Final Payout..."
                                className="h-12 border-2"
                                value={revenueForm.source}
                                onChange={(e) => setRevenueForm({ ...revenueForm, source: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Description</Label>
                            <Input
                                placeholder="Optional details..."
                                className="h-12 border-2"
                                value={revenueForm.description}
                                onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRevenueOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8"
                            onClick={() => revenueMutation.mutate(revenueForm)}
                            disabled={!revenueForm.amount || !revenueForm.source || revenueMutation.isPending}
                        >
                            Log Income
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Expense Dialog */}
            <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Project Expense</DialogTitle>
                        <DialogDescription>Log an expenditure for {project.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="₹ 0.00"
                                    className="h-12 border-2"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase">Category</Label>
                                <Select value={expenseForm.category} onValueChange={(val) => setExpenseForm({ ...expenseForm, category: val })}>
                                    <SelectTrigger className="h-12 border-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Software">Software</SelectItem>
                                        <SelectItem value="Salaries">Project Labor</SelectItem>
                                        <SelectItem value="Miscellaneous">Misc</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Description</Label>
                            <Input
                                placeholder="What was this spent on?"
                                className="h-12 border-2"
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsExpenseOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8"
                            onClick={() => expenseMutation.mutate(expenseForm)}
                            disabled={!expenseForm.amount || !expenseForm.description || expenseMutation.isPending}
                        >
                            Log Cost
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
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
        <Card className="border border-zinc-100 dark:border-zinc-800 shadow-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden group">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-lg ${color} text-white shadow-lg`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {trend && (
                        <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest border-none ${trend === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {trend}
                        </Badge>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{title}</p>
                    <p className="text-2xl font-black tracking-tight">{value}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
