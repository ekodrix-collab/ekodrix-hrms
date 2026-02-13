"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp,
    FileText,
    History,
    Wallet,
    Download,
    Receipt,
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

interface ExpenseClaim extends Expense {
    id: string;
    description: string;
    expense_date: string;
    category: string;
    amount: number;
    status: "pending" | "approved" | "rejected";
}


export default function EmployeeFinancePage() {
    const { data, isLoading: isFinanceLoading } = useQuery({
        queryKey: ["employee-finance-data"],
        queryFn: async () => {
            const res = await getEmployeeFinanceData();
            return res.ok && 'data' in res ? res.data : null;
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
            // Refresh claims
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

    const totalPaid = accruals.reduce((acc: number, curr: UnpaidAccrual) => acc + Number(curr.paid_amount || 0), 0);
    const pendingAmount = accruals.reduce((acc: number, curr: UnpaidAccrual) => acc + Number(curr.remaining_amount || 0), 0);

    // Date Logic
    const today = new Date();
    // Check if current month is already accrued
    const currentMonthStr = format(today, 'yyyy-MM-01');
    const isCurrentMonthAccrued = accruals.some((a: UnpaidAccrual) => a.month_year === currentMonthStr);

    // Next Payout Date Logic (5th of next month, or 5th of this month if today < 5th)
    let nextPayoutMonth = today.getMonth();
    let nextPayoutYear = today.getFullYear();

    if (today.getDate() > 5) {
        nextPayoutMonth++;
        if (nextPayoutMonth > 11) {
            nextPayoutMonth = 0;
            nextPayoutYear++;
        }
    }
    const nextPayoutDate = new Date(nextPayoutYear, nextPayoutMonth, 5);

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amt);
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
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Finance</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                            Overview of your salary, payouts, and financial records.
                        </p>
                    </motion.div>
                </header>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card className="border-2 border-primary/20 dark:border-primary/30 bg-white dark:bg-zinc-900/80 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Monthly Gross</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(salary)}</div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Base monthly salary</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Paid (YTD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-green-600">{formatCurrency(totalPaid)}</div>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {data?.lastPayoutDate
                                    ? `Last paid on ${format(new Date(data.lastPayoutDate), 'MMM do')}`
                                    : 'No payouts yet'
                                }
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Pending Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-orange-600 flex items-baseline gap-2">
                                {formatCurrency(pendingAmount + (isCurrentMonthAccrued ? 0 : salary))}
                                {!isCurrentMonthAccrued && (
                                    <span className="text-[10px] font-bold text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                        + Current
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {isCurrentMonthAccrued
                                    ? "Net unpaid accruals"
                                    : `Includes ₹${salary.toLocaleString()} for ${format(new Date(), 'MMMM')}`
                                }
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Next Payout</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-primary">
                                {format(nextPayoutDate, 'MMM do')}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Expected date ({format(nextPayoutDate, 'EEEE')})
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Reimbursed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-emerald-600">{formatCurrency(data?.totalReimbursed || 0)}</div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                All time approved
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
                                        accruals.map((item: UnpaidAccrual, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${item.status === 'paid' ? 'bg-green-50 dark:bg-green-900/30 text-green-600' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600'}`}>
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                                            {format(new Date(item.month_year), 'MMMM yyyy')}
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
                                        <CardTitle className="text-lg font-bold">Expense Claims</CardTitle>
                                        <CardDescription>Submit and track your reimbursement requests</CardDescription>
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
                                                    Add details about your expense. Please attach receipts if required.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form action={handleClaimSubmit} className="space-y-4 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="amount">Amount</Label>
                                                        <Input id="amount" name="amount" type="number" placeholder="0.00" required />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="date">Date</Label>
                                                        <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="category">Category</Label>
                                                    <Select name="category" required>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Travel">Travel</SelectItem>
                                                            <SelectItem value="Meals">Meals</SelectItem>
                                                            <SelectItem value="Equipment">Equipment</SelectItem>
                                                            <SelectItem value="Software">Software</SelectItem>
                                                            <SelectItem value="Other">Other</SelectItem>
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
                            <CardContent>
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
                                        {claims.map((claim: ExpenseClaim) => (
                                            <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 dark:bg-primary/20 text-primary rounded-md">
                                                        <Receipt className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{claim.description || claim.category}</p>
                                                        <p className="text-xs text-zinc-500">{format(new Date(claim.expense_date), 'MMM dd, yyyy')} • {claim.category}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm">{formatCurrency(claim.amount)}</p>
                                                    <Badge variant={
                                                        claim.status === 'approved' ? 'default' :
                                                            claim.status === 'rejected' ? 'destructive' : 'secondary'
                                                    } className="text-[10px] h-5 capitalize">
                                                        {claim.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
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
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-primary to-emerald-700 text-white shadow-xl shadow-primary/20">
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="p-3 bg-white/20 rounded-full w-fit mx-auto backdrop-blur-md">
                                    <TrendingUp className="h-6 w-6 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-black text-lg">Financial Planning</h3>
                                    <p className="text-xs text-emerald-50">Need help with investments or tax planning? Our HR team is here to help.</p>
                                </div>
                                <Button variant="secondary" className="w-full font-bold">Contact Support</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
