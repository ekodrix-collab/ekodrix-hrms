import { createSupabaseServerClient } from "./supabase/server";
import { cache } from "react";

/**
 * Get the current user and their organization context.
 * Memoized using react.cache to prevent multiple DB calls within a single request.
 */
export const getOrgContext = cache(async () => {
    const supabase = createSupabaseServerClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { user: null, organizationId: null, role: null, error: "Not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { user, organizationId: null, role: null, error: "Profile not found" };
    }

    return {
        user,
        organizationId: profile.organization_id,
        role: profile.role,
        error: null
    };
});
