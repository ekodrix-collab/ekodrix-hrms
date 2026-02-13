"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UnpaidAccrual } from "@/types/dashboard";

export async function getUnpaidAccruals(): Promise<{ ok: boolean; data?: UnpaidAccrual[]; message?: string }> {
    const supabase = createSupabaseServerClient();

    const { data: accruals, error } = await supabase
        .from("salary_accruals")
        .select(`
            id,
            amount,
            paid_amount,
            remaining_amount,
            month_year,
            status,
            profiles!inner(id, full_name, avatar_url, role, department)
        `)
        .neq("status", "paid")
        .order("month_year", { ascending: true });

    if (error) {
        console.error("Error fetching unpaid accruals:", error);
        return { ok: false, message: "Failed to fetch payroll data" };
    }

    return { ok: true, data: (accruals as any) as UnpaidAccrual[] };
}

export async function processSalaryPayment(payload: {
    accrualId: string;
    amount: number;
    paymentMethod: string;
}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { ok: false, message: "Unauthorized" };

    // 1. Fetch Accrual to verify
    const { data: accrual, error: fetchError } = await supabase
        .from("salary_accruals")
        .select("*")
        .eq("id", payload.accrualId)
        .single();

    if (fetchError || !accrual) return { ok: false, message: "Accrual not found" };

    if (Number(accrual.remaining_amount) < payload.amount) {
        return { ok: false, message: "Payment amount exceeds remaining balance" };
    }

    // 2. Perform Updates
    // A. Insert into Expenses (Auto-Ledgering)
    const { error: expenseError } = await supabase
        .from("expenses")
        .insert({
            amount: payload.amount,
            category: "Salary",
            description: `Salary Payment - ${format(new Date(accrual.month_year), 'MMMM yyyy')}`,
            payment_method: payload.paymentMethod,
            paid_by: user.id,
            expense_date: new Date().toISOString().split('T')[0],
            status: "approved",
            created_by: user.id
        });

    if (expenseError) return { ok: false, message: "Failed to log expense" };

    // B. Insert into Payouts
    const { error: payoutError } = await supabase
        .from("payouts")
        .insert({
            accrual_id: payload.accrualId,
            amount_paid: payload.amount,
            created_by: user.id
        });

    if (payoutError) return { ok: false, message: "Failed to record payout" };

    // C. Update Accrual Status
    const newPaidAmount = Number(accrual.paid_amount) + payload.amount;
    const newStatus = newPaidAmount >= Number(accrual.amount) ? 'paid' : 'partially_paid';

    const { error: updateError } = await supabase
        .from("salary_accruals")
        .update({
            paid_amount: newPaidAmount,
            status: newStatus
        })
        .eq("id", payload.accrualId);

    if (updateError) return { ok: false, message: "Failed to update accrual status" };

    revalidatePath("/admin/finance");
    return { ok: true, message: "Payment processed successfully" };
}

import { format } from "date-fns";
