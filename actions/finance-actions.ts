"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { Expense } from "@/types/common";

export async function createExpenseClaim(formData: FormData) {
    const amount = parseFloat(formData.get("amount") as string);
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const date = formData.get("date") as string;
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
            paid_by: user.id,
            status: "pending",
            // receipt_url: receiptUrl 
        });

    if (error) return { ok: false, message: `Failed to submit claim: ${error.message}` };

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

    return { ok: true, data: claims || [] };
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
            profiles:paid_by(full_name, avatar_url, department)
        `)
        .eq("status", "pending")
        // We might want to filter by org if expenses table has organization_id, 
        // but currently it seems linked via paid_by -> profile -> org.
        // For safety, we should verify the user belongs to the org.
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };

    // Filter by org manually if needed, or rely on RLS + join 
    // (Assuming RLS policies are set up correctly for admins to see all org expenses)

    return { ok: true, data: claims || [] };
}

export async function updateClaimStatus(claimId: string, status: "approved" | "rejected", reason?: string) {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();

    // meaningful verification of admin status should be done here or via RLS

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
            profiles:paid_by(full_name, avatar_url)
        `)
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
        const cat = exp.category || "Uncategorized";
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount);
    });

    const breakdown = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return { ok: true, data: { topSpenders, breakdown } };
}

