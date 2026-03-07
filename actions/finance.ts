"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeExpenseCategory } from "@/lib/finance-categories";

type ProjectRelation = { name: string } | { name: string }[] | null;
type ProjectBreakdownItem = { id: string; name: string; revenue: number; expenses: number; net: number };

function getProjectName(projects: ProjectRelation, fallback = "Unknown") {
    if (Array.isArray(projects)) {
        return projects[0]?.name || fallback;
    }
    return projects?.name || fallback;
}

export async function generateMonthlyAccruals(date: Date) {
    const supabase = createSupabaseServerClient();

    // Get all active employees with a salary > 0
    const { data: employees, error: fetchError } = await supabase
        .from("profiles")
        .select("id, monthly_salary")
        .eq("is_active", true)
        .gt("monthly_salary", 0);

    if (fetchError) return { error: fetchError.message };

    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];

    const accruals = employees.map(emp => ({
        user_id: emp.id,
        amount: emp.monthly_salary,
        month_year: firstOfMonth,
        status: 'unpaid'
    }));

    const { error: insertError } = await supabase
        .from("salary_accruals")
        .upsert(accruals, { onConflict: 'user_id, month_year' });

    if (insertError) return { error: insertError.message };

    revalidatePath("/admin/finance");
    return { success: true, count: accruals.length };
}

export async function postRevenue(amount: number, source: string, description?: string, projectId?: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("revenue_logs")
        .insert({
            amount,
            source,
            description,
            project_id: projectId || null,
            created_by: user?.id
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath("/admin/finance");
    if (projectId) {
        revalidatePath(`/admin/projects/${projectId}`);
        revalidatePath(`/admin/projects/${projectId}/finance`);
        revalidatePath("/admin/projects/finance");
    }
    return { success: true, revenue: data };
}

export async function distributeRevenue(revenueId: string, distribution: { [userId: string]: number }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // This is a simplified distribution. In a real app, we'd use a transaction or RPC.
    for (const [userId, amount] of Object.entries(distribution)) {
        if (amount <= 0) continue;

        // Find oldest unpaid accrual for this user
        const { data: accrual } = await supabase
            .from("salary_accruals")
            .select("id, amount, paid_amount, remaining_amount")
            .eq("user_id", userId)
            .neq("status", "paid")
            .order("month_year", { ascending: true })
            .limit(1)
            .single();

        if (accrual) {
            const newPaidAmount = Number(accrual.paid_amount) + amount;
            const status = newPaidAmount >= accrual.amount ? 'paid' : 'partially_paid';

            // 1. Update Accrual
            await supabase
                .from("salary_accruals")
                .update({
                    paid_amount: newPaidAmount,
                    status: status
                })
                .eq("id", accrual.id);

            // 2. Log Payout
            await supabase
                .from("payouts")
                .insert({
                    accrual_id: accrual.id,
                    revenue_id: revenueId,
                    amount_paid: amount,
                    created_by: user?.id
                });
        }
    }

    revalidatePath("/admin/finance");
    revalidatePath("/dashboard/finance");
    return { success: true };
}

export async function postBusinessExpense(data: {
    amount: number;
    description: string;
    category: string;
    payment_method: string;
    project_id?: string;
}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("expenses")
        .insert({
            ...data,
            category: normalizeExpenseCategory(data.category),
            paid_by: user?.id,
            created_by: user?.id,
            status: 'approved' // Admin expenses are auto-approved
        });

    if (error) return { error: error.message };

    revalidatePath("/admin/finance");
    if (data.project_id) {
        revalidatePath(`/admin/projects/${data.project_id}`);
        revalidatePath(`/admin/projects/${data.project_id}/finance`);
        revalidatePath("/admin/projects/finance");
    }
    return { success: true };
}

export async function getCompanyFinancials(projectId?: string) {
    const supabase = createSupabaseServerClient();

    const accrualQuery = supabase
        .from("salary_accruals")
        .select("amount, paid_amount, remaining_amount");

    let revenueQuery = supabase
        .from("revenue_logs")
        .select("amount");

    let expenseQuery = supabase
        .from("expenses")
        .select("amount")
        .eq("status", "approved");

    if (projectId) {
        revenueQuery = revenueQuery.eq("project_id", projectId);
        expenseQuery = expenseQuery.eq("project_id", projectId);
        // Accruals are currently company-wide salary, not project-linked usually.
        // But if we want to show project-specific "net", we might skip accruals or link them.
        // For now, project financials focus on direct revenue/expenses.
    }

    const { data: accruals } = await accrualQuery;
    const { data: revenue } = await revenueQuery;
    const { data: expenses } = await expenseQuery;

    const totalLiability = projectId ? 0 : (accruals?.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0) || 0);
    const totalSalaryPaid = projectId ? 0 : (accruals?.reduce((acc, curr) => acc + Number(curr.paid_amount), 0) || 0);
    const totalBusinessExpenses = expenses?.reduce((acc: number, curr) => acc + Number(curr.amount), 0) || 0;
    const totalRevenue = revenue?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    let projectBreakdown: ProjectBreakdownItem[] = [];
    if (!projectId) {
        const [{ data: projRevenue }, { data: projExpenses }] = await Promise.all([
            supabase.from("revenue_logs").select("project_id, amount, projects(name)"),
            supabase.from("expenses").select("project_id, amount, projects(name)").eq("status", "approved")
        ]);

        const breakdownMap: Record<string, { id: string; name: string; revenue: number; expenses: number; net: number }> = {};

        projRevenue?.forEach(r => {
            if (!r.project_id) return;
            const pId = r.project_id;
            const pName = getProjectName(r.projects);
            if (!breakdownMap[pId]) breakdownMap[pId] = { id: pId, name: pName, revenue: 0, expenses: 0, net: 0 };
            breakdownMap[pId].revenue += Number(r.amount);
        });

        projExpenses?.forEach(e => {
            if (!e.project_id) return;
            const pId = e.project_id;
            const pName = getProjectName(e.projects);
            if (!breakdownMap[pId]) breakdownMap[pId] = { id: pId, name: pName, revenue: 0, expenses: 0, net: 0 };
            breakdownMap[pId].expenses += Number(e.amount);
        });

        projectBreakdown = Object.values(breakdownMap).map(p => ({ ...p, net: p.revenue - p.expenses }));
    }

    return {
        totalLiability,
        totalPaid: totalSalaryPaid + totalBusinessExpenses,
        totalSalaryPaid,
        totalBusinessExpenses,
        totalRevenue,
        netBalance: totalRevenue - (totalSalaryPaid + totalBusinessExpenses),
        projectBreakdown
    };
}

export async function getUserAccruals(userId: string) {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
        .from("salary_accruals")
        .select("*")
        .eq("user_id", userId)
        .order("month_year", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data };
}

// Categories are hardcoded on frontend now

export async function getFinancialHistory(projectId?: string) {
    const supabase = createSupabaseServerClient();

    let revenueQuery = supabase
        .from("revenue_logs")
        .select("id, amount, source, description, received_date, created_at, project_id, projects(name)")
        .order("received_date", { ascending: false });

    let expenseQuery = supabase
        .from("expenses")
        .select("id, amount, category, description, expense_date, payment_method, created_at, project_id, projects(name)")
        .eq("status", "approved")
        .order("expense_date", { ascending: false });

    if (projectId) {
        revenueQuery = revenueQuery.eq("project_id", projectId);
        expenseQuery = expenseQuery.eq("project_id", projectId);
    }

    const [{ data: revenue }, { data: expenses }] = await Promise.all([revenueQuery, expenseQuery]);

    // Normalize and merge
    const normalizedRevenue = revenue?.map(r => ({
        id: r.id,
        type: 'revenue',
        amount: r.amount,
        title: r.source,
        subtitle: r.description || "Revenue",
        date: r.received_date,
        created_at: r.created_at,
        category: "Income",
        method: "-",
        project_id: r.project_id,
        project_name: getProjectName(r.projects)
    })) || [];

    const normalizedExpenses = expenses?.map(e => ({
        id: e.id,
        type: 'expense',
        amount: e.amount,
        title: e.description,
        subtitle: normalizeExpenseCategory(e.category),
        date: e.expense_date,
        created_at: e.created_at,
        category: normalizeExpenseCategory(e.category),
        method: e.payment_method,
        project_id: e.project_id,
        project_name: getProjectName(e.projects)
    })) || [];

    const history = [...normalizedRevenue, ...normalizedExpenses].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return history;
}

export async function getFinanceVerdicts(projectId: string) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("finance_verdicts")
        .select(`
            *,
            profiles:created_by(full_name, avatar_url)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
}

export async function postFinanceVerdict(projectId: string, content: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("finance_verdicts")
        .insert({
            project_id: projectId,
            content,
            created_by: user?.id
        })
        .select()
        .single();

    if (error) return { ok: false, message: error.message };
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/finance`);
    return { ok: true, data };
}

export async function getProjectContractAmount(projectId: string) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("projects")
        .select("contract_amount")
        .eq("id", projectId)
        .single();

    if (error) return { ok: false, message: error.message, amount: 0 };
    return { ok: true, amount: Number(data?.contract_amount ?? 0) };
}

export async function updateProjectContractAmount(projectId: string, amount: number) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return { ok: false, message: "Admin access required" };

    const { error } = await supabase
        .from("projects")
        .update({ contract_amount: amount, updated_at: new Date().toISOString() })
        .eq("id", projectId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/projects/finance");
    return { ok: true };
}
