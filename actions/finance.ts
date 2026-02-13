"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Expense } from "@/types/common";

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

export async function postRevenue(amount: number, source: string, description?: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("revenue_logs")
        .insert({
            amount,
            source,
            description,
            created_by: user?.id
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath("/admin/finance");
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
}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("expenses")
        .insert({
            ...data,
            paid_by: user?.id,
            created_by: user?.id,
            status: 'approved' // Admin expenses are auto-approved
        });

    if (error) return { error: error.message };

    revalidatePath("/admin/finance");
    return { success: true };
}

export async function getCompanyFinancials() {
    const supabase = createSupabaseServerClient();

    const { data: accruals } = await supabase
        .from("salary_accruals")
        .select("amount, paid_amount, remaining_amount");

    const { data: revenue } = await supabase
        .from("revenue_logs")
        .select("amount");

    const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("status", "approved");

    const totalLiability = accruals?.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0) || 0;
    const totalSalaryPaid = accruals?.reduce((acc, curr) => acc + Number(curr.paid_amount), 0) || 0;
    const totalBusinessExpenses = expenses?.reduce((acc: number, curr) => acc + Number(curr.amount), 0) || 0;
    const totalRevenue = revenue?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    return {
        totalLiability,
        totalPaid: totalSalaryPaid + totalBusinessExpenses,
        totalSalaryPaid,
        totalBusinessExpenses,
        totalRevenue,
        netBalance: totalRevenue - (totalSalaryPaid + totalBusinessExpenses)
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

export async function getFinancialHistory() {
    const supabase = createSupabaseServerClient();

    const { data: revenue } = await supabase
        .from("revenue_logs")
        .select("id, amount, source, description, received_date, created_at")
        .order("received_date", { ascending: false });

    const { data: expenses } = await supabase
        .from("expenses")
        .select("id, amount, category, description, expense_date, payment_method, created_at")
        .eq("status", "approved")
        .order("expense_date", { ascending: false });

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
        method: "-"
    })) || [];

    const normalizedExpenses = expenses?.map(e => ({
        id: e.id,
        type: 'expense',
        amount: e.amount,
        title: e.description,
        subtitle: e.category,
        date: e.expense_date,
        created_at: e.created_at,
        category: e.category,
        method: e.payment_method
    })) || [];

    const history = [...normalizedRevenue, ...normalizedExpenses].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return history;
}
