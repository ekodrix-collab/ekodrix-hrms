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
        .select("*")
        .eq("paid_by", user.id)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    const normalizedClaims = (claims || []).map((claim: { category: string | null }) => ({
        ...claim,
        category: normalizeExpenseCategory(claim.category)
    }));

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
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string | null;
        department: string | null;
        role: string | null;
        organization_id: string | null;
    } | null;
};

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

    const normalizedExpenses = ((expenses || []) as EmployeeExpenseRow[]).map((expense) => ({
        ...expense,
        category: normalizeExpenseCategory(expense.category)
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
    const { organizationId } = await getOrgContext();
    if (!organizationId) return { ok: false, message: "Organization context missing" };

    const { data: claim, error: claimError } = await supabase
        .from("expenses")
        .select("id, profiles:paid_by!inner(organization_id)")
        .eq("id", claimId)
        .eq("profiles.organization_id", organizationId)
        .single();

    if (claimError || !claim) return { ok: false, message: "Claim not found for your organization" };

    const { error } = await supabase
        .from("expenses")
        .update({
            status,
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq("id", claimId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance"); // Revalidate employee view too
    return { ok: true, message: `Claim ${status}` };
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

    // 1. Top Spenders
    const spenderMap: Record<string, { name: string, avatar: string, total: number }> = {};
    (expenses as unknown as (Expense & { profiles: { full_name: string, avatar_url: string } | null })[])?.forEach((exp) => {
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
    (expenses as unknown as Expense[])?.forEach((exp) => {
        const cat = normalizeExpenseCategory(exp.category);
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount);
    });

    const breakdown = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { ok: true, data: { topSpenders, breakdown } };
}

