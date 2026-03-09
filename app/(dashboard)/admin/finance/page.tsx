"use client";

import { useDeferredValue, useState, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Check, Clock3, Loader2, Plus, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import {
  generateMonthlyAccruals,
  getCompanyFinancials,
  getFinancialHistory,
  postBusinessExpense,
  postRevenue
} from "@/actions/finance";
import { getEmployeeExpenseWorkspace, updateClaimStatus } from "@/actions/finance-actions";
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
import {
  CategoryRow,
  ContributionCard,
  type EmployeeExpense,
  ExpenseClaimCard,
  FilterCard,
  MetricCard,
  MetricPill,
  SearchField
} from "@/components/admin/finance/workspace-parts";
import type { UnpaidAccrual } from "@/types/dashboard";
import { EXPENSE_CATEGORIES } from "@/lib/finance-categories";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" }
];

type LedgerItem = {
  id: string;
  type: "revenue" | "expense";
  title: string;
  date: string;
  category: string;
  method: string;
  amount: number | string;
};

type ExpenseForm = {
  amount: string;
  description: string;
  category: string;
  payment_method: string;
};

type CompanyFinancials = {
  totalRevenue: number;
  totalBusinessExpenses: number;
  totalLiability: number;
  netBalance: number;
};

type ContributorSummary = {
  employeeId: string;
  name: string;
  avatar: string | null;
  department: string | null;
  submittedAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  claimsCount: number;
  pendingCount: number;
  latestExpenseDate: string;
};

type WorkspaceData = {
  expenses: EmployeeExpense[];
  contributors: ContributorSummary[];
  categoryBreakdown: { name: string; value: number }[];
  summary: {
    contributionsCount: number;
    contributorCount: number;
    totalSubmittedAmount: number;
    totalApprovedAmount: number;
    totalPendingAmount: number;
    totalRejectedAmount: number;
    pendingClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
  };
};

const inr = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

const emptyWorkspace: WorkspaceData = {
  expenses: [],
  contributors: [],
  categoryBreakdown: [],
  summary: {
    contributionsCount: 0,
    contributorCount: 0,
    totalSubmittedAmount: 0,
    totalApprovedAmount: 0,
    totalPendingAmount: 0,
    totalRejectedAmount: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  }
};

export default function AdminFinancePage() {
  const queryClient = useQueryClient();
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [rejectingClaim, setRejectingClaim] = useState<EmployeeExpense | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [claimsSearch, setClaimsSearch] = useState("");
  const [claimsStatusFilter, setClaimsStatusFilter] = useState("all");
  const [claimsDepartmentFilter, setClaimsDepartmentFilter] = useState("all");
  const [claimsCategoryFilter, setClaimsCategoryFilter] = useState("all");
  const [contributionSearch, setContributionSearch] = useState("");
  const [contributionStatusFilter, setContributionStatusFilter] = useState("all");
  const [contributionDepartmentFilter, setContributionDepartmentFilter] = useState("all");
  const [contributionCategoryFilter, setContributionCategoryFilter] = useState("all");
  const [contributionSort, setContributionSort] = useState("latest");
  const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    amount: "",
    description: "",
    category: EXPENSE_CATEGORIES[0],
    payment_method: "cash"
  });
  const deferredClaimsSearch = useDeferredValue(claimsSearch);
  const deferredContributionSearch = useDeferredValue(contributionSearch);

  const { data: financials, isLoading } = useQuery({
    queryKey: ["company-financials", "company-only"],
    queryFn: () => getCompanyFinancials()
  });
  const { data: ledger } = useQuery({
    queryKey: ["financial-ledger", "company-only"],
    queryFn: () => getFinancialHistory()
  });
  const { data: workspaceResponse } = useQuery({
    queryKey: ["employee-expense-workspace"],
    queryFn: async () => {
      const res = await getEmployeeExpenseWorkspace();
      return res.ok ? res.data : emptyWorkspace;
    }
  });

  const accrualMutation = useMutation({
    mutationFn: () => generateMonthlyAccruals(new Date()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Accruals generated for ${res.count} employees`);
        queryClient.invalidateQueries({ queryKey: ["company-financials"] });
        queryClient.invalidateQueries({ queryKey: ["unpaid-accruals"] });
      } else toast.error(res.error ?? "Failed to generate accruals");
    }
  });

  const revenueMutation = useMutation({
    mutationFn: () => postRevenue(Number(revenueForm.amount), revenueForm.source, revenueForm.description || undefined) as Promise<{ success?: boolean; error?: string }>,
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Revenue logged.");
        setRevenueOpen(false);
        setRevenueForm({ amount: "", source: "", description: "" });
        queryClient.invalidateQueries({ queryKey: ["company-financials"] });
        queryClient.invalidateQueries({ queryKey: ["financial-ledger"] });
      } else toast.error(res.error ?? "Failed to log revenue");
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
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Expense logged.");
        setExpenseOpen(false);
        setExpenseForm({ amount: "", description: "", category: EXPENSE_CATEGORIES[0], payment_method: "cash" });
        queryClient.invalidateQueries({ queryKey: ["company-financials"] });
        queryClient.invalidateQueries({ queryKey: ["financial-ledger"] });
      } else toast.error(res.error ?? "Failed to log expense");
    }
  });

  const ledgerItems = (ledger ?? []) as LedgerItem[];
  const finance = financials as CompanyFinancials | undefined;
  const workspace = workspaceResponse || emptyWorkspace;
  const contributors = workspace.contributors;
  const departments = Array.from(new Set(contributors.map((contributor) => contributor.department || "Unassigned"))).sort();
  const categories = workspace.categoryBreakdown.map((item) => item.name);
  const pendingClaims = workspace.expenses.filter((expense) => expense.status === "pending");
  const recentDecisions = workspace.expenses.filter((expense) => expense.status !== "pending").slice(0, 6);
  const filteredClaims = workspace.expenses
    .filter((expense) => {
      const search = deferredClaimsSearch.trim().toLowerCase();
      const matchesSearch = !search ||
        expense.description.toLowerCase().includes(search) ||
        expense.category.toLowerCase().includes(search) ||
        (expense.profiles?.full_name || "").toLowerCase().includes(search);
      const matchesStatus = claimsStatusFilter === "all" || expense.status === claimsStatusFilter;
      const matchesDepartment = claimsDepartmentFilter === "all" || (expense.profiles?.department || "Unassigned") === claimsDepartmentFilter;
      const matchesCategory = claimsCategoryFilter === "all" || expense.category === claimsCategoryFilter;
      return matchesSearch && matchesStatus && matchesDepartment && matchesCategory;
    })
    .sort((left, right) => {
      if (left.status === "pending" && right.status !== "pending") return -1;
      if (left.status !== "pending" && right.status === "pending") return 1;
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  const filteredContributions = workspace.expenses
    .filter((expense) => {
      const search = deferredContributionSearch.trim().toLowerCase();
      const matchesSearch = !search ||
        expense.description.toLowerCase().includes(search) ||
        expense.category.toLowerCase().includes(search) ||
        (expense.profiles?.full_name || "").toLowerCase().includes(search);
      const matchesStatus = contributionStatusFilter === "all" || expense.status === contributionStatusFilter;
      const matchesDepartment = contributionDepartmentFilter === "all" || (expense.profiles?.department || "Unassigned") === contributionDepartmentFilter;
      const matchesCategory = contributionCategoryFilter === "all" || expense.category === contributionCategoryFilter;
      return matchesSearch && matchesStatus && matchesDepartment && matchesCategory;
    })
    .sort((left, right) => {
      if (contributionSort === "highest") return Number(right.amount) - Number(left.amount);
      if (contributionSort === "lowest") return Number(left.amount) - Number(right.amount);
      if (contributionSort === "employee") return (left.profiles?.full_name || "").localeCompare(right.profiles?.full_name || "");
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

  const handleClaimAction = async (id: string, status: "approved" | "rejected", reason?: string) => {
    const res = await updateClaimStatus(id, status, reason);
    if (res.ok) {
      toast.success(res.message);
      setRejectingClaim(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["employee-expense-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["company-financials"] });
      queryClient.invalidateQueries({ queryKey: ["financial-ledger"] });
    } else toast.error(res.message);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <header className="treasury-board p-0">
        <div className="relative px-5 py-6 sm:px-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="treasury-chip">
                <Wallet className="h-3.5 w-3.5" />
                Finance Control Room
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">Company Treasury</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Review employee claims, monitor every contribution, and run payroll from one mobile-first workspace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroMetric label="Pending Claims" value={String(workspace.summary.pendingClaims)} />
              <HeroMetric label="Pending Amount" value={inr(workspace.summary.totalPendingAmount)} />
              <HeroMetric label="Active Contributors" value={String(workspace.summary.contributorCount)} />
              <HeroMetric label="Approved Reimbursed" value={inr(workspace.summary.totalApprovedAmount)} />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                onClick={() => accrualMutation.mutate()}
                disabled={accrualMutation.isPending}
                className="justify-center border-border/80 bg-background/70 text-foreground shadow-sm backdrop-blur hover:bg-background/90"
              >
                {accrualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                Generate Accruals
              </Button>
              <Button
                onClick={() => setRevenueOpen(true)}
                className="justify-center bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/92"
              >
                <Plus className="h-4 w-4" />
                Add Revenue
              </Button>
              <Button
                variant="outline"
                onClick={() => setExpenseOpen(true)}
                className="justify-center border-amber-500/25 bg-amber-500/10 text-amber-700 shadow-sm hover:bg-amber-500/15 dark:text-amber-200"
              >
                <TrendingDown className="h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 rounded-2xl border border-border/70 bg-background/80 p-1 md:grid-cols-4">
          <TabsTrigger value="overview" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em]">Overview</TabsTrigger>
          <TabsTrigger value="claims" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em]">Claims</TabsTrigger>
          <TabsTrigger value="contributions" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em]">Contributions</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.08em]">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Revenue" value={inr(finance?.totalRevenue ?? 0)} icon={TrendingUp} color="text-emerald-600" />
            <StatCard title="Business Expense" value={inr(finance?.totalBusinessExpenses ?? 0)} icon={TrendingDown} color="text-rose-600" />
            <StatCard title="Salary Liability" value={inr(finance?.totalLiability ?? 0)} icon={Calculator} color="text-amber-600" />
            <StatCard title="Net Balance" value={inr(finance?.netBalance ?? 0)} icon={TrendingUp} color={(finance?.netBalance ?? 0) >= 0 ? "text-primary" : "text-rose-600"} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr,0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claims Queue</CardTitle>
                <CardDescription>Priority list of employee requests waiting for finance review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingClaims.slice(0, 5).map((claim) => (
                  <ExpenseClaimCard
                    key={claim.id}
                    claim={claim}
                    compact
                    onApprove={() => handleClaimAction(claim.id, "approved")}
                    onReject={() => {
                      setRejectingClaim(claim);
                      setRejectionReason("");
                    }}
                  />
                ))}
                {!pendingClaims.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No pending claims. Approvals are caught up.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Contributors</CardTitle>
                <CardDescription>Employees who have funded the highest approved spend for the company.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contributors.slice(0, 5).map((contributor, index) => (
                  <div key={contributor.employeeId} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contributor.avatar || undefined} />
                      <AvatarFallback>{contributor.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{contributor.name}</p>
                      <p className="text-xs text-muted-foreground">{contributor.department || "Unassigned"} | {contributor.claimsCount} claims</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">{inr(contributor.approvedAmount)}</p>
                      <p className="text-[11px] text-muted-foreground">{inr(contributor.pendingAmount)} pending</p>
                    </div>
                  </div>
                ))}
                {!contributors.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No employee contributions recorded yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Ledger</CardTitle>
                <CardDescription>Latest company revenue and approved expense activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ledgerItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM dd, yyyy")} | {item.category}{item.method !== "-" ? ` | ${item.method}` : ""}</p>
                    </div>
                    <p className={`text-sm font-black ${item.type === "revenue" ? "text-emerald-600" : "text-rose-600"}`}>{item.type === "revenue" ? "+" : "-"} {inr(Number(item.amount))}</p>
                  </div>
                ))}
                {!ledgerItems.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No transactions recorded yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contribution Mix</CardTitle>
                <CardDescription>Where employee-funded company spend is currently concentrated.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace.categoryBreakdown.slice(0, 6).map((item) => (
                  <CategoryRow key={item.name} label={item.name} value={item.value} max={workspace.categoryBreakdown[0]?.value || 1} />
                ))}
                {!workspace.categoryBreakdown.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No categorized contributions yet.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <FilterCard title="Employee Claims" description="Review pending, approved, and rejected employee reimbursement requests with fast filters.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SearchField value={claimsSearch} onChange={setClaimsSearch} placeholder="Search employee, category, note" />
              <Select value={claimsStatusFilter} onValueChange={setClaimsStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={claimsDepartmentFilter} onValueChange={setClaimsDepartmentFilter}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={claimsCategoryFilter} onValueChange={setClaimsCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </FilterCard>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={Clock3} label="Pending" value={String(workspace.summary.pendingClaims)} tone="text-amber-600" />
            <MetricCard icon={Check} label="Approved" value={String(workspace.summary.approvedClaims)} tone="text-emerald-600" />
            <MetricCard icon={X} label="Rejected" value={String(workspace.summary.rejectedClaims)} tone="text-rose-600" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employees Who Raised Claims</CardTitle>
              <CardDescription>Every employee contributor is listed here with their claim volume and pending exposure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contributors.map((contributor) => (
                <div key={contributor.employeeId} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contributor.avatar || undefined} />
                    <AvatarFallback>{contributor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{contributor.name}</p>
                    <p className="text-xs text-muted-foreground">{contributor.department || "Unassigned"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-right text-xs sm:min-w-[220px]">
                    <div>
                      <p className="font-black">{contributor.claimsCount}</p>
                      <p className="text-muted-foreground">claims</p>
                    </div>
                    <div>
                      <p className="font-black text-amber-600">{inr(contributor.pendingAmount)}</p>
                      <p className="text-muted-foreground">pending</p>
                    </div>
                  </div>
                </div>
              ))}
              {!contributors.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No employees have raised claims yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claims Review Board</CardTitle>
              <CardDescription>{filteredClaims.length} requests match the current filters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredClaims.map((claim) => (
                <ExpenseClaimCard
                  key={claim.id}
                  claim={claim}
                  onApprove={() => handleClaimAction(claim.id, "approved")}
                  onReject={() => {
                    setRejectingClaim(claim);
                    setRejectionReason("");
                  }}
                />
              ))}
              {!filteredClaims.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No claims match the selected filters.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Decisions</CardTitle>
              <CardDescription>Most recent claim outcomes after finance review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentDecisions.map((claim) => <ExpenseClaimCard key={claim.id} claim={claim} readOnly />)}
              {!recentDecisions.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No claim decisions have been recorded yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions" className="space-y-4">
          <FilterCard title="Contribution Explorer" description="Inspect every employee-funded expense with mobile-friendly filtering, sorting, and rankings.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <SearchField value={contributionSearch} onChange={setContributionSearch} placeholder="Search employee, category, note" />
              <Select value={contributionStatusFilter} onValueChange={setContributionStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contributionDepartmentFilter} onValueChange={setContributionDepartmentFilter}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={contributionCategoryFilter} onValueChange={setContributionCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={contributionSort} onValueChange={setContributionSort}>
                <SelectTrigger><SelectValue placeholder="Sort order" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest first</SelectItem>
                  <SelectItem value="highest">Highest amount</SelectItem>
                  <SelectItem value="lowest">Lowest amount</SelectItem>
                  <SelectItem value="employee">Employee A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FilterCard>

          <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employee Expense Feed</CardTitle>
                <CardDescription>{filteredContributions.length} contribution records match the current filters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredContributions.map((expense) => <ContributionCard key={expense.id} expense={expense} />)}
                {!filteredContributions.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No employee contributions match the selected filters.</p>}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contributor Ranking</CardTitle>
                  <CardDescription>Sorted by approved contribution volume, then total submitted spend.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contributors.map((contributor, index) => (
                    <div key={contributor.employeeId} className="rounded-2xl border border-border/70 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contributor.avatar || undefined} />
                          <AvatarFallback>{contributor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{contributor.name}</p>
                          <p className="text-xs text-muted-foreground">{contributor.department || "Unassigned"}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <MetricPill label="Approved" value={inr(contributor.approvedAmount)} tone="text-emerald-600" />
                        <MetricPill label="Pending" value={inr(contributor.pendingAmount)} tone="text-amber-600" />
                        <MetricPill label="Submitted" value={inr(contributor.submittedAmount)} tone="text-primary" />
                        <MetricPill label="Claims" value={String(contributor.claimsCount)} tone="text-zinc-800 dark:text-zinc-100" />
                      </div>
                    </div>
                  ))}
                  {!contributors.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No contributor data available.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category Breakdown</CardTitle>
                  <CardDescription>Highest employee-funded categories across the current organization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workspace.categoryBreakdown.map((item) => <CategoryRow key={item.name} label={item.name} value={item.value} max={workspace.categoryBreakdown[0]?.value || 1} />)}
                  {!workspace.categoryBreakdown.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No category data yet.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payroll"><PayrollTab /></TabsContent>
      </Tabs>

      <RevenueDialog open={revenueOpen} onOpenChange={setRevenueOpen} form={revenueForm} setForm={setRevenueForm} mutation={revenueMutation} />
      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} form={expenseForm} setForm={setExpenseForm} mutation={expenseMutation} />
      <Dialog open={Boolean(rejectingClaim)} onOpenChange={(open) => { if (!open) { setRejectingClaim(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>Share a short reason so the employee knows what to fix or resubmit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {rejectingClaim && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
                <p className="font-semibold">{rejectingClaim.profiles?.full_name || "Employee"}</p>
                <p className="text-muted-foreground">{rejectingClaim.description} | {inr(Number(rejectingClaim.amount))} | {rejectingClaim.category}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea id="reject-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Example: Receipt missing or amount exceeds policy." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingClaim(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectingClaim && handleClaimAction(rejectingClaim.id, "rejected", rejectionReason || undefined)}>Reject Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
          <DialogDescription>Log company-level revenue.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Source</Label><Input value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Description (optional)</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.amount || !form.source || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save Revenue
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
          <DialogDescription>Log company-level expense.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm((p) => ({ ...p, payment_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.amount || !form.description || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollTab() {
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState("");

  const { data: unpaidAccruals, isLoading } = useQuery({
    queryKey: ["unpaid-accruals"],
    queryFn: () => getUnpaidAccruals()
  });

  const payMutation = useMutation({
    mutationFn: (data: { accrualId: string; amount: number; paymentMethod: string }) => processSalaryPayment(data),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(res.message);
        queryClient.invalidateQueries({ queryKey: ["unpaid-accruals"] });
        queryClient.invalidateQueries({ queryKey: ["company-financials"] });
        queryClient.invalidateQueries({ queryKey: ["financial-ledger"] });
      } else toast.error(res.message);
    }
  });

  if (isLoading) return <div className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" /></div>;

  const rows = (unpaidAccruals?.data ?? []) as UnpaidAccrual[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending Salary Payouts</CardTitle>
        <CardDescription>Process salary disbursement from this queue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No pending salary payouts.</p>}
        {rows.map((row) => (
          <div key={row.id} className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={row.profiles?.avatar_url ?? undefined} />
                <AvatarFallback>{row.profiles?.full_name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.profiles?.full_name ?? "Employee"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(row.month_year), "MMMM yyyy")}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{inr(Number(row.remaining_amount))}</Badge>
              <Dialog onOpenChange={(open) => { if (open) setPaymentAmount(String(row.remaining_amount)); }}>
                <DialogTrigger asChild><Button size="sm">Pay</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Process Salary Payment</DialogTitle>
                    <DialogDescription>Confirm payout for {row.profiles?.full_name ?? "employee"}.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      max={row.remaining_amount}
                      value={paymentAmount}
                      onChange={(event) => {
                        if (Number(event.target.value) <= row.remaining_amount) setPaymentAmount(event.target.value);
                      }}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => payMutation.mutate({ accrualId: row.id, amount: Number(paymentAmount), paymentMethod: "bank_transfer" })}
                      disabled={payMutation.isPending || Number(paymentAmount) <= 0}
                    >
                      {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Confirm Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl border border-border/80 p-2.5">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
          <p className="text-base font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="treasury-metric">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black text-foreground">{value}</p>
    </div>
  );
}
