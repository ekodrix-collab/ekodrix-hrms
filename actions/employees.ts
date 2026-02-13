"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getEmployeeById(id: string) {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return { error: "No organization context", profile: null };

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organizationId) // Crucial for security
        .single();

    if (error) {
        return { error: error.message, profile: null };
    }

    return { profile };
}

export async function getEmployeeAttendance(id: string) {
    const supabase = createSupabaseServerClient();

    const { data: logs, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", id)
        .order("date", { ascending: false });

    if (error) {
        return { error: error.message, logs: [] };
    }

    return { logs: logs || [] };
}

export async function getEmployeeStats(id: string) {
    const supabase = createSupabaseServerClient();

    // Get attendance for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs } = await supabase
        .from("attendance")
        .select("status, total_hours")
        .eq("user_id", id)
        .gte("date", thirtyDaysAgo.toISOString().split('T')[0]);

    const totalHours = logs?.reduce((acc, log) => acc + (log.total_hours || 0), 0) || 0;
    const daysPresent = logs?.filter(log => log.status === 'present').length || 0;
    const attendanceRate = logs && logs.length > 0 ? (daysPresent / logs.length) * 100 : 0;

    return {
        totalHours: Math.round(totalHours * 10) / 10,
        daysPresent,
        attendanceRate: Math.round(attendanceRate),
    };
}

export async function getEmployeeStandups(id: string) {
    const supabase = createSupabaseServerClient();

    const { data: standups, error } = await supabase
        .from("daily_standups")
        .select("*")
        .eq("user_id", id)
        .order("date", { ascending: false })
        .limit(10);

    if (error) {
        return { error: error.message, standups: [] };
    }

    return { standups: standups || [] };
}

export async function getEmployeeTasks(id: string) {
    const supabase = createSupabaseServerClient();

    const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

    if (error) {
        return { error: error.message, tasks: [] };
    }

    return { tasks: tasks || [] };
}
export async function getAllEmployees() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "employee")
        .eq("organization_id", organizationId)
        .order("full_name", { ascending: true });

    if (error) {
        return [];
    }

    return profiles || [];
}

export async function updateEmployeeSalary(userId: string, salary: number, currency: string = "INR") {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
        .from("profiles")
        .update({ monthly_salary: salary, currency })
        .eq("id", userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/employees");
    return { success: true };
}
