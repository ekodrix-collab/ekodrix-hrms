"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getEmployeeDashboardStats(localDate?: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const today = localDate || new Date().toISOString().slice(0, 10);

    // Week definition: Monday to Saturday. Sunday is excluded.
    const [year, month, day] = today.split("-").map(Number);
    const currentDateUtc = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = currentDateUtc.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
    const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, ... Sun=6

    const weekStartDate = new Date(currentDateUtc);
    weekStartDate.setUTCDate(currentDateUtc.getUTCDate() - daysSinceMonday);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 5); // Saturday

    const weekStart = weekStartDate.toISOString().slice(0, 10);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);

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
        .gte("date", weekStart)
        .lte("date", weekEnd);

    const weeklyHours = weeklyAttendance?.reduce((acc, curr) => acc + Number(curr.total_hours || 0), 0) || 0;

    // 4. Get all pending tasks for overview
    const { data: pendingTasks } = await supabase
        .from("tasks")
        .select("id, title, priority, status, description, due_date")
        .eq("user_id", user.id)
        .neq("status", "done")
        .order("position", { ascending: true });

    // 5. Get team presence: ALL employees who have punched in today (company-wide)
    // Use admin client to bypass RLS — employees can't normally read other users' attendance
    const adminClient = createSupabaseAdminClient();
    const { data: todayAttendanceRecords, error: presenceError } = await adminClient
        .from("attendance")
        .select(`
            user_id,
            punch_in,
            punch_out,
            status,
            profiles!user_id (
                id,
                full_name,
                avatar_url,
                role
            ),
            attendance_breaks (
                start_time,
                end_time
            )
        `)
        .eq("date", today)
        .not("punch_in", "is", null)
        .order("punch_in", { ascending: true });

    if (presenceError) {
        console.error("Team presence query error:", presenceError.message);
    }

    // Map into TeamMemberPresence shape
    const teamPresence = (todayAttendanceRecords || []).map((record: any) => {
        const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;

        // Check if they have an active break (end_time is null)
        const breaks = record.attendance_breaks || [];
        const isActiveBreak = breaks.some((b: any) => !b.end_time);

        // Priority: if punch_out is set → completed. If active break → on_break. Otherwise default to present.
        const memberStatus = record.punch_out ? "completed" : (isActiveBreak ? "on_break" : "present");
        return {
            id: (profile as { id: string } | null)?.id || record.user_id,
            full_name: (profile as { full_name: string | null } | null)?.full_name || null,
            avatar_url: (profile as { avatar_url: string | null } | null)?.avatar_url || null,
            role: (profile as { role: string | null } | null)?.role || null,
            status: memberStatus,
            punch_in: record.punch_in || null,
            punch_out: record.punch_out || null,
        };
    });

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
        .select("monthly_salary, role")
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

    const { data: expenses } = await supabase
        .from("expenses")
        .select("id")
        .eq("paid_by", user.id)
        .in("status", ["partially_paid", "paid"]);

    const expenseIds = expenses?.map((expense) => expense.id) || [];
    const { data: reimbursements } = expenseIds.length
        ? await supabase
            .from("expense_reimbursements")
            .select("amount")
            .in("expense_id", expenseIds)
        : { data: [] as { amount: number | string }[] };

    const totalReimbursed = (reimbursements || []).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    // Get last payout date
    const accrualIds = accruals?.map((accrual) => accrual.id) || [];
    const { data: lastPayout } = accrualIds.length
        ? await supabase
            .from("payouts")
            .select("created_at")
            .in("accrual_id", accrualIds)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

    // Get consolidated employee payments
    const { data: payments } = await supabase
        .from("employee_payments")
        .select("amount, payment_type, date, projects(name), notes")
        .eq("employee_id", user.id)
        .eq("status", "completed")
        .order("date", { ascending: false });

    // Calculate breakdown
    const breakdown = {
        salary: 0,
        project_share: 0,
        commission: 0,
        bonus: 0,
        reimbursement: 0
    };

    type EmployeePaymentType = keyof typeof breakdown | "other";
    type EmployeePaymentRow = {
        amount: number | string;
        payment_type: EmployeePaymentType;
        date: string;
        notes: string | null;
        projects: { name: string } | { name: string }[] | null;
    };

    const projectSharePayments: {
        amount: number;
        description: string;
        date: string;
        project_name: string;
        payment_type: "project_share" | "commission";
    }[] = [];
    let totalEarnedYTD = 0;
    const currentYear = new Date().getFullYear();

    (payments as EmployeePaymentRow[] | null)?.forEach((p) => {
        const type = p.payment_type as keyof typeof breakdown;
        const amount = Number(p.amount || 0);
        if (breakdown[type] !== undefined) {
            breakdown[type] += amount;
        }

        if (new Date(p.date).getFullYear() === currentYear) {
            totalEarnedYTD += amount;
        }

        if (type === "project_share" || type === "commission") {
            const project = Array.isArray(p.projects) ? p.projects[0] : p.projects;
            projectSharePayments.push({
                amount,
                description: p.notes || (type === "project_share" ? "Project Share" : "Commission"),
                date: p.date,
                project_name: project?.name || "N/A",
                payment_type: type
            });
        }
    });

    return {
        ok: true,
        data: {
            role: profile?.role || "employee",
            salary: profile?.monthly_salary || 0,
            accruals: accruals || [],
            totalReimbursed,
            lastPayoutDate: lastPayout?.created_at || null,
            projectSalaries: projectSharePayments, // Keeping naming for BC but content is updated
            incomeBreakdown: breakdown,
            totalEarnedYTD
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

export async function updateNoteAction(noteId: string, formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    if (!title) return { ok: false, message: "Title is required" };

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("notes")
        .update({
            title,
            content,
            updated_at: new Date().toISOString()
        })
        .eq("id", noteId)
        .eq("user_id", user.id);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/employee/notes");
    return { ok: true };
}

export async function deleteNoteAction(noteId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id);

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
