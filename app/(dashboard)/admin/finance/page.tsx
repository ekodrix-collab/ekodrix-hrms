"use client";

import { useDeferredValue, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  Wallet,
  X
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { generateMonthlyAccruals, getCompanyFinanceDashboard, postBusinessExpense, postRevenue } from "@/actions/finance";
import { markClaimAsPaid, updateClaimPayment, updateClaimStatus } from "@/actions/finance-actions";
import { getUnpaidAccruals, processSalaryPayment } from "@/actions/payroll-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES } from "@/lib/finance-categories";
import type { UnpaidAccrual } from "@/types/dashboard";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" }
] as const;

const DEFAULT_RANGE = {
  from: format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd"),
  to: format(new Date(), "yyyy-MM-dd")
};

type ExpenseForm = {
  amount: string;
  description: string;
  category: string;
  payment_method: string;
};

type FinanceSummary = {
  openingBalance: number;
  periodRevenue: number;
  periodExpenses: number;
  netChange: number;
  closingBalance: number;
  cashRevenue: number;
  approvedClaimRevenue: number;
  reimbursedClaimExpense: number;
  directExpenses: number;
  salaryExpenses: number;
  totalTransactions: number;
  salaryLiability: number;
  pendingClaims: { count: number; amount: number };
  approvedClaims: { count: number; amount: number };
  reimbursedClaims: { count: number; amount: number };
  rejectedClaims: { count: number; amount: number };
};

type MonthlyRow = {
  monthKey: string;
  monthLabel: string;
  openingBalance: number;
  revenue: number;
  expense: number;
  netChange: number;
  closingBalance: number;
  cashRevenue: number;
  claimRevenue: number;
  reimbursedClaimExpense: number;
  directExpenses: number;
  salaryExpenses: number;
};

type LedgerItem = {
  id: string;
  date: string;
  createdAt: string;
  amount: number;
  type: "revenue" | "expense";
  sourceType: "cash_revenue" | "claim_approval" | "claim_reimbursement" | "business_expense" | "salary_payment";
  title: string;
  description: string;
  category: string;
  method: string;
  person: string | null;
};

type ClaimItem = {
  id: string;
  amount: number | string;
  description: string;
  category: string;
  payment_method: string;
  reimbursement_method?: string | null;
  expense_date: string;
  created_at: string;
  approved_at?: string | null;
  reimbursed_at?: string | null;
  reimbursed_amount?: number;
  outstanding_amount?: number;
  payment_count?: number;
  payments?: {
    id: string;
    amount: number | string;
    payment_method: string;
    paid_at: string;
    note?: string | null;
    created_at: string;
  }[];
  status: "pending" | "approved" | "partially_paid" | "rejected" | "paid";
  rejection_reason?: string | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    department: string | null;
  } | null;
};

type Contributor = {
  employeeId: string;
  name: string;
  avatar: string | null;
  department: string | null;
  submittedAmount: number;
  approvedAmount: number;
  reimbursedAmount: number;
  outstandingApprovedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  claimsCount: number;
  latestExpenseDate: string;
};

type FinanceDashboardResult = {
  dateRange: { from: string; to: string };
  summary: FinanceSummary;
  monthly: MonthlyRow[];
  ledger: LedgerItem[];
  claims: ClaimItem[];
  contributors: Contributor[];
  categoryBreakdown: { name: string; value: number }[];
};

const EMPTY_DASHBOARD: FinanceDashboardResult = {
  dateRange: DEFAULT_RANGE,
  summary: {
    openingBalance: 0,
    periodRevenue: 0,
    periodExpenses: 0,
    netChange: 0,
    closingBalance: 0,
    cashRevenue: 0,
    approvedClaimRevenue: 0,
    reimbursedClaimExpense: 0,
    directExpenses: 0,
    salaryExpenses: 0,
    totalTransactions: 0,
    salaryLiability: 0,
    pendingClaims: { count: 0, amount: 0 },
    approvedClaims: { count: 0, amount: 0 },
    reimbursedClaims: { count: 0, amount: 0 },
    rejectedClaims: { count: 0, amount: 0 }
  },
  monthly: [],
  ledger: [],
  claims: [],
  contributors: [],
  categoryBreakdown: []
};

const inr = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

export default function AdminFinancePage() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [activePreset, setActivePreset] = useState("12m");
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [rejectingClaim, setRejectingClaim] = useState<ClaimItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [payingClaim, setPayingClaim] = useState<ClaimItem | null>(null);
  const [claimPaymentAmount, setClaimPaymentAmount] = useState("");
  const [reimbursementMethod, setReimbursementMethod] = useState("bank_transfer");
  const [editingPayment, setEditingPayment] = useState<{ claim: ClaimItem; payment: NonNullable<ClaimItem["payments"]>[number] } | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");
  const [editingPaymentMethod, setEditingPaymentMethod] = useState("bank_transfer");
  const [editingPaymentDate, setEditingPaymentDate] = useState("");
  const [claimSearch, setClaimSearch] = useState("");
  const [claimStatusFilter, setClaimStatusFilter] = useState("all");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");
  const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    amount: "",
    description: "",
    category: EXPENSE_CATEGORIES[0],
    payment_method: "cash"
  });

  const deferredClaimSearch = useDeferredValue(claimSearch);
  const deferredLedgerSearch = useDeferredValue(ledgerSearch);

  const { data, isLoading } = useQuery<FinanceDashboardResult>({
    queryKey: ["company-finance-dashboard", range.from, range.to],
    queryFn: () => getCompanyFinanceDashboard(range) as Promise<FinanceDashboardResult>
  });

  const dashboard = data ?? EMPTY_DASHBOARD;

  const invalidateTreasury = () => {
    queryClient.invalidateQueries({ queryKey: ["company-finance-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["unpaid-accruals"] });
  };

  const accrualMutation = useMutation({
    mutationFn: () => generateMonthlyAccruals(new Date()),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Accruals generated for ${result.count} employees`);
        invalidateTreasury();
        return;
      }
      toast.error(result.error ?? "Failed to generate accruals");
    }
  });

  const revenueMutation = useMutation({
    mutationFn: () => postRevenue(Number(revenueForm.amount), revenueForm.source, revenueForm.description || undefined) as Promise<{ success?: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Revenue logged");
        setRevenueOpen(false);
        setRevenueForm({ amount: "", source: "", description: "" });
        invalidateTreasury();
        return;
      }
      toast.error(result.error ?? "Failed to log revenue");
    }
  });

  const expenseMutation = useMutation({
    mutationFn: () =>
      postBusinessExpense({
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        category: expenseForm.category,
        payment_method: expenseForm.payment_method
      }) as Promise<{ success?: boolean; error?: string }>,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Expense logged");
        setExpenseOpen(false);
        setExpenseForm({ amount: "", description: "", category: EXPENSE_CATEGORIES[0], payment_method: "cash" });
        invalidateTreasury();
        return;
      }
      toast.error(result.error ?? "Failed to log expense");
    }
  });

  const claimDecisionMutation = useMutation({
    mutationFn: (payload: { claimId: string; status: "approved" | "rejected"; reason?: string }) =>
      updateClaimStatus(payload.claimId, payload.status, payload.reason),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        setRejectingClaim(null);
        setRejectionReason("");
        invalidateTreasury();
        return;
      }
      toast.error(result.message);
    }
  });

  const claimPaymentMutation = useMutation({
    mutationFn: (payload: { claimId: string; reimbursementMethod: string; amount: number }) =>
      markClaimAsPaid(payload.claimId, payload.reimbursementMethod, payload.amount),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        setPayingClaim(null);
        setClaimPaymentAmount("");
        setReimbursementMethod("bank_transfer");
        invalidateTreasury();
        return;
      }
      toast.error(result.message);
    }
  });

  const claimPaymentEditMutation = useMutation({
    mutationFn: (payload: { paymentId: string; claimId: string; amount: number; reimbursementMethod: string; paidAt: string }) =>
      updateClaimPayment(payload.paymentId, payload.claimId, payload.amount, payload.reimbursementMethod, payload.paidAt),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        setEditingPayment(null);
        setEditingPaymentAmount("");
        setEditingPaymentMethod("bank_transfer");
        setEditingPaymentDate("");
        invalidateTreasury();
        return;
      }
      toast.error(result.message);
    }
  });

  const chartData = dashboard.monthly.map((row) => ({
    label: format(new Date(`${row.monthKey}-01`), "MMM"),
    revenue: row.revenue,
    expense: row.expense,
    closing: row.closingBalance
  }));

  const filteredClaims = dashboard.claims
    .filter((claim) => {
      const search = deferredClaimSearch.trim().toLowerCase();
      const matchesSearch = !search ||
        claim.description.toLowerCase().includes(search) ||
        claim.category.toLowerCase().includes(search) ||
        (claim.profiles?.full_name || "").toLowerCase().includes(search);
      const matchesStatus = claimStatusFilter === "all" || claim.status === claimStatusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((left, right) =>
      new Date(right.expense_date).getTime() - new Date(left.expense_date).getTime() ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );

  const filteredLedger = dashboard.ledger
    .filter((item) => {
      const search = deferredLedgerSearch.trim().toLowerCase();
      const matchesSearch = !search ||
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        (item.person || "").toLowerCase().includes(search);
      const matchesType =
        ledgerTypeFilter === "all" ||
        (ledgerTypeFilter === "inflow" && item.type === "revenue") ||
        (ledgerTypeFilter === "outflow" && item.type === "expense");
      return matchesSearch && matchesType;
    });

  const highlightMonth = dashboard.monthly.reduce<MonthlyRow | null>((best, row) => {
    if (!best) return row;
    return Math.abs(row.netChange) > Math.abs(best.netChange) ? row : best;
  }, null);

  const maxCategoryValue = dashboard.categoryBreakdown[0]?.value || 1;

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

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="treasury-board p-0">
        <div className="relative px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <div className="treasury-chip">
                  <Wallet className="h-3.5 w-3.5" />
                  Finance Treasury
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">Company Finance Management</h1>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    Monthly treasury view with carry-forward balances, approved employee claims counted as treasury inflow, and reimbursed claims counted as company expense.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:w-[520px]">
                <Button
                  variant="outline"
                  onClick={() => accrualMutation.mutate()}
                  disabled={accrualMutation.isPending}
                  className="justify-center border-border/80 bg-background/70 text-foreground shadow-sm backdrop-blur hover:bg-background/90"
                >
                  {accrualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Generate Accruals
                </Button>
                <Button
                  onClick={() => setRevenueOpen(true)}
                  className="justify-center bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Revenue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setExpenseOpen(true)}
                  className="justify-center border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-200"
                >
                  <TrendingDown className="h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.45fr,0.55fr]">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <HeroMetric label="Opening Balance" value={inr(dashboard.summary.openingBalance)} tone="text-foreground" />
                <HeroMetric label="Period Revenue" value={inr(dashboard.summary.periodRevenue)} tone="text-emerald-600 dark:text-emerald-300" />
                <HeroMetric label="Period Expense" value={inr(dashboard.summary.periodExpenses)} tone="text-rose-600 dark:text-rose-300" />
                <HeroMetric label="Net Change" value={inr(dashboard.summary.netChange)} tone={dashboard.summary.netChange >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"} />
                <HeroMetric label="Closing Balance" value={inr(dashboard.summary.closingBalance)} tone={dashboard.summary.closingBalance >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"} />
                <HeroMetric label="Salary Liability" value={inr(dashboard.summary.salaryLiability)} tone="text-amber-700 dark:text-amber-300" />
              </div>

              <div className="rounded-[24px] border border-border/70 bg-background/65 p-4 shadow-soft backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  Range & Rollup
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="finance-from">From</Label>
                      <DateField
                        id="finance-from"
                        value={range.from}
                        onChange={(value) => {
                          setRange((previous) => ({ ...previous, from: value }));
                          setActivePreset("custom");
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="finance-to">To</Label>
                      <DateField
                        id="finance-to"
                        value={range.to}
                        onChange={(value) => {
                          setRange((previous) => ({ ...previous, to: value }));
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
                        className="rounded-full"
                        onClick={() => setPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <SummaryPill label="Claim Revenue" value={inr(dashboard.summary.approvedClaimRevenue)} tone="text-emerald-600 dark:text-emerald-300" />
                    <SummaryPill label="Claim Expense" value={inr(dashboard.summary.reimbursedClaimExpense)} tone="text-rose-600 dark:text-rose-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 rounded-2xl border border-border/70 bg-background/80 p-1 md:grid-cols-4">
          <TabsTrigger value="overview" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="claims" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Claims</TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ledger</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.45fr,0.55fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">English Month Cashflow</CardTitle>
                <CardDescription>Revenue and expense by month, with each month carrying the previous closing balance forward.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.25)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "1px solid rgba(148, 163, 184, 0.25)",
                          background: "rgba(20, 24, 33, 0.9)",
                          color: "#fff"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#0f9f6e" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#e11d48" radius={[8, 8, 0, 0]} />
                      <Line type="monotone" dataKey="closing" name="Closing Balance" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Composition</CardTitle>
                  <CardDescription>Approved employee claims are counted as treasury inflow until the company reimburses them.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SummaryPill label="Cash Revenue" value={inr(dashboard.summary.cashRevenue)} tone="text-emerald-600 dark:text-emerald-300" />
                  <SummaryPill label="Approved Claim Revenue" value={inr(dashboard.summary.approvedClaimRevenue)} tone="text-primary" />
                  <SummaryPill label="Direct Company Expenses" value={inr(dashboard.summary.directExpenses)} tone="text-rose-600 dark:text-rose-300" />
                  <SummaryPill label="Salary Expenses" value={inr(dashboard.summary.salaryExpenses)} tone="text-amber-700 dark:text-amber-300" />
                  <SummaryPill label="Reimbursed Claims" value={inr(dashboard.summary.reimbursedClaimExpense)} tone="text-sky-600 dark:text-sky-300" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Claim Pipeline</CardTitle>
                  <CardDescription>Current claim status split inside the selected date range.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SummaryPill label="Pending Review" value={`${dashboard.summary.pendingClaims.count} • ${inr(dashboard.summary.pendingClaims.amount)}`} tone="text-amber-700 dark:text-amber-300" />
                  <SummaryPill label="Approved Pending Payment" value={`${dashboard.summary.approvedClaims.count} • ${inr(dashboard.summary.approvedClaims.amount)}`} tone="text-primary" />
                  <SummaryPill label="Reimbursed" value={`${dashboard.summary.reimbursedClaims.count} • ${inr(dashboard.summary.reimbursedClaims.amount)}`} tone="text-sky-600 dark:text-sky-300" />
                  <SummaryPill label="Rejected" value={`${dashboard.summary.rejectedClaims.count} • ${inr(dashboard.summary.rejectedClaims.amount)}`} tone="text-rose-600 dark:text-rose-300" />
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Closing Ledger</CardTitle>
              <CardDescription>
                Every English month shows opening balance, movement inside the selected range, and the new closing balance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:hidden">
                {dashboard.monthly.map((row) => (
                  <div key={row.monthKey} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{row.monthLabel}</p>
                        <p className="text-xs text-muted-foreground">Opening {inr(row.openingBalance)}</p>
                      </div>
                      <Badge variant={row.netChange >= 0 ? "default" : "destructive"}>{row.netChange >= 0 ? "Positive" : "Negative"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <SummaryPill label="Revenue" value={inr(row.revenue)} tone="text-emerald-600 dark:text-emerald-300" />
                      <SummaryPill label="Expense" value={inr(row.expense)} tone="text-rose-600 dark:text-rose-300" />
                      <SummaryPill label="Net" value={inr(row.netChange)} tone={row.netChange >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"} />
                      <SummaryPill label="Closing" value={inr(row.closingBalance)} tone={row.closingBalance >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px]">
                  <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Opening</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3">Expense</th>
                      <th className="px-4 py-3">Net</th>
                      <th className="px-4 py-3">Closing</th>
                      <th className="px-4 py-3">Claim Revenue</th>
                      <th className="px-4 py-3">Claim Expense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.monthly.map((row) => (
                      <tr key={row.monthKey} className="border-b border-border/60 text-sm">
                        <td className="px-4 py-3 font-semibold">{row.monthLabel}</td>
                        <td className="px-4 py-3">{inr(row.openingBalance)}</td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-300">{inr(row.revenue)}</td>
                        <td className="px-4 py-3 text-rose-600 dark:text-rose-300">{inr(row.expense)}</td>
                        <td className={`px-4 py-3 font-semibold ${row.netChange >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"}`}>{inr(row.netChange)}</td>
                        <td className={`px-4 py-3 font-semibold ${row.closingBalance >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-300"}`}>{inr(row.closingBalance)}</td>
                        <td className="px-4 py-3">{inr(row.claimRevenue)}</td>
                        <td className="px-4 py-3">{inr(row.reimbursedClaimExpense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Treasury Movements</CardTitle>
                <CardDescription>Newest inflows and outflows inside the selected range.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.ledger.slice(0, 8).map((item) => <LedgerCard key={item.id} item={item} compact />)}
                {!dashboard.ledger.length && <EmptyState message="No finance movements recorded in this range." />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Snapshot</CardTitle>
                <CardDescription>High-signal read on the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SummaryPill label="Transactions" value={String(dashboard.summary.totalTransactions)} tone="text-foreground" />
                <SummaryPill
                  label="Best Swing Month"
                  value={highlightMonth ? `${highlightMonth.monthLabel} • ${inr(highlightMonth.netChange)}` : "No data"}
                  tone={highlightMonth && highlightMonth.netChange >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"}
                />
                <SummaryPill label="Top Contributor" value={dashboard.contributors[0] ? `${dashboard.contributors[0].name} • ${inr(dashboard.contributors[0].approvedAmount)}` : "No claims"} tone="text-primary" />
                <SummaryPill label="Top Category" value={dashboard.categoryBreakdown[0] ? `${dashboard.categoryBreakdown[0].name} • ${inr(dashboard.categoryBreakdown[0].value)}` : "No categories"} tone="text-foreground" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claim Review Workspace</CardTitle>
              <CardDescription>Approve employee-funded expenses, reject weak submissions, and mark reimbursements once money leaves the company.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1.3fr,0.7fr]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="relative">
                  <Receipt className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={claimSearch} onChange={(event) => setClaimSearch(event.target.value)} placeholder="Search employee, note, category" className="pl-9" />
                </div>
                <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Claim status" />
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
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <SummaryPill label="Pending" value={String(dashboard.summary.pendingClaims.count)} tone="text-amber-700 dark:text-amber-300" />
                <SummaryPill label="Approved" value={String(dashboard.summary.approvedClaims.count)} tone="text-primary" />
                <SummaryPill label="Paid" value={String(dashboard.summary.reimbursedClaims.count)} tone="text-sky-600 dark:text-sky-300" />
                <SummaryPill label="Rejected" value={String(dashboard.summary.rejectedClaims.count)} tone="text-rose-600 dark:text-rose-300" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claims</CardTitle>
                <CardDescription>{filteredClaims.length} claims match the current filters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredClaims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    approving={claimDecisionMutation.isPending}
                    paying={claimPaymentMutation.isPending}
                    onApprove={() => claimDecisionMutation.mutate({ claimId: claim.id, status: "approved" })}
                    onReject={() => {
                      setRejectingClaim(claim);
                      setRejectionReason("");
                    }}
                    onPay={() => {
                      setPayingClaim(claim);
                      setClaimPaymentAmount(String(Math.max(0, Number(claim.outstanding_amount ?? claim.amount))));
                      setReimbursementMethod("bank_transfer");
                    }}
                    onEditPayment={(payment) => {
                      setEditingPayment({ claim, payment });
                      setEditingPaymentAmount(String(payment.amount));
                      setEditingPaymentMethod(payment.payment_method);
                      setEditingPaymentDate(format(new Date(payment.paid_at), "yyyy-MM-dd"));
                    }}
                  />
                ))}
                {!filteredClaims.length && <EmptyState message="No claims match the selected filters." />}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contributor Ranking</CardTitle>
                  <CardDescription>Sorted by approved contribution volume, including already reimbursed claims.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.contributors.map((contributor, index) => (
                    <div key={contributor.employeeId} className="rounded-2xl border border-border/70 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contributor.avatar || undefined} />
                          <AvatarFallback>{contributor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{contributor.name}</p>
                          <p className="text-xs text-muted-foreground">{contributor.department || "Unassigned"} • {contributor.claimsCount} claims</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <SummaryPill label="Approved" value={inr(contributor.approvedAmount)} tone="text-primary" />
                        <SummaryPill label="Outstanding" value={inr(contributor.outstandingApprovedAmount)} tone="text-amber-700 dark:text-amber-300" />
                        <SummaryPill label="Paid" value={inr(contributor.reimbursedAmount)} tone="text-sky-600 dark:text-sky-300" />
                        <SummaryPill label="Pending" value={inr(contributor.pendingAmount)} tone="text-rose-600 dark:text-rose-300" />
                      </div>
                    </div>
                  ))}
                  {!dashboard.contributors.length && <EmptyState message="No contributor data available for this range." />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category Breakdown</CardTitle>
                  <CardDescription>Which claim categories employees have funded most in this period.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.categoryBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold">{item.name}</span>
                        <span className="font-black">{inr(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/70">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(10, Math.round((item.value / maxCategoryValue) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                  {!dashboard.categoryBreakdown.length && <EmptyState message="No category data available for this range." />}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Treasury Ledger</CardTitle>
              <CardDescription>Chronological list of cash revenue, approved claims, reimbursements, and company expenses.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1.4fr,0.8fr]">
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)} placeholder="Search ledger title, note, person, category" className="pl-9" />
              </div>
              <Select value={ledgerTypeFilter} onValueChange={setLedgerTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Flow type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All flows</SelectItem>
                  <SelectItem value="inflow">Inflows</SelectItem>
                  <SelectItem value="outflow">Outflows</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ledger Entries</CardTitle>
              <CardDescription>{filteredLedger.length} entries match the current search.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredLedger.map((item) => <LedgerCard key={item.id} item={item} />)}
              {!filteredLedger.length && <EmptyState message="No ledger entries match the current filters." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollPanel onTreasuryChanged={invalidateTreasury} />
        </TabsContent>
      </Tabs>

      <RevenueDialog open={revenueOpen} onOpenChange={setRevenueOpen} form={revenueForm} setForm={setRevenueForm} mutation={revenueMutation} />
      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} form={expenseForm} setForm={setExpenseForm} mutation={expenseMutation} />

      <Dialog open={Boolean(rejectingClaim)} onOpenChange={(open) => { if (!open) { setRejectingClaim(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>Provide a short reason so the employee understands what to correct or resubmit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {rejectingClaim && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="font-semibold">{rejectingClaim.profiles?.full_name || "Employee"}</p>
                <p className="text-muted-foreground">{rejectingClaim.description} • {inr(Number(rejectingClaim.amount))} • {rejectingClaim.category}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea id="reject-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Example: receipt missing or amount is outside policy." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingClaim(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectingClaim && claimDecisionMutation.mutate({ claimId: rejectingClaim.id, status: "rejected", reason: rejectionReason || undefined })}
              disabled={claimDecisionMutation.isPending}
            >
              {claimDecisionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(payingClaim)} onOpenChange={(open) => { if (!open) { setPayingClaim(null); setClaimPaymentAmount(""); setReimbursementMethod("bank_transfer"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Claim Payment</DialogTitle>
            <DialogDescription>Record a full or partial reimbursement. Every payment is added to expenses on the payment date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {payingClaim && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="font-semibold">{payingClaim.profiles?.full_name || "Employee"}</p>
                <p className="text-muted-foreground">{payingClaim.description} • {inr(Number(payingClaim.amount))} • {payingClaim.category}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="claim-payment-amount">Current Paying Amount</Label>
              <Input
                id="claim-payment-amount"
                type="number"
                min="0"
                max={String(Number(payingClaim?.outstanding_amount || payingClaim?.amount || 0))}
                value={claimPaymentAmount}
                onChange={(event) => setClaimPaymentAmount(event.target.value)}
                placeholder="Enter amount to pay now"
              />
              {payingClaim && (
                <p className="text-xs text-muted-foreground">
                  Claim total {inr(Number(payingClaim.amount))} | outstanding now {inr(Number(payingClaim.outstanding_amount || payingClaim.amount))}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reimbursement-method">Reimbursement Method</Label>
              <Select value={reimbursementMethod} onValueChange={setReimbursementMethod}>
                <SelectTrigger id="reimbursement-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayingClaim(null); setClaimPaymentAmount(""); }}>Cancel</Button>
            <Button
              onClick={() => payingClaim && claimPaymentMutation.mutate({ claimId: payingClaim.id, reimbursementMethod, amount: Number(claimPaymentAmount) })}
              disabled={
                claimPaymentMutation.isPending ||
                Number(claimPaymentAmount) <= 0 ||
                Number(claimPaymentAmount) > Number(payingClaim?.outstanding_amount || payingClaim?.amount || 0)
              }
            >
              {claimPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingPayment)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPayment(null);
            setEditingPaymentAmount("");
            setEditingPaymentMethod("bank_transfer");
            setEditingPaymentDate("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Claim Payment</DialogTitle>
            <DialogDescription>Update the reimbursement entry. Treasury totals will recalculate from this payment ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editingPayment && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="font-semibold">{editingPayment.claim.profiles?.full_name || "Employee"}</p>
                <p className="text-muted-foreground">{editingPayment.claim.description} | Claim total {inr(Number(editingPayment.claim.amount))}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-claim-payment-amount">Amount</Label>
              <Input
                id="edit-claim-payment-amount"
                type="number"
                min="0"
                value={editingPaymentAmount}
                onChange={(event) => setEditingPaymentAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-claim-payment-date">Payment Date</Label>
              <DateField id="edit-claim-payment-date" value={editingPaymentDate} onChange={setEditingPaymentDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reimbursement-method">Reimbursement Method</Label>
              <Select value={editingPaymentMethod} onValueChange={setEditingPaymentMethod}>
                <SelectTrigger id="edit-reimbursement-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancel</Button>
            <Button
              onClick={() => editingPayment && claimPaymentEditMutation.mutate({
                paymentId: editingPayment.payment.id,
                claimId: editingPayment.claim.id,
                amount: Number(editingPaymentAmount),
                reimbursementMethod: editingPaymentMethod,
                paidAt: editingPaymentDate
              })}
              disabled={claimPaymentEditMutation.isPending || Number(editingPaymentAmount) <= 0 || !editingPaymentDate}
            >
              {claimPaymentEditMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayrollPanel({ onTreasuryChanged }: { onTreasuryChanged: () => void }) {
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["unpaid-accruals"],
    queryFn: () => getUnpaidAccruals()
  });

  const paymentMutation = useMutation({
    mutationFn: (payload: { accrualId: string; amount: number; paymentMethod: string }) => processSalaryPayment(payload),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["unpaid-accruals"] });
        onTreasuryChanged();
        return;
      }
      toast.error(result.message);
    }
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = (data?.data ?? []) as UnpaidAccrual[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending Salary Payouts</CardTitle>
        <CardDescription>Salary disbursements logged here are counted as company expense in the treasury dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={row.profiles?.avatar_url || undefined} />
                <AvatarFallback>{row.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.profiles?.full_name || "Employee"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(row.month_year), "MMMM yyyy")} • Remaining {inr(Number(row.remaining_amount))}</p>
              </div>
            </div>

            <Dialog onOpenChange={(open) => { if (open) setPaymentAmount(String(row.remaining_amount)); }}>
              <DialogTrigger asChild><Button size="sm">Pay Salary</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process Salary Payment</DialogTitle>
                  <DialogDescription>Confirm payout for {row.profiles?.full_name || "employee"}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor={`salary-amount-${row.id}`}>Amount</Label>
                  <Input
                    id={`salary-amount-${row.id}`}
                    type="number"
                    max={row.remaining_amount}
                    value={paymentAmount}
                    onChange={(event) => {
                      if (Number(event.target.value) <= Number(row.remaining_amount)) setPaymentAmount(event.target.value);
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => paymentMutation.mutate({ accrualId: row.id, amount: Number(paymentAmount), paymentMethod: "bank_transfer" })}
                    disabled={paymentMutation.isPending || Number(paymentAmount) <= 0}
                  >
                    {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ))}
        {!rows.length && <EmptyState message="No pending salary payouts." />}
      </CardContent>
    </Card>
  );
}

function RevenueDialog({
  open,
  onOpenChange,
  form,
  setForm,
  mutation
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: { amount: string; source: string; description: string };
  setForm: Dispatch<SetStateAction<{ amount: string; source: string; description: string }>>;
  mutation: { mutate: () => void; isPending: boolean };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Revenue</DialogTitle>
          <DialogDescription>Log a company inflow for the selected treasury period.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" value={form.amount} onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Input value={form.source} onChange={(event) => setForm((previous) => ({ ...previous, source: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.amount || !form.source || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Revenue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  form,
  setForm,
  mutation
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ExpenseForm;
  setForm: Dispatch<SetStateAction<ExpenseForm>>;
  mutation: { mutate: () => void; isPending: boolean };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Log a direct company expense. It will hit treasury outflow immediately.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" value={form.amount} onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(value) => setForm((previous) => ({ ...previous, category: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(value) => setForm((previous) => ({ ...previous, payment_method: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.amount || !form.description || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="treasury-metric">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-black ${tone}`}>{value}</p>
    </div>
  );
}

function DateField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-12"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-1 top-1 h-9 w-9 rounded-lg"
        onClick={() => inputRef.current?.showPicker?.()}
      >
        <CalendarDays className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ClaimCard({
  claim,
  onApprove,
  onReject,
  onPay,
  onEditPayment,
  approving,
  paying
}: {
  claim: ClaimItem;
  onApprove: () => void;
  onReject: () => void;
  onPay: () => void;
  onEditPayment: (payment: NonNullable<ClaimItem["payments"]>[number]) => void;
  approving: boolean;
  paying: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={claim.profiles?.avatar_url || undefined} />
            <AvatarFallback>{claim.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{claim.profiles?.full_name || "Employee"}</p>
              <Badge
                variant={claim.status === "rejected" ? "destructive" : "default"}
                className={
                  claim.status === "pending"
                    ? "bg-amber-500 hover:bg-amber-500"
                    : claim.status === "partially_paid"
                      ? "bg-sky-500 hover:bg-sky-500"
                      : claim.status === "paid"
                        ? "bg-sky-600 hover:bg-sky-600"
                        : ""
                }
              >
                {claim.status}
              </Badge>
              <Badge variant="outline">{claim.category}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{claim.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {claim.profiles?.department || "Unassigned"} • {format(new Date(claim.expense_date), "MMM dd, yyyy, h:mm a")} • paid via {claim.payment_method}
            </p>
            {claim.approved_at && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">Approved {format(new Date(claim.approved_at), "MMM dd, yyyy, h:mm a")}</p>}
            {claim.reimbursed_at && <p className="mt-1 text-xs text-sky-600 dark:text-sky-300">Reimbursed {format(new Date(claim.reimbursed_at), "MMM dd, yyyy, h:mm a")} via {claim.reimbursement_method || "bank_transfer"}</p>}
            {(Number(claim.reimbursed_amount || 0) > 0 || Number(claim.outstanding_amount || 0) > 0) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Paid so far {inr(Number(claim.reimbursed_amount || 0))} | Outstanding {inr(Number(claim.outstanding_amount || 0))}
              </p>
            )}
            {!!claim.payments?.length && (
              <div className="mt-3 space-y-2">
                {claim.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{inr(Number(payment.amount))}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(payment.paid_at), "MMM dd, yyyy, h:mm a")} | {payment.payment_method}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onEditPayment(payment)}>
                      Edit Payment
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {claim.rejection_reason && (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                {claim.rejection_reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-base font-black">{inr(Number(claim.amount))}</p>
          {claim.status === "pending" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button size="sm" onClick={onApprove} disabled={approving}>
                {approving && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} disabled={approving}>
                <X className="h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
          {(claim.status === "approved" || claim.status === "partially_paid") && (
            <Button size="sm" onClick={onPay} disabled={paying}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LedgerCard({ item, compact = false }: { item: LedgerItem; compact?: boolean }) {
  const isRevenue = item.type === "revenue";

  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isRevenue ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/12 text-rose-600 dark:text-rose-300"}`}>
            {isRevenue ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <Badge variant="outline">{item.category}</Badge>
              {!compact && <Badge variant="secondary">{item.sourceType.replaceAll("_", " ")}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(new Date(item.date), "MMM dd, yyyy, h:mm a")} • {item.method}
              {item.person ? ` • ${item.person}` : ""}
            </p>
          </div>
        </div>
        <p className={`text-base font-black ${isRevenue ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
          {isRevenue ? "+" : "-"} {inr(item.amount)}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
      <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary/70" />
      {message}
    </div>
  );
}
