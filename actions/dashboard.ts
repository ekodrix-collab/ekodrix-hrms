"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth-utils";
import type { Blocker, Activity } from "@/types/dashboard";

type RelatedProfile = {
    full_name?: string | null;
    avatar_url?: string | null;
};

function normalizeProfileRelation(value: RelatedProfile | RelatedProfile[] | null | undefined): RelatedProfile | null {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getAttendanceLogs(date?: string) {
    const supabase = createSupabaseServerClient();

    let query = supabase
        .from('attendance')
        .select(`
            *,
            profiles(full_name, avatar_url, department)
        `)
        .order('punch_in', { ascending: false });

    if (date) {
        query = query.eq('date', date);
    } else {
        query = query.order('date', { ascending: false });
    }

    const { data: logs } = await query;

    return logs || [];
}

export async function getAbsentEmployees(date: string) {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    // Get all employees
    const { data: employees } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, department, role')
        .eq('organization_id', organizationId)
        .in('role', ['employee', 'founder'])
        .eq('status', 'active'); // Assuming status column exists based on other files, or is_active

    // Get attendance for the date
    const { data: attendance } = await supabase
        .from('attendance')
        .select('user_id')
        .eq('date', date);

    const presentUserIds = new Set(attendance?.map(a => a.user_id));

    return employees?.filter(e => !presentUserIds.has(e.id)) || [];
}


export async function getAdminDashboardData() {
    const { organizationId, error: authError } = await getOrgContext();
    if (authError || !organizationId) return null;

    const [stats, trends, blockers, distributions, activities] = await Promise.all([
        getDashboardStats(),
        getAttendanceTrends(),
        getUrgentBlockers(),
        getDepartmentDistribution(),
        getRecentActivities()
    ]);

    return { stats, trends, blockers, distributions, activities };
}

export async function getDashboardStats() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return { totalEmployees: 0, presentToday: 0, pendingRequests: 0, performance: 0 };

    // 1. Get total employees in org
    const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('role', ['employee', 'founder'])
        .eq('status', 'active');

    // 2. Get today's attendance count in org
    const istDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const { count: presentToday } = await supabase
        .from('attendance')
        .select('id, user_id, profiles!inner(organization_id, status)', { count: 'exact', head: true })
        .eq('date', istDate)
        .eq('status', 'present')
        .eq('profiles.organization_id', organizationId)
        .eq('profiles.status', 'active');

    // 3. Get pending standups/blockers in org
    const { count: pendingRequests } = await supabase
        .from('daily_standups')
        .select('id, user_id, profiles!inner(organization_id)', { count: 'exact', head: true })
        .eq('date', istDate)
        .eq('profiles.organization_id', organizationId);

    return {
        totalEmployees: totalEmployees || 0,
        presentToday: presentToday || 0,
        pendingRequests: pendingRequests || 0,
        performance: 92, // Mock for now
    };
}

export async function getAttendanceTrends() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const formatISTDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);

    const toISTDate = (dateKey: string) => new Date(`${dateKey}T00:00:00+05:30`);
    const toISTWeekday = (dateKey: string) => new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'Asia/Kolkata',
    }).format(toISTDate(dateKey));

    // Build a strict rolling window of exactly 7 IST dates, oldest -> newest.
    const todayKey = formatISTDate(new Date());
    const todayISTMidnight = toISTDate(todayKey);
    const lastSevenDateKeys = Array.from({ length: 7 }, (_, index) => {
        const offsetFromToday = 6 - index;
        return formatISTDate(new Date(todayISTMidnight.getTime() - (offsetFromToday * 24 * 60 * 60 * 1000)));
    });
    const oldestKey = lastSevenDateKeys[0];
    const yesterdayKey = lastSevenDateKeys[5];

    const { data: logs } = await supabase
        .from('attendance')
        .select('date, user_id, status, profiles!inner(organization_id, status)')
        .eq('profiles.organization_id', organizationId)
        .eq('profiles.status', 'active')
        .gte('date', oldestKey)
        .lte('date', todayKey)
        .order('date', { ascending: true });

    const uniquePresentByDate = new Map<string, Set<string>>();
    for (const dateKey of lastSevenDateKeys) {
        uniquePresentByDate.set(dateKey, new Set());
    }

    for (const log of logs || []) {
        if (log.status !== 'present') continue;
        const dateKey = String(log.date);
        if (!uniquePresentByDate.has(dateKey)) continue;
        uniquePresentByDate.get(dateKey)?.add(String(log.user_id));
    }

    const trends = lastSevenDateKeys.map((dateKey) => {
        let label = toISTWeekday(dateKey);
        if (dateKey === todayKey) label = 'Today';
        else if (dateKey === yesterdayKey) label = 'Yesterday';

        return {
            name: label,
            attendance: uniquePresentByDate.get(dateKey)?.size || 0,
            date: dateKey,
            isToday: dateKey === todayKey,
        };
    });

    return trends;
}

export async function getUrgentBlockers(): Promise<Blocker[]> {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const istDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const { data: standups } = await supabase
        .from('daily_standups')
        .select('id, user_id, blockers, profiles!inner(full_name, organization_id)')
        .eq('profiles.organization_id', organizationId)
        .eq('date', istDate)
        .not('blockers', 'is', null)
        .limit(5);

    return (standups || []).map(s => {
        const profile = normalizeProfileRelation(s.profiles as RelatedProfile | RelatedProfile[] | null);
        return ({
            id: s.id,
            title: "Team Blocker",
            description: s.blockers || "",
            priority: "high" as const,
            userName: profile?.full_name || "Unknown",
        });
    });
}

export async function getDepartmentDistribution() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: profiles } = await supabase
        .from('profiles')
        .select('department')
        .eq('organization_id', organizationId)
        .in('role', ['employee', 'founder']);

    const counts: Record<string, number> = {};
    profiles?.forEach(p => {
        const dept = p.department || 'Unassigned';
        counts[dept] = (counts[dept] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
        name,
        count,
        total: profiles?.length || 0,
    }));
}

export async function getRecentActivities(): Promise<Activity[]> {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: logs } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, created_at, profiles!inner(full_name, avatar_url, organization_id)')
        .eq('profiles.organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(25);

    return (logs || []).map(log => {
        const profile = normalizeProfileRelation(log.profiles as RelatedProfile | RelatedProfile[] | null);
        return ({
            id: log.id,
            action: log.action,
            type: log.entity_type,
            time: log.created_at,
            user: {
                name: profile?.full_name || "System",
                avatar: profile?.avatar_url || null,
            }
        });
    });
}

export async function getAllTasks() {
    const supabase = createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            projects(name),
            profiles:profiles!user_id(id, full_name, avatar_url, role),
            creator:profiles!created_by!inner(organization_id)
        `)
        .eq('creator.organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }

    const taskRows = tasks || [];
    if (taskRows.length === 0) return [];

    const taskIds = taskRows.map((task) => task.id);
    const { data: claimRows } = await adminClient
        .from("admin_inbox")
        .select("entity_id, metadata, created_at")
        .eq("entity_type", "task_review")
        .eq("is_handled", false)
        .in("entity_id", taskIds);

    const claimsByTask = new Map<string, { id: string; name: string }[]>();
    for (const row of claimRows || []) {
        const metadata = row.metadata as { claimant_id?: string; claimant_name?: string } | null;
        const claimantId = metadata?.claimant_id;
        if (!claimantId) continue;

        const claimantName = metadata?.claimant_name || "Employee";
        const list = claimsByTask.get(row.entity_id) || [];
        if (!list.some((entry) => entry.id === claimantId)) {
            list.push({ id: claimantId, name: claimantName });
            claimsByTask.set(row.entity_id, list);
        }
    }

    return taskRows.map((task) => {
        const claimants = [...(claimsByTask.get(task.id) || [])];

        // Legacy compatibility: older flows may keep claimant in user_id while pending.
        if (task.assignment_status === "pending_approval" && task.user_id) {
            const exists = claimants.some((entry) => entry.id === task.user_id);
            if (!exists) {
                claimants.push({
                    id: task.user_id,
                    name: task.profiles?.full_name || "Employee",
                });
            }
        }

        return {
            ...task,
            claimants,
        };
    });
}

export async function getAllExpenses() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: expenses } = await supabase
        .from('expenses')
        .select(`
            *,
            profiles:paid_by!inner(full_name, avatar_url, organization_id)
        `)
        .eq('profiles.organization_id', organizationId)
        .order('expense_date', { ascending: false });

    return expenses || [];
}
