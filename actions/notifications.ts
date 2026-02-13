"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface NotificationData {
    user_id: string;
    type: "task_assigned" | "task_updated" | "task_completed" | "system";
    title: string;
    message: string;
    entity_type?: string;
    entity_id?: string;
}

export async function createNotification(data: NotificationData) {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.from("notifications").insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        is_read: false,
    });

    if (error) {
        console.error("Failed to create notification:", error);
        return { ok: false, error: error.message };
    }

    revalidatePath("/employee/dashboard");
    return { ok: true };
}

export async function getNotifications() {
    const supabase = createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, message: "Not authenticated", data: [] };

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) return { ok: false, message: error.message, data: [] };

    return { ok: true, data: data || [] };
}

export async function getUnreadNotificationCount() {
    const supabase = createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, count: 0 };

    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) return { ok: false, count: 0 };

    return { ok: true, count: count || 0 };
}

export async function markNotificationRead(id: string) {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/employee/dashboard");
    return { ok: true };
}

export async function markAllNotificationsRead() {
    const supabase = createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, message: "Not authenticated" };

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/employee/dashboard");
    return { ok: true };
}
