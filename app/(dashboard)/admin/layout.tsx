// src/app/(dashboard)/admin/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createSupabaseServerClient();

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Use admin client to bypass RLS issues
    const adminClient = createSupabaseAdminClient();

    const { data: profile, error } = await adminClient
        .from("profiles")
        .select("role, status, organization_id")
        .eq("id", user.id)
        .single();



    // If profile fetch failed, try regular client as fallback
    if (error || !profile) {
        const { data: fallbackProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (fallbackProfile?.role !== "admin") {
            redirect("/employee/dashboard");
        }
    }

    // Check if user is admin
    if (profile && profile.role !== "admin") {
        redirect("/employee/dashboard");
    }

    // Check if account is active
    if (profile && profile.status === "inactive") {
        redirect("/login?error=account_inactive");
    }



    // User is admin, render the admin pages
    return <>{children}</>;
}