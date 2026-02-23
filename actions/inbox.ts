"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface InboxItem {
    id: string;
    title: string;
    description: string;
    entity_type: 'leave_request' | 'expense' | 'task_review';
    entity_id: string;
    is_handled: boolean;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    updated_at: string;
    metadata?: any;
}

export async function getAdminInboxAction() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data, error } = await supabase
        .from("admin_inbox")
        .select("*")
        .order("is_handled", { ascending: true })
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data: data as InboxItem[] };
}

export async function toggleInboxHandledAction(id: string, isHandled: boolean) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("admin_inbox")
        .update({ is_handled: isHandled, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/inbox");
    return { ok: true };
}
