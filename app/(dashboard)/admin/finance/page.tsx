"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCompanyFinancials,
    postRevenue,
    generateMonthlyAccruals,
    getFinancialHistory,
    postBusinessExpense
} from "@/actions/finance";
import { getPendingClaims, updateClaimStatus, getExpenseAnalytics } from "@/actions/finance-actions";
import { getAllEmployees } from "@/actions/employees";
import {
    Card,

    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    BarChart3,
    Plus,
    Wallet,
    TrendingUp,
    Users,
    Loader2,
    ArrowUpRight,
    Calculator,
    TrendingDown,
    ExternalLink,
    Check,
    X,
    PieChart,
    Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUnpaidAccruals, processSalaryPayment } from "@/actions/payroll-actions";
import type { UnpaidAccrual } from "@/types/dashboard";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";


export default function AdminFinancePage() {
    const queryClient = useQueryClient();
    const [isAddingRevenue, setIsAddingRevenue] = useState(false);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
    const [expenseForm, setExpenseForm] = useState({ amount: "", description: "", category_id: "", payment_method: "cash" });


    const EXPENSE_CATEGORIES = [
        { id: "salary", name: "Salary Payments" },
        { id: "rent", name: "Office Rent" },
        { id: "electricity", name: "Electricity" },
        { id: "wifi", name: "WiFi & Internet" },
        { id: "domain", name: "Domain & Hosting" },
        { id: "snacks", name: "Tea & Snacks" },
        { id: "marketing", name: "Marketing & Ads" },
        { id: "misc", name: "Miscellaneous" }
    ];

    const PAYMENT_METHODS = [
        { value: "cash", label: "Cash" },
        { value: "upi", label: "UPI" },
        { value: "card", label: "Card" },
        { value: "bank_transfer", label: "Bank Transfer" },
        { value: "other", label: "Other" }
    ];

    const { data: financials, isLoading } = useQuery({
        queryKey: ["company-financials"],
        queryFn: () => getCompanyFinancials(),
    });

    const { data: employees } = useQuery({
        queryKey: ["admin-employees"],
        queryFn: () => getAllEmployees(),
    });

    const { data: ledger } = useQuery({
        queryKey: ["financial-ledger"],
        queryFn: () => getFinancialHistory(),
    });

    const { data: pendingClaims, refetch: refetchClaims } = useQuery({
        queryKey: ["pending-claims"],
        queryFn: () => getPendingClaims(),
    });

    const { data: analytics } = useQuery({
        queryKey: ["expense-analytics"],
        queryFn: () => getExpenseAnalytics(),
    });

    const handleClaimAction = async (id: string, status: "approved" | "rejected") => {
        const res = await updateClaimStatus(id, status);
        if (res.ok) {
            toast.success(res.message);
            refetchClaims();
            queryClient.invalidateQueries({ queryKey: ["expense-analytics"] });
            queryClient.invalidateQueries({ queryKey: ["company-financials"] });
        } else {
            toast.error(res.message);
        }
    };


    // Categories are now hardcoded

    const revenueMutation = useMutation({
        mutationFn: (data: typeof revenueForm) => postRevenue(Number(data.amount), data.source, data.description) as Promise<{ success: boolean; error?: string }>,
        onSuccess: (res: { success: boolean; error?: string }) => {
            if (res.success) {
                toast.success("Revenue posted successfully");
                setIsAddingRevenue(false);
                setRevenueForm({ amount: "", source: "", description: "" });
                queryClient.invalidateQueries({ queryKey: ["company-financials"] });
            } else {
                toast.error(res.error || "Failed to post revenue");
            }
        }
    });

    const expenseMutation = useMutation({
        mutationFn: (data: typeof expenseForm) => postBusinessExpense({
            amount: Number(data.amount),
            description: data.description,
            category: data.category_id,
            payment_method: data.payment_method
        }) as Promise<{ success: boolean; error?: string }>,
        onSuccess: (res: { success: boolean; error?: string }) => {
            if (res.success) {
                toast.success("Expense logged successfully");
                setIsAddingExpense(false);
                setExpenseForm({ amount: "", description: "", category_id: "", payment_method: "cash" });
                queryClient.invalidateQueries({ queryKey: ["company-financials"] });
                queryClient.invalidateQueries({ queryKey: ["financial-ledger"] });
            } else {
                toast.error(res.error || "Failed to log expense");
            }
        }
    });



    const accrualMutation = useMutation({
        mutationFn: () => generateMonthlyAccruals(new Date()),
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Accruals generated for ${res.count} employees`);
                queryClient.invalidateQueries({ queryKey: ["company-financials"] });
            } else {
                toast.error(res.error || "Failed to generate accruals");
            }
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700" >
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                        <BarChart3 className="h-3 w-3" />
                        Venture Capital View
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter">Company Treasury</h1>
                    <p className="text-muted-foreground font-medium text-sm">Manage company debt, revenue distribution, and financial health.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => accrualMutation.mutate()}
                        disabled={accrualMutation.isPending}
                        variant="outline"
                        className="font-black uppercase tracking-tight text-xs h-12 px-6 border-2 hover:bg-zinc-50"
                    >
                        {accrualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                        Generate Accruals
                    </Button>
                    <Button
                        onClick={() => setIsAddingRevenue(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tight text-xs h-12 px-6 shadow-xl shadow-primary/20"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Revenue
                    </Button>
                    <Button
                        onClick={() => setIsAddingExpense(true)}
                        variant="secondary"
                        className="font-black uppercase tracking-tight text-xs h-12 px-6 shadow-xl shadow-zinc-200/50"
                    >
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Add Expense
                    </Button>
                </div>
            </header>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-1 h-12 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <TabsTrigger value="overview" className="h-10 rounded-lg px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">Overview</TabsTrigger>
                    <TabsTrigger value="payroll" className="h-10 rounded-lg px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">Payroll Management</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" >
                        <StatCard
                            title="Total Revenue"
                            value={`₹${financials?.totalRevenue.toLocaleString()}`}
                            icon={ArrowUpRight}
                            trend="+12%" // Placeholder
                            color="bg-emerald-500"
                        />
                        <StatCard
                            title="Total Liability"
                            value={`₹${financials?.totalLiability.toLocaleString()}`}
                            icon={Wallet}
                            trend="Accrued"
                            color="bg-rose-500"
                        />
                        <StatCard
                            title="Total Paid"
                            value={`₹${financials?.totalPaid.toLocaleString()}`}
                            icon={Users}
                            trend="Settled"
                            color="bg-primary"
                        />
                        <StatCard
                            title="Net Runway"
                            value={`₹${financials?.netBalance.toLocaleString()}`}
                            icon={TrendingUp}
                            trend="Operating"
                            color="bg-emerald-500"
                        />
                    </div >

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Pending Claims Section */}
                        <Card className="lg:col-span-3 border-2 border-orange-100 dark:border-orange-900/20 bg-orange-50/30 dark:bg-orange-950/10">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-orange-500" />
                                    Pending Claims
                                    {(pendingClaims?.data?.length ?? 0) > 0 && <Badge className="bg-orange-500">{pendingClaims?.data?.length}</Badge>}
                                </CardTitle>
                                <CardDescription>Employee reimbursement requests requiring approval.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!pendingClaims?.data || pendingClaims?.data?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">No pending claims.</div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {pendingClaims.data.map((claim: {
                                            id: string;
                                            amount: number;
                                            description: string;
                                            category: string;
                                            expense_date: string;
                                            profiles: {
                                                avatar_url: string;
                                                full_name: string;
                                                department: string;
                                            };
                                        }) => (
                                            <div key={claim.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={claim.profiles?.avatar_url} />
                                                            <AvatarFallback>{claim.profiles?.full_name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-sm">{claim.profiles?.full_name}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{claim.profiles?.department}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">{format(new Date(claim.expense_date), 'MMM dd')}</Badge>
                                                </div>
                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xl font-black">₹{claim.amount}</p>
                                                    <p className="text-sm font-medium text-muted-foreground">{claim.description}</p>
                                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{claim.category}</Badge>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleClaimAction(claim.id, 'approved')}>
                                                        <Check className="h-4 w-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200" onClick={() => handleClaimAction(claim.id, 'rejected')}>
                                                        <X className="h-4 w-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Analytics Section */}
                        <div className="lg:col-span-3 grid md:grid-cols-2 gap-8">
                            {/* Top Spenders */}
                            <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Award className="h-5 w-5 text-purple-600" />
                                        Top Spenders
                                    </CardTitle>
                                    <CardDescription>Employees with highest approved expenses.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {analytics?.data?.topSpenders.map((person: { name: string; avatar: string; total: number }, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="font-black text-muted-foreground w-4 text-center">{i + 1}</div>
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={person.avatar} />
                                                    <AvatarFallback>{person.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-bold text-sm">{person.name}</span>
                                            </div>
                                            <span className="font-black text-sm">₹{person.total.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {(!analytics?.data?.topSpenders || analytics.data.topSpenders.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Expense Breakdown */}
                            <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <PieChart className="h-5 w-5 text-primary" />
                                        Expense Breakdown
                                    </CardTitle>
                                    <CardDescription>Spending distribution by category.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {analytics?.data?.breakdown.map((item: { name: string; value: number }, i: number) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-sm font-bold">
                                                <span>{item.name}</span>
                                                <span>₹{item.value.toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full" style={{ width: `${(item.value / analytics.data.breakdown.reduce((acc: number, cur: { value: number }) => acc + cur.value, 0)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!analytics?.data?.breakdown || analytics.data.breakdown.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>


                        {/* Left side: Revenue Form & Recent Logs */}

                        <div className="lg:col-span-2 space-y-8">
                            <AnimatePresence>
                                {isAddingRevenue && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <Card className="border-2 border-primary/10 dark:border-primary/20 bg-primary/5 dark:bg-primary/10">
                                            <CardHeader>
                                                <CardTitle className="text-lg">Log New Revenue</CardTitle>
                                                <CardDescription>Enter income from clients or investors to be distributed.</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <form className="space-y-4" onSubmit={(e) => {
                                                    e.preventDefault();
                                                    revenueMutation.mutate(revenueForm);
                                                }}>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Amount</Label>
                                                            <Input
                                                                type="number"
                                                                placeholder="e.g. 50000"
                                                                value={revenueForm.amount}
                                                                onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                                                                required
                                                                className="h-12 border-2 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Source</Label>
                                                            <Input
                                                                placeholder="e.g. Client X Project"
                                                                value={revenueForm.source}
                                                                onChange={(e) => setRevenueForm({ ...revenueForm, source: e.target.value })}
                                                                required
                                                                className="h-12 border-2 focus:ring-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Description (Optional)</Label>
                                                        <Input
                                                            placeholder="Brief details about this revenue..."
                                                            value={revenueForm.description}
                                                            onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                                                            className="h-12 border-2 focus:ring-primary"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <Button type="button" variant="ghost" onClick={() => setIsAddingRevenue(false)} className="font-bold">Cancel</Button>
                                                        <Button
                                                            type="submit"
                                                            disabled={revenueMutation.isPending}
                                                            className="bg-primary hover:bg-primary/90 text-white font-black px-8"
                                                        >
                                                            {revenueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Log"}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {isAddingExpense && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <Card className="border-2 border-rose-100 dark:border-rose-900/20 bg-rose-50/30 dark:bg-rose-950/10 mb-8">
                                            <CardHeader>
                                                <CardTitle className="text-lg">Log Business Expense</CardTitle>
                                                <CardDescription>Enter general expenditures (Rent, Software, Coffee, etc).</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <form className="space-y-4" onSubmit={(e) => {
                                                    e.preventDefault();
                                                    expenseMutation.mutate(expenseForm);
                                                }}>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Amount</Label>
                                                            <Input
                                                                type="number"
                                                                placeholder="e.g. 1500"
                                                                value={expenseForm.amount}
                                                                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                                                required
                                                                className="h-12 border-2 focus:ring-rose-500"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Category</Label>
                                                            <Select onValueChange={(val) => setExpenseForm({ ...expenseForm, category_id: val })}>
                                                                <SelectTrigger className="h-12 border-2">
                                                                    <SelectValue placeholder="Choose Category" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {EXPENSE_CATEGORIES.map(cat => (
                                                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Payment Method</Label>
                                                            <Select defaultValue="cash" onValueChange={(val) => setExpenseForm({ ...expenseForm, payment_method: val })}>
                                                                <SelectTrigger className="h-12 border-2">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {PAYMENT_METHODS.map((method) => (
                                                                        <SelectItem key={method.value} value={method.value}>
                                                                            {method.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Description</Label>
                                                        <Input
                                                            placeholder="What was this for?"
                                                            value={expenseForm.description}
                                                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                                            required
                                                            className="h-12 border-2 focus:ring-rose-500"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <Button type="button" variant="ghost" onClick={() => setIsAddingExpense(false)} className="font-bold">Cancel</Button>
                                                        <Button
                                                            type="submit"
                                                            disabled={expenseMutation.isPending}
                                                            className="bg-rose-600 text-white font-black px-8 hover:bg-rose-700"
                                                        >
                                                            {expenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Expense"}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6">
                                    <div className="space-y-1">
                                        <CardTitle>Financial Ledger</CardTitle>
                                        <CardDescription>Consolidated log of all revenue and expenditures.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest h-6">Live Feed</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-zinc-100 dark:border-zinc-800">
                                                <tr>
                                                    <th className="px-6 py-4">Transaction</th>
                                                    <th className="px-6 py-4">Details</th>
                                                    <th className="px-6 py-4 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                {ledger?.map((item: {
                                                    id: string;
                                                    type: string;
                                                    title: string;
                                                    date: string;
                                                    category: string;
                                                    method: string;
                                                    amount: string | number;
                                                }, idx: number) => (
                                                    <motion.tr
                                                        key={item.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="h-16 group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                                                    >
                                                        <td className="px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.type === 'revenue'
                                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                                                                    }`}>
                                                                    {item.type === 'revenue' ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-tight">{item.title}</p>
                                                                    <p className="text-[10px] font-bold text-muted-foreground">{format(new Date(item.date), "MMM dd, yyyy")}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6">
                                                            <Badge variant="outline" className="font-black text-[8px] uppercase tracking-widest border-zinc-200">
                                                                {item.category} {item.method !== '-' && `• ${item.method}`}
                                                            </Badge>
                                                        </td>
                                                        <td className={`px-6 text-right font-black tabular-nums ${item.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'
                                                            }`}>
                                                            {item.type === 'revenue' ? '+' : '-'} ₹{Number(item.amount).toLocaleString()}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                                {(!ledger || ledger.length === 0) && (
                                                    <tr><td colSpan={3} className="py-20 text-center opacity-40 font-bold italic">No transactions recorded yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right side: Employee Salaries List */}
                        <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-lg">Founding Team Salaries</CardTitle>
                                <CardDescription>Monthly fixed commitments.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0">
                                <div className="space-y-1">
                                    {employees?.map((emp: {
                                        id: string;
                                        full_name: string;
                                        avatar_url: string;
                                        role: string;
                                        monthly_salary: number;
                                    }) => (
                                        <div key={emp.id} className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-zinc-100 dark:border-zinc-800">
                                                    <AvatarImage src={emp.avatar_url || undefined} />
                                                    <AvatarFallback className="text-[10px] font-black">{emp.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{emp.full_name}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{emp.role}</span>
                                                </div>
                                            </div>

                                            <a
                                                href={`/admin/employees/${emp.id}?tab=compensation`}
                                                className="group flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">
                                                    ₹{Number(emp.monthly_salary || 0).toLocaleString()}
                                                </span>
                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 pt-4">
                                    <p className="text-[10px] text-muted-foreground font-medium italic">
                                        * Salaries are managed in the Employee Profile. Click to view/edit.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="payroll" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PayrollTab />
                </TabsContent>
            </Tabs>
        </div >
    );
}

function PayrollTab() {
    const queryClient = useQueryClient();
    // const [selectedAccrual, setSelectedAccrual] = useState<any>(null); // This line was commented out, so I'm not touching it.
    const [paymentAmount, setPaymentAmount] = useState<string>("");

    const { data: unpaidAccruals, isLoading } = useQuery({
        queryKey: ["unpaid-accruals"],
        queryFn: () => getUnpaidAccruals(),
    });

    const payMutation = useMutation({
        mutationFn: (data: { accrualId: string; amount: number; paymentMethod: string }) => processSalaryPayment(data),
        onSuccess: (res) => {
            if (res.ok) {
                toast.success(res.message);
                queryClient.invalidateQueries({ queryKey: ["unpaid-accruals"] });
                queryClient.invalidateQueries({ queryKey: ["company-financials"] }); // Update totals
                // setSelectedAccrual(null); // This line was commented out, so I'm not touching it.
            } else {
                toast.error(res.message);
            }
        }
    });

    if (isLoading) return <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>;

    return (
        <Card className="border border-zinc-100 dark:border-zinc-800 shadow-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
            <CardHeader>
                <CardTitle className="text-lg">Pending Salary Payouts</CardTitle>
                <CardDescription>Review and disburse salaries for the current period.</CardDescription>
            </CardHeader>
            <CardContent>
                {!unpaidAccruals?.data || unpaidAccruals.data.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                        <Check className="h-10 w-10 mx-auto text-green-500 bg-green-50 rounded-full p-2" />
                        <p className="font-bold">All caught up!</p>
                        <p className="text-xs">No pending salary payments found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {unpaidAccruals.data.map((item: UnpaidAccrual) => (
                            <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 mb-4 md:mb-0">
                                    <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-800 shadow-sm">
                                        <AvatarImage src={item.profiles?.avatar_url || undefined} />
                                        <AvatarFallback>{item.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.profiles?.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            {format(new Date(item.month_year), 'MMMM yyyy')}
                                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                            <span className="uppercase font-bold tracking-wider text-[10px]">{item.status.replace('_', ' ')}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Outstanding</p>
                                        <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">₹{Number(item.remaining_amount).toLocaleString()}</p>
                                    </div>
                                    <Dialog onOpenChange={(open) => {
                                        if (open) {
                                            setPaymentAmount(item.remaining_amount.toString());
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 shadow-lg shadow-emerald-500/20">
                                                Pay Now
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Process Salary Payout</DialogTitle>
                                                <DialogDescription>
                                                    Confirm payment for {item.profiles?.full_name}. This will be logged as an expense.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-6 space-y-4">
                                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg flex justify-between items-center">
                                                    <span className="text-sm font-medium">Paying for:</span>
                                                    <span className="font-black text-lg">{format(new Date(item.month_year), 'MMMM yyyy')}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Amount to Pay</Label>
                                                    <Input
                                                        value={paymentAmount}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (Number(val) <= item.remaining_amount) {
                                                                setPaymentAmount(val);
                                                            }
                                                        }}
                                                        type="number"
                                                        className="h-12 text-lg font-bold border-2 focus:ring-emerald-500"
                                                        max={item.remaining_amount}
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">You can edit the amount for partial or advance payments.</p>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold h-12"
                                                    onClick={() => payMutation.mutate({
                                                        accrualId: item.id,
                                                        amount: Number(paymentAmount),
                                                        paymentMethod: 'bank_transfer'
                                                    })}
                                                    disabled={payMutation.isPending || !paymentAmount || Number(paymentAmount) <= 0}
                                                >
                                                    {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                                    Confirm Transfer of ₹{Number(paymentAmount).toLocaleString()}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function StatCard({ title, value, icon: Icon, trend, color }: { title: string; value: string; icon: React.ElementType; trend: string; color: string }) {
    return (
        <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 blur-3xl -mr-8 -mt-8 rounded-full transition-all group-hover:opacity-10`} />
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full uppercase tracking-widest text-muted-foreground">
                        {trend}
                    </span>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{title}</p>
                    <p className="text-3xl font-black tabular-nums tracking-tighter">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
