"use client";

import { type ComponentType, type ReactNode } from "react";
import { format } from "date-fns";
import { Filter, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type EmployeeExpense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  status: "pending" | "approved" | "rejected";
  expense_date: string;
  created_at: string;
  rejection_reason?: string | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    department: string | null;
    role: string | null;
  } | null;
};

const inr = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

export function SearchField({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function FilterCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: EmployeeExpense["status"] }) {
  if (status === "approved") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export function ExpenseClaimCard({
  claim,
  compact = false,
  readOnly = false,
  onApprove,
  onReject
}: {
  claim: EmployeeExpense;
  compact?: boolean;
  readOnly?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
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
              <StatusBadge status={claim.status} />
              <Badge variant="outline" className="h-6">{claim.category}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{claim.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {claim.profiles?.department || "Unassigned"} | {format(new Date(claim.expense_date), "MMM dd, yyyy")} | {claim.payment_method}
            </p>
            {claim.rejection_reason && (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
                {claim.rejection_reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-base font-black">{inr(Number(claim.amount))}</p>
          {!readOnly && claim.status === "pending" && (
            <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
              <Button size="sm" onClick={onApprove}>Approve</Button>
              <Button size="sm" variant="outline" onClick={onReject}>Reject</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContributionCard({ expense }: { expense: EmployeeExpense }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={expense.profiles?.avatar_url || undefined} />
            <AvatarFallback>{expense.profiles?.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{expense.profiles?.full_name || "Employee"}</p>
              <StatusBadge status={expense.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {expense.profiles?.department || "Unassigned"} | {format(new Date(expense.expense_date), "MMM dd, yyyy")}
            </p>
          </div>
          <p className="text-sm font-black">{inr(Number(expense.amount))}</p>
        </div>

        <div className="grid gap-2 text-xs sm:grid-cols-3">
          <MetricPill label="Category" value={expense.category} tone="text-primary" />
          <MetricPill label="Payment" value={expense.payment_method} tone="text-zinc-800 dark:text-zinc-100" />
          <MetricPill label="Submitted" value={format(new Date(expense.created_at), "MMM dd")} tone="text-zinc-800 dark:text-zinc-100" />
        </div>

        <p className="text-sm text-muted-foreground">{expense.description}</p>
        {expense.rejection_reason && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
            {expense.rejection_reason}
          </p>
        )}
      </div>
    </div>
  );
}

export function CategoryRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(10, Math.round((value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold">{label}</span>
        <span className="font-black">{inr(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted/70">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl border border-border/80 p-2.5">
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className={`text-base font-black ${tone}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xs font-bold ${tone}`}>{value}</p>
    </div>
  );
}
