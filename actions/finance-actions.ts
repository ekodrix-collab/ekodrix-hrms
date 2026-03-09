"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { Expense } from "@/types/common";
import { normalizeExpenseCategory } from "@/lib/finance-categories";

export async function createExpenseClaim(formData: FormData) {
    const amount = parseFloat(formData.get("amount") as string);
    const rawCategory = formData.get("category") as string;
    const category = normalizeExpenseCategory(rawCategory);
    const description = formData.get("description") as string;
    const date = formData.get("date") as string;
    const paymentMethod = String(formData.get("payment_method") ?? "cash");
    // For now we will just mock the receipt URL or handle it if upload implementation exists
    // const receiptUrl = formData.get("receipt_url") as string; 

    if (!amount || !category || !date) {
        return { ok: false, message: "Missing required fields" };
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { organizationId } = await getOrgContext();
    if (!organizationId) return { ok: false, message: "Organization context missing" };

    const { error } = await supabase
        .from("expenses")
        .insert({
            amount,
            category,
            description,
            expense_date: date,
            payment_method: paymentMethod,
            paid_by: user.id,
            created_by: user.id,
            organization_id: organizationId,
            status: "pending",
            approved_at: null,
            approved_by: null,
            reimbursed_at: null,
            reimbursed_by: null,
            reimbursement_method: null,
            // receipt_url: receiptUrl 
        });

    if (error) return { ok: false, message: `Failed to submit claim: ${error.message}` };

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance");
    return { ok: true, message: "Claim submitted successfully" };
}

export async function getMyClaims() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: claims, error } = await supabase
        .from("expenses")
        .select(`
            *,
            reimbursements:expense_reimbursements(amount, paid_at, payment_method, created_at)
        `)
        .eq("paid_by", user.id)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    const normalizedClaims = (claims || []).map((claim: {
        category: string | null;
        amount: number | string;
        reimbursements?: { amount: number | string }[] | null;
    }) => {
        const reimbursedAmount = (claim.reimbursements || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const totalAmount = Number(claim.amount || 0);

        return {
            ...claim,
            category: normalizeExpenseCategory(claim.category),
            reimbursed_amount: reimbursedAmount,
            outstanding_amount: Math.max(0, totalAmount - reimbursedAmount)
        };
    });

    return { ok: true, data: normalizedClaims };
}

// Admin Actions
export async function getPendingClaims() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return { ok: false, message: "Organization context missing" };

    const { data: claims, error } = await supabase
        .from("expenses")
        .select(`
            *,
            profiles:paid_by!inner(full_name, avatar_url, department, organization_id)
        `)
        .eq("status", "pending")
        .eq("profiles.organization_id", organizationId)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    const normalizedClaims = (claims || []).map((claim: { category: string | null }) => ({
        ...claim,
        category: normalizeExpenseCategory(claim.category)
    }));

    return { ok: true, data: normalizedClaims };
}

type EmployeeExpenseRow = Expense & {
    rejection_reason?: string | null;
    organization_id?: string | null;
    profiles: EmployeeProfile | null;
};

type EmployeeProfile = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    department: string | null;
    role: string | null;
    organization_id: string | null;
};

type EmployeeExpenseRowRaw = Omit<EmployeeExpenseRow, "profiles"> & {
    profiles: EmployeeProfile[] | EmployeeProfile | null;
};

type AnalyticsExpenseRow = Pick<Expense, "amount" | "category" | "status" | "paid_by"> & {
    profiles: Pick<EmployeeProfile, "full_name" | "avatar_url">[] | Pick<EmployeeProfile, "full_name" | "avatar_url"> | null;
};

function normalizeJoinedProfile<T>(profile: T[] | T | null | undefined): T | null {
    if (Array.isArray(profile)) return profile[0] ?? null;
    return profile ?? null;
}

export async function getEmployeeExpenseWorkspace() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return { ok: false, message: "Organization context missing" };

    const { data: expenses, error } = await supabase
        .from("expenses")
        .select(`
            id,
            amount,
            description,
            category,
            payment_method,
            status,
            paid_by,
            created_by,
            expense_date,
            created_at,
            rejection_reason,
            organization_id,
            profiles:paid_by!inner(id, full_name, avatar_url, department, role, organization_id)
        `)
        .eq("profiles.organization_id", organizationId)
        .eq("profiles.role", "employee")
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    const normalizedExpenses = ((expenses || []) as EmployeeExpenseRowRaw[]).map((expense) => ({
        ...expense,
        category: normalizeExpenseCategory(expense.category),
        profiles: normalizeJoinedProfile(expense.profiles)
    }));

    const byEmployee: Record<string, {
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
    }> = {};

    const byCategory: Record<string, number> = {};
    const byStatus = {
        pending: 0,
        approved: 0,
        rejected: 0
    };

    normalizedExpenses.forEach((expense) => {
        const employeeId = expense.paid_by || expense.profiles?.id || expense.id;
        const amount = Number(expense.amount) || 0;
        const status = expense.status;

        if (!byEmployee[employeeId]) {
            byEmployee[employeeId] = {
                employeeId,
                name: expense.profiles?.full_name || "Unknown employee",
                avatar: expense.profiles?.avatar_url || null,
                department: expense.profiles?.department || "Unassigned",
                submittedAmount: 0,
                approvedAmount: 0,
                pendingAmount: 0,
                rejectedAmount: 0,
                claimsCount: 0,
                pendingCount: 0,
                latestExpenseDate: expense.expense_date
            };
        }

        const employee = byEmployee[employeeId];
        employee.submittedAmount += amount;
        employee.claimsCount += 1;

        if (new Date(expense.expense_date).getTime() > new Date(employee.latestExpenseDate).getTime()) {
            employee.latestExpenseDate = expense.expense_date;
        }

        if (status === "approved") employee.approvedAmount += amount;
        if (status === "pending") {
            employee.pendingAmount += amount;
            employee.pendingCount += 1;
        }
        if (status === "rejected") employee.rejectedAmount += amount;

        if (status === "pending" || status === "approved" || status === "rejected") {
            byStatus[status] += 1;
        }

        byCategory[expense.category] = (byCategory[expense.category] || 0) + amount;
    });

    const contributors = Object.values(byEmployee).sort((a, b) => {
        if (b.approvedAmount !== a.approvedAmount) return b.approvedAmount - a.approvedAmount;
        return b.submittedAmount - a.submittedAmount;
    });

    const categoryBreakdown = Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const summary = {
        contributionsCount: normalizedExpenses.length,
        contributorCount: contributors.length,
        totalSubmittedAmount: normalizedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        totalApprovedAmount: normalizedExpenses
            .filter((expense) => expense.status === "approved")
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        totalPendingAmount: normalizedExpenses
            .filter((expense) => expense.status === "pending")
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        totalRejectedAmount: normalizedExpenses
            .filter((expense) => expense.status === "rejected")
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        pendingClaims: byStatus.pending,
        approvedClaims: byStatus.approved,
        rejectedClaims: byStatus.rejected
    };

    return {
        ok: true,
        data: {
            expenses: normalizedExpenses,
            contributors,
            categoryBreakdown,
            summary
        }
    };
}

export async function updateClaimStatus(claimId: string, status: "approved" | "rejected", reason?: string) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();
    if (!user || !organizationId || role !== "admin") return { ok: false, message: "Admin organization context missing" };

    const { data: claim, error: claimError } = await supabase
        .from("expenses")
        .select("id, status, profiles:paid_by!inner(organization_id)")
        .eq("id", claimId)
        .eq("profiles.organization_id", organizationId)
        .single();

    if (claimError || !claim) return { ok: false, message: "Claim not found for your organization" };

    if ((claim as { status?: string }).status === "paid" || (claim as { status?: string }).status === "partially_paid") {
        return { ok: false, message: "Claims with reimbursement activity can no longer be edited from review." };
    }

    const timestamp = new Date().toISOString();
    const updates: {
        status: "approved" | "rejected";
        rejection_reason: string | null | undefined;
        updated_at: string;
        approved_at?: string | null;
        approved_by?: string | null;
        reimbursed_at?: string | null;
        reimbursed_by?: string | null;
        reimbursement_method?: string | null;
    } = {
        status,
        rejection_reason: status === "rejected" ? reason ?? null : null,
        updated_at: timestamp
    };

    if (status === "approved") {
        updates.approved_at = timestamp;
        updates.approved_by = user.id;
        updates.reimbursed_at = null;
        updates.reimbursed_by = null;
        updates.reimbursement_method = null;
    } else {
        updates.approved_at = null;
        updates.approved_by = null;
        updates.reimbursed_at = null;
        updates.reimbursed_by = null;
        updates.reimbursement_method = null;
    }

    const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", claimId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance"); // Revalidate employee view too
    return { ok: true, message: `Claim ${status}` };
}

export async function markClaimAsPaid(claimId: string, reimbursementMethod: string, amount: number, note?: string) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();

    if (!user || !organizationId || role !== "admin") {
        return { ok: false, message: "Admin organization context missing" };
    }

    const { data: claim, error: claimError } = await supabase
        .from("expenses")
        .select(`
            id,
            amount,
            status,
            approved_at,
            profiles:paid_by!inner(id, full_name, role, organization_id)
        `)
        .eq("id", claimId)
        .eq("profiles.organization_id", organizationId)
        .single();

    if (claimError || !claim) return { ok: false, message: "Claim not found for your organization" };

    const profile = normalizeJoinedProfile((claim as { profiles: EmployeeProfile[] | EmployeeProfile | null }).profiles);
    if (!profile || profile.role !== "employee") {
        return { ok: false, message: "Only employee claims can be marked as reimbursed." };
    }

    if ((claim as { status?: string }).status !== "approved" && (claim as { status?: string }).status !== "partially_paid") {
        return { ok: false, message: "Only approved claims can receive reimbursement payments." };
    }

    if (!amount || amount <= 0) {
        return { ok: false, message: "Payment amount must be greater than zero." };
    }

    const totalAmount = Number((claim as { amount?: number | string }).amount || 0);
    const paymentSummary = await getClaimPaymentSummary(supabase, claimId);
    if (!paymentSummary.ok) return { ok: false, message: paymentSummary.message };

    const outstandingAmount = Math.max(0, totalAmount - paymentSummary.totalPaid);

    if (amount > outstandingAmount) {
        return { ok: false, message: "Payment amount exceeds the remaining outstanding claim amount." };
    }

    const timestamp = new Date().toISOString();
    const { error: insertError } = await supabase
        .from("expense_reimbursements")
        .insert({
            expense_id: claimId,
            amount,
            payment_method: reimbursementMethod,
            paid_at: timestamp,
            note: note ?? null,
            created_by: user.id
        });

    if (insertError) return { ok: false, message: insertError.message };

    const refreshResult = await refreshClaimReimbursementState(supabase, claimId, user.id, (claim as { approved_at?: string | null }).approved_at ?? timestamp);
    if (!refreshResult.ok) return refreshResult;

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance");
    return {
        ok: true,
        message: refreshResult.status === "paid" ? "Claim reimbursed successfully" : "Partial reimbursement recorded successfully"
    };
}

export async function updateClaimPayment(paymentId: string, claimId: string, amount: number, reimbursementMethod: string, paidAt: string, note?: string) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();

    if (!user || !organizationId || role !== "admin") {
        return { ok: false, message: "Admin organization context missing" };
    }

    if (!amount || amount <= 0) {
        return { ok: false, message: "Payment amount must be greater than zero." };
    }

    const { data: claim, error: claimError } = await supabase
        .from("expenses")
        .select(`
            id,
            amount,
            approved_at,
            profiles:paid_by!inner(organization_id)
        `)
        .eq("id", claimId)
        .eq("profiles.organization_id", organizationId)
        .single();

    if (claimError || !claim) return { ok: false, message: "Claim not found for your organization" };

    const { data: payment, error: paymentError } = await supabase
        .from("expense_reimbursements")
        .select("id, amount")
        .eq("id", paymentId)
        .eq("expense_id", claimId)
        .single();

    if (paymentError || !payment) return { ok: false, message: "Payment entry not found" };

    const paymentSummary = await getClaimPaymentSummary(supabase, claimId);
    if (!paymentSummary.ok) return { ok: false, message: paymentSummary.message };

    const totalAmount = Number((claim as { amount?: number | string }).amount || 0);
    const otherPaymentsTotal = paymentSummary.totalPaid - Number((payment as { amount?: number | string }).amount || 0);
    if (otherPaymentsTotal + amount > totalAmount) {
        return { ok: false, message: "Updated payment amount exceeds the claim amount." };
    }

    const { error: updateError } = await supabase
        .from("expense_reimbursements")
        .update({
            amount,
            payment_method: reimbursementMethod,
            paid_at: new Date(paidAt).toISOString(),
            note: note ?? null
        })
        .eq("id", paymentId)
        .eq("expense_id", claimId);

    if (updateError) return { ok: false, message: updateError.message };

    const refreshResult = await refreshClaimReimbursementState(
        supabase,
        claimId,
        user.id,
        (claim as { approved_at?: string | null }).approved_at ?? new Date().toISOString()
    );
    if (!refreshResult.ok) return refreshResult;

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance");
    return { ok: true, message: "Claim payment updated successfully" };
}

async function getClaimPaymentSummary(
    supabase: ReturnType<typeof createSupabaseServerClient>,
    claimId: string
): Promise<{ ok: true; totalPaid: number; latestPayment: { paid_at: string; payment_method: string } | null } | { ok: false; message: string }> {
    const { data: payments, error } = await supabase
        .from("expense_reimbursements")
        .select("amount, paid_at, payment_method")
        .eq("expense_id", claimId)
        .order("paid_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    return {
        ok: true,
        totalPaid: (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        latestPayment: payments?.[0]
            ? {
                paid_at: payments[0].paid_at,
                payment_method: payments[0].payment_method
            }
            : null
    };
}

async function refreshClaimReimbursementState(
    supabase: ReturnType<typeof createSupabaseServerClient>,
    claimId: string,
    userId: string,
    approvedAt: string
): Promise<{ ok: true; status: "approved" | "partially_paid" | "paid" } | { ok: false; message: string }> {
    const { data: claim, error: claimError } = await supabase
        .from("expenses")
        .select("amount")
        .eq("id", claimId)
        .single();

    if (claimError || !claim) return { ok: false, message: "Claim not found while refreshing payment state" };

    const paymentSummary = await getClaimPaymentSummary(supabase, claimId);
    if (!paymentSummary.ok) return paymentSummary;

    const totalAmount = Number((claim as { amount?: number | string }).amount || 0);
    const totalPaid = paymentSummary.totalPaid;
    const nextStatus = totalPaid <= 0 ? "approved" : totalPaid >= totalAmount ? "paid" : "partially_paid";

    const { error } = await supabase
        .from("expenses")
        .update({
            status: nextStatus,
            reimbursed_at: nextStatus === "paid" ? paymentSummary.latestPayment?.paid_at ?? null : null,
            reimbursed_by: totalPaid > 0 ? userId : null,
            reimbursement_method: totalPaid > 0 ? paymentSummary.latestPayment?.payment_method ?? null : null,
            approved_at: approvedAt,
            updated_at: new Date().toISOString()
        })
        .eq("id", claimId);

    if (error) return { ok: false, message: error.message };

    return { ok: true, status: nextStatus };
}

export async function getExpenseAnalytics() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return { ok: false, message: "Organization context missing" };

    const { data: expenses, error } = await supabase
        .from("expenses")
        .select(`
            amount,
            category,
            status,
            paid_by,
            profiles:paid_by!inner(full_name, avatar_url, organization_id)
        `)
        .eq("profiles.organization_id", organizationId)
        .eq("status", "approved"); // Only count approved expenses for analytics

    if (error) return { ok: false, message: error.message };

    const normalizedExpenses = ((expenses || []) as AnalyticsExpenseRow[]).map((expense) => ({
        ...expense,
        category: normalizeExpenseCategory(expense.category),
        profiles: normalizeJoinedProfile(expense.profiles)
    }));

    // 1. Top Spenders
    const spenderMap: Record<string, { name: string, avatar: string, total: number }> = {};
    normalizedExpenses.forEach((exp) => {
        const id = exp.paid_by;
        if (!id) return;
        if (!spenderMap[id]) {
            spenderMap[id] = {
                name: exp.profiles?.full_name || "Unknown",
                avatar: exp.profiles?.avatar_url || "",
                total: 0
            };
        }
        spenderMap[id].total += Number(exp.amount);
    });

    const topSpenders = Object.values(spenderMap)
        .sort((a, b) => b.total - a.total);
    // .slice(0, 5); // User requested full list behavior, but for array limit let's keep it larger or remove slice if UI handles it.
    // The UI maps through all of them. Let's return top 10 for now to be safe, or just all.
    // User asked: "list like in admin highest to low". existing code sliced to 5.
    // I will remove the slice to show all, or slice to 20.
    // Let's remove slice to show all contributors to expenses.

    // 2. Category Breakdown
    const categoryMap: Record<string, number> = {};
    normalizedExpenses.forEach((exp) => {
        categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount);
    });

    const breakdown = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { ok: true, data: { topSpenders, breakdown } };
}

