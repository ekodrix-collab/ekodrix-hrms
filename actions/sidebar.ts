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
        // Count open marketplace tasks not rejected by this user
        // We'll fetch them all and filter in JS because Supabase 'not in array' is tricky with RPCs sometimes
        const { data: openTasks } = await supabase
            .from("tasks")
            .select("id, rejected_user_ids")
            .eq("assignment_status", "open");

        if (openTasks) {
            marketplace = openTasks.filter(t => !t.rejected_user_ids?.includes(user.id)).length;
        }
    }

    return { ok: true, data: { adminInbox, marketplace } };
}
