"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth-utils";

export async function getAllStandups(filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    hasBlockers?: boolean;
}) {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();

    if (!organizationId) {
        return { error: "No organization context", standups: [] };
    }

    let query = supabase
        .from('daily_standups')
        .select(`
            *,
            profiles!inner(full_name, avatar_url, department, organization_id)
        `)
        .eq('profiles.organization_id', organizationId)
        .order('date', { ascending: false });

    if (filters?.userId && filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
    }

    if (filters?.hasBlockers) {
        query = query.not('blockers', 'is', null).neq('blockers', '');
    }

    const { data: standups, error } = await query;

    if (error) {
        console.error('Error fetching standups:', error);
        return { error: error.message, standups: [] };
    }

    return { standups: standups || [] };
}

export async function getAllEmployees() {
    const supabase = createSupabaseServerClient();
    const { organizationId } = await getOrgContext();

    if (!organizationId) {
        return { error: "No organization context", employees: [] };
    }

    const { data: employees, error } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .eq('role', 'employee')
        .eq('is_active', true)
        .eq('organization_id', organizationId)
        .order('full_name');

    if (error) {
        return { error: error.message, employees: [] };
    }

    return { employees: employees || [] };
}
