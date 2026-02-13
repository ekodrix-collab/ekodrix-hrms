"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth-utils";
import type { Blocker, Activity } from "@/types/dashboard";

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
        .eq('role', 'employee')
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
        .eq('role', 'employee');

    // 2. Get today's attendance count in org
    const istDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const { count: presentToday } = await supabase
        .from('attendance')
        .select('id, user_id, profiles!inner(organization_id)', { count: 'exact', head: true })
        .eq('date', istDate)
        .eq('status', 'present')
        .eq('profiles.organization_id', organizationId);

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

    const now = new Date();
    const istSevenDaysAgo = new Date(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)));

    const { data: logs } = await supabase
        .from('attendance')
        .select('date, status, profiles!inner(organization_id)')
        .eq('profiles.organization_id', organizationId)
        .gte('date', istSevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trends = days.map(day => {
        const count = logs?.filter(l => {
            const date = new Date(l.date);
            return days[date.getDay()] === day && l.status === 'present';
        }).length || 0;
        return { name: day, attendance: count };
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

    return (standups || []).map(s => ({
        id: s.id,
        title: "Team Blocker",
        description: s.blockers || "",
        priority: "high" as const,
        userName: (s.profiles as any)?.full_name || "Unknown",
    }));
}

export async function getDepartmentDistribution() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: profiles } = await supabase
        .from('profiles')
        .select('department')
        .eq('organization_id', organizationId)
        .eq('role', 'employee');

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

    return (logs || []).map(log => ({
        id: log.id,
        action: log.action,
        type: log.entity_type,
        time: log.created_at,
        user: {
            name: (log.profiles as any)?.full_name || "System",
            avatar: (log.profiles as any)?.avatar_url || null,
        }
    }));
}

export async function getAllTasks() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();
    if (!organizationId) return [];

    const { data: tasks } = await supabase
        .from('tasks')
        .select(`
            *,
            profiles:profiles!user_id!inner(full_name, avatar_url, organization_id)
        `)
        .eq('profiles.organization_id', organizationId)
        .order('created_at', { ascending: false });

    return tasks || [];
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
