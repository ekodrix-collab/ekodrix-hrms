"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSidebarCountsAction() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { ok: false, data: { adminInbox: 0, marketplace: 0 } };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === 'admin';

    let adminInbox = 0;
    let marketplace = 0;

    if (isAdmin) {
        // Count unhandled admin inbox items
        const { count } = await supabase
            .from("admin_inbox")
            .select("*", { count: "exact", head: true })
            .eq("is_handled", false);
        adminInbox = count || 0;
    } else {
        // Count open marketplace tasks without pulling full task rows.
        const [{ count: openCount }, { count: rejectedCount }] = await Promise.all([
            supabase
                .from("tasks")
                .select("id", { count: "exact", head: true })
                .eq("assignment_status", "open"),
            supabase
                .from("tasks")
                .select("id", { count: "exact", head: true })
                .eq("assignment_status", "open")
                .contains("rejected_user_ids", [user.id]),
        ]);

        marketplace = Math.max(0, (openCount || 0) - (rejectedCount || 0));
    }

    return { ok: true, data: { adminInbox, marketplace } };
}
