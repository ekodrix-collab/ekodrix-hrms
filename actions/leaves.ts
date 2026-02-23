"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { LeaveStatus, LeaveType, LeaveRequest, LeaveBalance } from "@/types/leaves";

/**
 * Calculates total leave days excluding weekends
 */
function calculateWeekdays(start: Date, end: Date): number {
    let count = 0;
    const curDate = new Date(start);
    while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}

export async function getLeaveTypesAction() {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("is_active", true)
        .order("name");

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data as LeaveType[] };
}

export async function getMyLeaveBalancesAction() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
        .from("leave_balances")
        .select(`
      *,
      leave_type:leave_types(name, color)
    `)
        .eq("user_id", user.id)
        .eq("year", new Date().getFullYear());

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data as LeaveBalance[] };
}

export async function applyLeaveAction(formData: FormData) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const leaveTypeId = String(formData.get("leaveTypeId"));
    const startDateStr = String(formData.get("startDate"));
    const endDateStr = String(formData.get("endDate"));
    const reason = String(formData.get("reason"));
    const isHalfDay = formData.get("isHalfDay") === "true";

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    let totalDays = 0;
    if (isHalfDay && startDateStr === endDateStr) {
        totalDays = 0.5;
    } else {
        totalDays = calculateWeekdays(start, end);
    }

    if (totalDays <= 0) {
        return { ok: false, message: "Selected dates are weekends or invalid." };
    }

    // 1. Check if user has enough balance
    const { data: balanceRecord } = await supabase
        .from("leave_balances")
        .select("entitlement, used")
        .eq("user_id", user.id)
        .eq("leave_type_id", leaveTypeId)
        .eq("year", start.getFullYear())
        .maybeSingle();

    if (balanceRecord) {
        const remaining = balanceRecord.entitlement - balanceRecord.used;
        if (remaining < totalDays) {
            return { ok: false, message: `Insufficient leave balance. Remaining: ${remaining} days.` };
        }
    }

    // 2. Insert request
    const { data, error } = await supabase
        .from("leave_requests")
        .insert({
            user_id: user.id,
            leave_type_id: leaveTypeId,
            start_date: startDateStr,
            end_date: endDateStr,
            total_days: totalDays,
            reason,
            status: 'pending'
        })
        .select()
        .single();

    if (error) return { ok: false, message: error.message };

    // 3. Log activity
    await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "applied for leave",
        entity_type: "leave_request",
        entity_id: data.id,
        metadata: { total_days: totalDays, leave_type_id: leaveTypeId }
    });

    revalidatePath("/employee/leaves");
    revalidatePath("/admin/leaves");
    return { ok: true, data };
}

export async function getMyLeaveRequestsAction() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
        .from("leave_requests")
        .select(`
      *,
      leave_type:leave_types(name, color)
    `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data as LeaveRequest[] };
}

export async function cancelLeaveRequestAction(requestId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("leave_requests")
        .update({ status: 'cancelled' })
        .eq("id", requestId)
        .eq("user_id", user.id)
        .eq("status", 'pending');

    if (error) return { ok: false, message: error.message };

    revalidatePath("/employee/leaves");
    revalidatePath("/admin/leaves");
    return { ok: true };
}

// ADMIN ACTIONS
export async function getAllLeaveRequestsAction() {
    const supabase = createSupabaseServerClient();

    // Explicitly check if current user is admin before fetching sensitive data
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

    if (profile?.role !== 'admin') {
        return { ok: false, message: "Unauthorized. Admin access required." };
    }

    const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url, department),
          leave_type:leave_types(name, color)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching leave requests:", error);
        return { ok: false, message: error.message };
    }

    return { ok: true, data: data as LeaveRequest[] };
}

export async function updateLeaveStatusAction(requestId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("leave_requests")
        .update({
            status,
            rejection_reason: rejectionReason,
            manager_id: user.id,
            updated_at: new Date().toISOString()
        })
        .eq("id", requestId);

    if (error) return { ok: false, message: error.message };

    // Note: Database trigger 'handle_leave_approval' in SQL handles balance updates automatically

    revalidatePath("/employee/leaves");
    revalidatePath("/admin/leaves");
    revalidatePath("/employee/dashboard");
    revalidatePath("/admin/dashboard");

    return { ok: true };
}
