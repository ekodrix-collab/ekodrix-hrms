"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getEmployeeDashboardStats(localDate?: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const today = localDate || new Date().toISOString().slice(0, 10);

    // 1. Get today's hours from attendance
    const { data: attendance } = await supabase
        .from("attendance")
        .select("total_hours")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

    // 2. Get pending tasks count (todo + in_progress)
    const { count: pendingTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .neq("status", "done");

    // 3. Get total hours this week
    const { data: weeklyAttendance } = await supabase
        .from("attendance")
        .select("total_hours")
        .eq("user_id", user.id)
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    const weeklyHours = weeklyAttendance?.reduce((acc, curr) => acc + Number(curr.total_hours || 0), 0) || 0;

    // 4. Get all pending tasks for overview
    const { data: pendingTasks } = await supabase
        .from("tasks")
        .select("id, title, priority, status, description, due_date")
        .eq("user_id", user.id)
        .neq("status", "done")
        .order("position", { ascending: true });

    // 5. Get team presence status from today_attendance view
    const { data: teamPresence } = await supabase
        .from("today_attendance")
        .select("*");

    // 6. Get today's standup
    const { data: todayStandup } = await supabase
        .from("daily_standups")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

    // 7. Get tasks completed today for smart standup
    // We filter by status = 'done' and updated_at being within the local "today" 
    const startOfDay = `${today}T00:00:00Z`;
    const endOfDay = `${today}T23:59:59Z`;

    const { data: completedToday } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("updated_at", startOfDay)
        .lte("updated_at", endOfDay);

    // 8. Calculate attendance streak (consecutive non-Sunday working days)
    let streak = 0;
    const { data: recentAttendance } = await supabase
        .from("attendance")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(90); // Look back up to ~3 months

    if (recentAttendance && recentAttendance.length > 0) {
        const attendanceDates = new Set(recentAttendance.map(a => a.date));
        // Start from yesterday and go backwards
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);

        // If today has attendance, start counting from today
        if (attendanceDates.has(today)) {
            streak = 1;
        }

        // Count backwards through past days
        for (let i = 0; i < 90; i++) {
            const dateStr = checkDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
            const dayOfWeek = checkDate.getDay(); // 0=Sunday

            if (dayOfWeek === 0) {
                // Sunday — skip, don't break streak
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
            }

            if (attendanceDates.has(dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break; // Gap found, streak ends
            }
        }

        // If we started from today and counted today, avoid double-counting
        if (attendanceDates.has(today)) {
            // streak already includes today from the initial +1
        }
    }

    // 9. Calculate total break time for today
    let totalBreakSeconds = 0;
    let lastBreakStartTime = null;

    const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

    if (todayAttendance) {
        const { data: breaks } = await supabase
            .from("attendance_breaks")
            .select("start_time, end_time")
            .eq("attendance_id", todayAttendance.id);

        if (breaks) {
            const now = new Date();
            for (const b of breaks) {
                const start = new Date(b.start_time);
                if (!b.end_time) {
                    lastBreakStartTime = b.start_time;
                }
                const end = b.end_time ? new Date(b.end_time) : now;
                totalBreakSeconds += Math.floor((end.getTime() - start.getTime()) / 1000);
            }
        }
    }

    return {
        ok: true,
        stats: {
            todayHours: attendance?.total_hours || 0,
            focusTasks: pendingTasksCount || 0,
            weeklyHours: Math.round(weeklyHours * 100) / 100,
            streak,
            totalBreakSeconds,
            lastBreakStartTime,
            focusTasksList: pendingTasks || [],
            teamPresence: teamPresence || [],
            todayStandup: todayStandup || null,
            completedToday: completedToday || []
        }
    };
}

export async function getEmployeeFinanceData() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("monthly_salary")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) return { ok: false, message: profileError.message };

    const { data: accruals, error: accrualsError } = await supabase
        .from("salary_accruals")
        .select("*")
        .eq("user_id", user.id)
        .order("month_year", { ascending: false });

    // Handle missing table gracefully if it hasn't been migrated yet
    if (accrualsError && accrualsError.code !== 'PGRST116') {
        console.error("Accruals error:", accrualsError);
    }

    // Calculate total reimbursed (approved expenses)
    const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("paid_by", user.id)
        .eq("status", "approved");

    const totalReimbursed = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // Get last payout date
    const { data: lastPayout } = await supabase
        .from("payouts")
        .select("created_at")
        .in("accrual_id", accruals?.map(a => a.id) || [])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return {
        ok: true,
        data: {
            salary: profile?.monthly_salary || 0,
            accruals: accruals || [],
            totalReimbursed,
            lastPayoutDate: lastPayout?.created_at || null
        }
    };
}

export async function getTeamMembers() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", user.id)
        .single();

    const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url, email, department, designation")
        .eq("department", profile?.department || "")
        .eq("is_active", true);

    return { ok: true, data: members || [] };
}

export async function getEmployeeProfile() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
}

export async function getEmployeeNotes() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data || [] };
}

export async function createNoteAction(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    if (!title) return { ok: false, message: "Title is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("notes")
        .insert({
            user_id: user.id,
            title,
            content
        });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/employee/notes");
    return { ok: true };
}

export async function submitStandupAction(formData: FormData) {
    const accomplished = String(formData.get("accomplished") ?? "").trim();
    const planned = String(formData.get("planned") ?? "").trim();
    const blockers = String(formData.get("blockers") ?? "").trim();
    const status = String(formData.get("status") ?? "on_track");

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("daily_standups")
        .upsert({
            user_id: user.id,
            date: new Date().toISOString().slice(0, 10),
            tasks_completed: accomplished,
            tasks_planned: planned,
            blockers: blockers,
            notes: status // Using notes field for status temporarily if schema doesn't have status
        }, { onConflict: 'user_id, date' });

    if (error) return { ok: false, message: error.message };


    revalidatePath("/employee/standup");
    revalidatePath("/employee/dashboard");
    return { ok: true };
}

export async function getEmployeeStandups() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
        .from("daily_standups")
        .select(`
            *,
            profiles:user_id (full_name, avatar_url)
        `)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
}
