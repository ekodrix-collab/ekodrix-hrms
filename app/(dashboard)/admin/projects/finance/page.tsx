"use client";

import Link from "next/link";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FolderKanban, Loader2, Plus, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { getCompanyFinancials, getFinancialHistory, postBusinessExpense, postRevenue } from "@/actions/finance";
import { getProjectsAction } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/finance-categories";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" }
];

type ProjectItem = { id: string; name: string };
type ProjectBreakdown = { id: string; name: string; revenue: number; expenses: number; net: number };
type FinancialsResult = { projectBreakdown: ProjectBreakdown[] };
type LedgerItem = { id: string; title: string; type: "revenue" | "expense"; date: string; amount: number | string; category: string };

const inr = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

export default function AdminProjectsFinancePage() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueForm, setRevenueForm] = useState({ amount: "", source: "", description: "" });
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    description: "",
    category: EXPENSE_CATEGORIES[0],
    payment_method: "cash"
  });

  const { data: projectsRes } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const res = await getProjectsAction();
      return res.ok ? res.data ?? [] : [];
    }
  });

  const { data: companyFinancials } = useQuery({
    queryKey: ["company-financials-project-breakdown"],
    queryFn: () => getCompanyFinancials()
  });

  const projectRows = useMemo(() => {
    const projects = (projectsRes ?? []) as ProjectItem[];
    const breakdown = ((companyFinancials as FinancialsResult | undefined)?.projectBreakdown ?? []) as ProjectBreakdown[];
    return projects.map((project) => {
      const metrics = breakdown.find((item) => item.id === project.id);
      return {
        id: project.id,
        name: project.name,
        revenue: metrics?.revenue ?? 0,
        expenses: metrics?.expenses ?? 0,
        net: metrics?.net ?? 0
      };
    });
  }, [projectsRes, companyFinancials]);

  const activeProjectId = selectedProjectId || projectRows[0]?.id || "";
  const activeProject = projectRows.find((project) => project.id === activeProjectId);

  const { data: activeFinancials } = useQuery({
    queryKey: ["project-finance-explorer", activeProjectId],
    queryFn: () => getCompanyFinancials(activeProjectId),
    enabled: Boolean(activeProjectId)
  });

  const { data: activeLedger } = useQuery({
    queryKey: ["project-ledger-explorer", activeProjectId],
    queryFn: () => getFinancialHistory(activeProjectId),
    enabled: Boolean(activeProjectId)
  });

  const revenueMutation = useMutation({
    mutationFn: () =>
      postRevenue(
        Number(revenueForm.amount),
        revenueForm.source,
        revenueForm.description || undefined,
        activeProjectId
      ) as Promise<{ success?: boolean; error?: string }>,
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Project revenue logged.");
        setRevenueOpen(false);
        setRevenueForm({ amount: "", source: "", description: "" });
        queryClient.invalidateQueries({ queryKey: ["company-financials-project-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["project-finance-explorer", activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ["project-ledger-explorer", activeProjectId] });
      } else toast.error(res.error ?? "Failed to log revenue");
    }
  });

  const expenseMutation = useMutation({
    mutationFn: () =>
      postBusinessExpense({
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        category: expenseForm.category,
        payment_method: expenseForm.payment_method,
        project_id: activeProjectId
      }) as Promise<{ success?: boolean; error?: string }>,
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Project expense logged.");
        setExpenseOpen(false);
        setExpenseForm({ amount: "", description: "", category: EXPENSE_CATEGORIES[0], payment_method: "cash" });
        queryClient.invalidateQueries({ queryKey: ["company-financials-project-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["project-finance-explorer", activeProjectId] });
        queryClient.invalidateQueries({ queryKey: ["project-ledger-explorer", activeProjectId] });
      } else toast.error(res.error ?? "Failed to log expense");
    }
  });

  const explorer = activeFinancials as { totalRevenue: number; totalBusinessExpenses: number; netBalance: number } | undefined;
  const ledger = (activeLedger ?? []) as LedgerItem[];

  return (
    <div className="space-y-5">
      <header className="surface-card p-5 sm:p-6">
        <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Project Finance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch projects to inspect and update project-level finance in one place.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Projects - Finance Snapshot</CardTitle>
          <CardDescription>Select a project to load its detailed finance explorer.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px]">
              <thead className="border-y bg-muted/30 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Expenses</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3 text-right">Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projectRows.map((project) => (
                  <tr
                    key={project.id}
                    className={`cursor-pointer hover:bg-muted/20 ${activeProjectId === project.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <td className="px-4 py-3 text-sm font-semibold">{project.name}</td>
                    <td className="px-4 py-3 text-sm">{inr(project.revenue)}</td>
                    <td className="px-4 py-3 text-sm">{inr(project.expenses)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${project.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{inr(project.net)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/projects/${project.id}/finance`} onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" variant="outline">Open</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {projectRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No projects available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 p-3 md:hidden">
            {projectRows.map((project) => (
              <div
                key={project.id}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  activeProjectId === project.id ? "border-primary/30 bg-primary/5" : "hover:bg-muted/20"
                }`}
              >
                <p className="text-sm font-semibold">{project.name}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Revenue</p>
                    <p className="font-semibold">{inr(project.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expense</p>
                    <p className="font-semibold">{inr(project.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net</p>
                    <p className={`font-semibold ${project.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{inr(project.net)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={activeProjectId === project.id ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {activeProjectId === project.id ? "Selected" : "Select"}
                  </Button>
                  <Link href={`/admin/projects/${project.id}/finance`}>
                    <Button size="sm" variant="outline" className="w-full">Open</Button>
                  </Link>
                </div>
              </div>
            ))}
            {projectRows.length === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No projects available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Finance Explorer</CardTitle>
          <CardDescription>View and update financials for the selected project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-xs">
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Selected Project</Label>
              <Select value={activeProjectId || undefined} onValueChange={setSelectedProjectId} disabled={!projectRows.length}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projectRows.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setRevenueOpen(true)} disabled={!activeProjectId}>
                <Plus className="h-4 w-4" />
                Add Revenue
              </Button>
              <Button variant="secondary" onClick={() => setExpenseOpen(true)} disabled={!activeProjectId}>
                <TrendingDown className="h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>

          {!activeProjectId && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Select a project to see finance details.
            </p>
          )}

          {activeProjectId && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniStat title="Revenue" value={inr(explorer?.totalRevenue ?? 0)} />
                <MiniStat title="Expenses" value={inr(explorer?.totalBusinessExpenses ?? 0)} />
                <MiniStat title="Net" value={inr(explorer?.netBalance ?? 0)} color={(explorer?.netBalance ?? 0) >= 0 ? "text-primary" : "text-rose-600"} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Recent Transactions</p>
                <div className="space-y-2">
                  {ledger.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM dd, yyyy")} - {item.category}</p>
                      </div>
                      <p className={`text-sm font-bold ${item.type === "revenue" ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.type === "revenue" ? "+" : "-"} {inr(Number(item.amount))}
                      </p>
                    </div>
                  ))}
                  {ledger.length === 0 && <p className="text-sm text-muted-foreground">No transactions found for this project.</p>}
                </div>
              </div>

              <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Need full controls and verdicts?</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Open detailed workspace for {activeProject?.name ?? "selected project"}.
                  </p>
                </div>
                <Link href={`/admin/projects/${activeProjectId}/finance`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    Open Detailed Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectRevenueDialog
        open={revenueOpen}
        onOpenChange={setRevenueOpen}
        projectName={activeProject?.name ?? "Project"}
        form={revenueForm}
        setForm={setRevenueForm}
        mutation={revenueMutation}
      />
      <ProjectExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        projectName={activeProject?.name ?? "Project"}
        form={expenseForm}
        setForm={setExpenseForm}
        mutation={expenseMutation}
      />
    </div>
  );
}

function ProjectRevenueDialog({
  open,
  onOpenChange,
  projectName,
  form,
  setForm,
  mutation
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  form: { amount: string; source: string; description: string };
  setForm: Dispatch<SetStateAction<{ amount: string; source: string; description: string }>>;
  mutation: { mutate: () => void; isPending: boolean };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project Revenue</DialogTitle>
          <DialogDescription>Log revenue for {projectName}.</DialogDescription>
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

function ProjectExpenseDialog({
  open,
  onOpenChange,
  projectName,
  form,
  setForm,
  mutation
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  form: { amount: string; description: string; category: string; payment_method: string };
  setForm: Dispatch<SetStateAction<{ amount: string; description: string; category: string; payment_method: string }>>;
  mutation: { mutate: () => void; isPending: boolean };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project Expense</DialogTitle>
          <DialogDescription>Log expense for {projectName}.</DialogDescription>
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

function MiniStat({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center gap-2">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
      </div>
      <p className={`text-base font-black ${color}`}>{value}</p>
    </div>
  );
}
