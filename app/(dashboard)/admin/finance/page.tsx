"use client";

import { useState, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Check, Loader2, Plus, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import {
  generateMonthlyAccruals,
  getCompanyFinancials,
  getFinancialHistory,
  postBusinessExpense,
  postRevenue
} from "@/actions/finance";
import { getPendingClaims, updateClaimStatus } from "@/actions/finance-actions";
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

type PendingClaim = {
  id: string;
  amount: number;
  description: string;
  category: string;
  expense_date: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

type CompanyFinancials = {
  totalRevenue: number;
  totalBusinessExpenses: number;
  totalLiability: number;
  netBalance: number;
};

const inr = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

export default function AdminFinancePage() {
  const queryClient = useQueryClient();
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    amount: "",
    description: "",
    category: EXPENSE_CATEGORIES[0],
    payment_method: "cash"
  });

  const { data: financials, isLoading } = useQuery({
    queryKey: ["company-financials", "company-only"],
    queryFn: () => getCompanyFinancials()
  });
  const { data: ledger } = useQuery({
    queryKey: ["financial-ledger", "company-only"],
    queryFn: () => getFinancialHistory()
  });
  const { data: pendingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ["pending-claims"],
    queryFn: () => getPendingClaims()
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

  const claims = (pendingClaims?.data ?? []) as PendingClaim[];
  const ledgerItems = (ledger ?? []) as LedgerItem[];
  const finance = financials as CompanyFinancials | undefined;

  const handleClaimAction = async (id: string, status: "approved" | "rejected") => {
    const res = await updateClaimStatus(id, status);
    if (res.ok) {
      toast.success(res.message);
      refetchClaims();
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
    <div className="space-y-5">
      <header className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Finance</p>
            <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Company Treasury</h1>
            <p className="text-sm text-muted-foreground">Company-level financial operations only.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => accrualMutation.mutate()} disabled={accrualMutation.isPending}>
              {accrualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Generate Accruals
            </Button>
            <Button onClick={() => setRevenueOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Revenue
            </Button>
            <Button variant="secondary" onClick={() => setExpenseOpen(true)}>
              <TrendingDown className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto rounded-xl border border-border/70 bg-background/80 p-1">
          <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.08em]">Overview</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.08em]">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Revenue" value={inr(finance?.totalRevenue ?? 0)} icon={TrendingUp} color="text-emerald-600" />
            <StatCard title="Business Expense" value={inr(finance?.totalBusinessExpenses ?? 0)} icon={TrendingDown} color="text-rose-600" />
            <StatCard title="Salary Liability" value={inr(finance?.totalLiability ?? 0)} icon={Calculator} color="text-amber-600" />
            <StatCard title="Net Balance" value={inr(finance?.netBalance ?? 0)} icon={TrendingUp} color={(finance?.netBalance ?? 0) >= 0 ? "text-primary" : "text-rose-600"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Claims</CardTitle>
              <CardDescription>Approve or reject reimbursement requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {claims.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No pending claims.</p>}
              {claims.map((claim) => (
                <div key={claim.id} className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={claim.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback>{claim.profiles?.full_name?.charAt(0) ?? "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{claim.profiles?.full_name ?? "Employee"}</p>
                      <p className="truncate text-xs text-muted-foreground">{claim.description} - {format(new Date(claim.expense_date), "MMM dd, yyyy")} - {claim.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-7">{inr(claim.amount)}</Badge>
                    <Button size="sm" onClick={() => handleClaimAction(claim.id, "approved")}><Check className="h-3.5 w-3.5" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => handleClaimAction(claim.id, "rejected")}><X className="h-3.5 w-3.5" />Reject</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Ledger</CardTitle>
              <CardDescription>Company-wide revenue and approved expense transactions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Transaction</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledgerItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM dd, yyyy")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-medium">
                            {item.category}
                            {item.method !== "-" ? ` - ${item.method}` : ""}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${item.type === "revenue" ? "text-emerald-600" : "text-rose-600"}`}>
                          {item.type === "revenue" ? "+" : "-"} {inr(Number(item.amount))}
                        </td>
                      </tr>
                    ))}
                    {ledgerItems.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">No transactions recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll"><PayrollTab /></TabsContent>
      </Tabs>

      <RevenueDialog open={revenueOpen} onOpenChange={setRevenueOpen} form={revenueForm} setForm={setRevenueForm} mutation={revenueMutation} />
      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} form={expenseForm} setForm={setExpenseForm} mutation={expenseMutation} />
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
