"use client";

import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    Clock3,
    TrendingUp,
    FileText,
    History,
    Wallet,
    Download,
    Receipt,
    Search,
    XCircle,
    IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmployeeFinanceData } from "@/actions/employee-actions";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpenseClaim, getMyClaims } from "@/actions/finance-actions";
import { toast } from "sonner";
import { UnpaidAccrual } from "@/types/dashboard";
import { Expense } from "@/types/common";
import { EXPENSE_CATEGORIES } from "@/lib/finance-categories";

const PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
];

interface ExpenseClaim extends Expense {
    id: string;
    description: string;
    expense_date: string;
    category: string;
    amount: number;
    rejection_reason?: string | null;
    status: "pending" | "approved" | "partially_paid" | "rejected" | "paid";
}

export default function EmployeeFinancePage() {
    const [selectedCategory, setSelectedCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHODS[0].value);
    const [claimSearch, setClaimSearch] = useState("");
    const [claimStatusFilter, setClaimStatusFilter] = useState("all");
    const [claimSort, setClaimSort] = useState("latest");
    const deferredClaimSearch = useDeferredValue(claimSearch);
    const { data, isLoading: isFinanceLoading } = useQuery({
        queryKey: ["employee-finance-data"],
        queryFn: async () => {
            const res = await getEmployeeFinanceData();
            return res.ok && "data" in res ? res.data : null;
        }
    });

    const { data: claimsData, isLoading: isClaimsLoading, refetch: refetchClaims } = useQuery({
        queryKey: ["employee-claims"],
        queryFn: async () => {
            const res = await getMyClaims();
            return res.ok ? res.data : [];
        }
    });

    const [isClaimOpen, setIsClaimOpen] = useState(false);
    const claims = (claimsData || []) as ExpenseClaim[];

    async function handleClaimSubmit(formData: FormData) {
        const res = await createExpenseClaim(formData);
        if (res.ok) {
            toast.success("Claim submitted successfully");
            setIsClaimOpen(false);
            setSelectedCategory(EXPENSE_CATEGORIES[0]);
            setSelectedPaymentMethod(PAYMENT_METHODS[0].value);
            refetchClaims();
        } else {
            toast.error(res.message);
        }
    }

    const isLoading = isFinanceLoading || isClaimsLoading;

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const salary = data?.salary || 0;
    const accruals = (data?.accruals || []) as UnpaidAccrual[];
    const incomeBreakdown = data?.incomeBreakdown || {
        salary: 0,
        project_share: 0,
        commission: 0,
        bonus: 0,
        reimbursement: 0
    };
    const totalEarnedYTD = data?.totalEarnedYTD || 0;

    const totalPaid = accruals.reduce((acc: number, curr: UnpaidAccrual) => acc + Number(curr.paid_amount || 0), 0);
    const pendingAmount = accruals.reduce((acc: number, curr: UnpaidAccrual) => acc + Number(curr.remaining_amount || 0), 0);
    const totalClaimedAmount = claims.reduce((acc, claim) => acc + Number(claim.amount || 0), 0);
    const pendingClaimsAmount = claims
        .filter((claim) => claim.status === "pending")
        .reduce((acc, claim) => acc + Number(claim.amount || 0), 0);
    const approvedClaimsAmount = claims
        .filter((claim) => claim.status === "approved" || claim.status === "partially_paid")
        .reduce((acc, claim) => acc + Number(claim.amount || 0), 0);
    const reimbursedClaimsAmount = claims
        .reduce((acc, claim) => acc + Number(claim.reimbursed_amount || (claim.status === "paid" ? claim.amount : 0) || 0), 0);
    const rejectedClaimsCount = claims.filter((claim) => claim.status === "rejected").length;
    const filteredClaims = claims
        .filter((claim) => {
            const search = deferredClaimSearch.trim().toLowerCase();
            const matchesSearch = !search ||
                claim.description.toLowerCase().includes(search) ||
                claim.category.toLowerCase().includes(search);
            const matchesStatus = claimStatusFilter === "all" || claim.status === claimStatusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((left, right) => {
            if (claimSort === "highest") return Number(right.amount) - Number(left.amount);
            if (claimSort === "oldest") return new Date(left.expense_date).getTime() - new Date(right.expense_date).getTime();
            return new Date(right.expense_date).getTime() - new Date(left.expense_date).getTime();
        });

    const today = new Date();
    const currentMonthStr = format(today, "yyyy-MM-01");

    let nextPayoutMonth = today.getMonth();
    let nextPayoutYear = today.getFullYear();

    if (today.getDate() > 5) {
        nextPayoutMonth++;
        if (nextPayoutMonth > 11) {
            nextPayoutMonth = 0;
            nextPayoutYear++;
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-8">
                <header className="pt-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                                <Wallet className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Financial Insights</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">My Earnings & Expenses</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                            Track salary, reimbursement claims, and every company expense you have covered.
                        </p>
                    </motion.div>
                </header>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Earned (YTD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(totalEarnedYTD)}</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Total earnings this year</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Monthly Salary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-green-600">{formatCurrency(salary)}</div>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Base gross amount
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Project Earnings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-primary">
                                {formatCurrency(incomeBreakdown.project_share)}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Share from contribution
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Commission</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-emerald-600">
                                {formatCurrency(incomeBreakdown.commission)}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Sales & referrals
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Reimbursements</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-sky-600">{formatCurrency(incomeBreakdown.reimbursement)}</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Paid expenses
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold">Payment History</CardTitle>
                                        <CardDescription>Records of your monthly accruals and payments</CardDescription>
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Export all
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {accruals.length === 0 ? (
                                        <div className="text-center py-8 text-zinc-500 font-medium">No payment records found</div>
                                    ) : (
                                        accruals.map((item: UnpaidAccrual, index: number) => (
                                            <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${item.status === "paid" ? "bg-green-50 dark:bg-green-900/30 text-green-600" : "bg-orange-50 dark:bg-orange-900/30 text-orange-600"}`}>
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                                            {format(new Date(item.month_year), "MMMM yyyy")}
                                                        </p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Total: {formatCurrency(item.amount)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{formatCurrency(item.paid_amount || 0)}</p>
                                                        <Badge variant={item.status === "paid" ? "default" : "secondary"} className="text-[10px] h-5">
                                                            {item.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold">Project Earnings</CardTitle>
                                        <CardDescription>Income received from project contributions and commissions</CardDescription>
                                    </div>
                                    <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {!data?.projectSalaries || data.projectSalaries.length === 0 ? (
                                        <div className="text-center py-8 text-zinc-500 font-medium">No project-specific earnings found</div>
                                    ) : (
                                        data.projectSalaries.map((item: { project_name: string; payment_type: string; description: string; date: string }, index: number) => (
                                            <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600">
                                                        <IndianRupee className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                                                {item.project_name}
                                                            </p>
                                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none text-[10px] font-black uppercase">
                                                                {item.payment_type === "commission" ? "Commission" : "Project Share"}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {item.description} • {format(new Date(item.date), "MMM dd, yyyy")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{formatCurrency(item.amount)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold">Expense Claims</CardTitle>
                                        <CardDescription>Submit company-paid expenses and track your reimbursement lifecycle</CardDescription>
                                    </div>
                                    <Dialog open={isClaimOpen} onOpenChange={setIsClaimOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="gap-2 bg-primary hover:bg-primary/90">
                                                <Receipt className="h-4 w-4" />
                                                New Claim
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Submit Expense Claim</DialogTitle>
                                                <DialogDescription>
                                                    Add the expense you paid on behalf of the company so finance can review and reimburse it.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form action={handleClaimSubmit} className="space-y-4 py-4">
                                                <input type="hidden" name="category" value={selectedCategory} />
                                                <input type="hidden" name="payment_method" value={selectedPaymentMethod} />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="amount">Amount</Label>
                                                        <Input id="amount" name="amount" type="number" placeholder="0.00" required />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="date">Date</Label>
                                                        <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="category">Category</Label>
                                                    <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {EXPENSE_CATEGORIES.map((category) => (
                                                                <SelectItem key={category} value={category}>
                                                                    {category}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="payment_method">Payment Method</Label>
                                                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select payment method" />
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
                                                <div className="space-y-2">
                                                    <Label htmlFor="description">Description</Label>
                                                    <Textarea id="description" name="description" placeholder="Client meeting lunch..." required />
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit">Submit Claim</Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-4">
                                    <div className="rounded-2xl border border-zinc-100 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Clock3 className="h-4 w-4" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.08em]">Pending Review</p>
                                        </div>
                                        <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(pendingClaimsAmount)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-zinc-100 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.08em]">Approved</p>
                                        </div>
                                        <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(approvedClaimsAmount)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-zinc-100 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                        <div className="flex items-center gap-2 text-sky-600">
                                            <Wallet className="h-4 w-4" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.08em]">Reimbursed</p>
                                        </div>
                                        <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(reimbursedClaimsAmount)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-zinc-100 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                        <div className="flex items-center gap-2 text-rose-600">
                                            <XCircle className="h-4 w-4" />
                                            <p className="text-[11px] font-black uppercase tracking-[0.08em]">Rejected</p>
                                        </div>
                                        <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">{rejectedClaimsCount}</p>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-[1.4fr,0.8fr,0.8fr]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                        <Input value={claimSearch} onChange={(event) => setClaimSearch(event.target.value)} placeholder="Search category or note" className="pl-9" />
                                    </div>
                                    <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="partially_paid">Partial</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={claimSort} onValueChange={setClaimSort}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort claims" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="latest">Latest first</SelectItem>
                                            <SelectItem value="oldest">Oldest first</SelectItem>
                                            <SelectItem value="highest">Highest amount</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {claims.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
                                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-full w-fit mx-auto">
                                            <Receipt className="h-6 w-6 text-zinc-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No active claims</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">You haven&apos;t submitted any expense claims yet.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                        {filteredClaims.map((claim: ExpenseClaim) => (
                                            <div key={claim.id} className="space-y-2">
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-md">
                                                            <Receipt className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{claim.description || claim.category}</p>
                                                            <p className="text-xs text-zinc-500">{format(new Date(claim.expense_date), "MMM dd, yyyy")} | {claim.category}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm">{formatCurrency(claim.amount)}</p>
                                                        <Badge
                                                            variant={
                                                                claim.status === "paid" ? "default" :
                                                                    claim.status === "approved" ? "default" :
                                                                        claim.status === "partially_paid" ? "secondary" :
                                                                            claim.status === "rejected" ? "destructive" : "outline"
                                                            }
                                                            className={`text-[10px] h-5 capitalize ${claim.status === "paid" ? "bg-emerald-500 hover:bg-emerald-600" :
                                                                claim.status === "approved" ? "bg-blue-500 hover:bg-blue-600" :
                                                                    claim.status === "pending" ? "text-amber-600 border-amber-200" : ""
                                                                }`}
                                                        >
                                                            {claim.status === "paid" ? "Reimbursed" : claim.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {claim.rejection_reason && (
                                                    <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                                                        {claim.rejection_reason}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {filteredClaims.length === 0 && (
                                            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-sm text-zinc-500">
                                                No claims match the selected filters.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden">
                            <CardHeader className="bg-zinc-900 text-white dark:bg-zinc-800">
                                <CardTitle className="text-lg font-bold">Quick Insights</CardTitle>
                                <CardDescription className="text-zinc-400">Live financial breakdown</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-zinc-500">PAYMENT COMPLETION</span>
                                        <span className="text-xs font-black text-primary">
                                            {totalPaid > 0 ? Math.round((totalPaid / (totalPaid + pendingAmount)) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${totalPaid > 0 ? (totalPaid / (totalPaid + pendingAmount)) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500">TOTAL INCOME</p>
                                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(totalPaid)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                                            <History className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500">ACTIVE ACCRUALS</p>
                                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{accruals.length}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                                            <Receipt className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500">TOTAL SUBMITTED</p>
                                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(totalClaimedAmount)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl border-t-4 border-t-primary">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">Income Breakdown</h3>
                                </div>

                                <div className="space-y-4 pt-2">
                                    {[
                                        { label: "Salary", value: incomeBreakdown.salary, color: "bg-green-500" },
                                        { label: "Project Share", value: incomeBreakdown.project_share, color: "bg-primary" },
                                        { label: "Commission", value: incomeBreakdown.commission, color: "bg-emerald-500" },
                                        { label: "Bonus", value: incomeBreakdown.bonus, color: "bg-amber-500" },
                                        { label: "Reimbursements", value: incomeBreakdown.reimbursement, color: "bg-sky-500" },
                                    ].map((income) => {
                                        const total = Object.values(incomeBreakdown).reduce((a, b) => Number(a) + Number(b), 0) || 1;
                                        const percentage = Math.round((Number(income.value) / total) * 100);

                                        return (
                                            <div key={income.label} className="space-y-1.5">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-zinc-500 uppercase tracking-wider">{income.label}</span>
                                                    <span className="text-zinc-900 dark:text-zinc-100">{formatCurrency(Number(income.value))} ({percentage}%)</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className={`h-full ${income.color} rounded-full`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Growth Focused Analytics</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
