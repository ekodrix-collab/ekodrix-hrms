// src/actions/signup.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignupFormData } from "@/types/auth";
import { redirect } from "next/navigation";

export async function signupOrganization(formData: SignupFormData) {
    const supabase = createSupabaseServerClient();

    // Generate a unique slug
    const slug =
        formData.organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString().slice(-6);

    // 1. Create Organization first
    const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
            name: formData.organizationName,
            slug: slug,
        })
        .select("id")
        .single();

    if (orgError) {
        console.error("Organization creation error:", orgError);
        return { error: "Failed to create organization: " + orgError.message };
    }

    if (!orgData?.id) {
        return { error: "Failed to create organization: No ID returned" };
    }

    const orgId = orgData.id;

    // 2. Sign up user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            data: {
                full_name: formData.fullName,
                role: "admin", // First user is always admin
                organization_id: orgId,
                status: "active",
            },
        },
    });

    if (authError) {
        // Cleanup: Delete the organization if user signup fails
        await supabase.from("organizations").delete().eq("id", orgId);
        console.error("Auth signup error:", authError);
        return { error: "Failed to create account: " + authError.message };
    }

    if (!authData.user) {
        await supabase.from("organizations").delete().eq("id", orgId);
        return { error: "Failed to create account: No user returned" };
    }

    // 3. Wait a moment for the trigger to execute, then verify profile exists
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. Verify profile was created
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, organization_id")
        .eq("id", authData.user.id)
        .single();

    if (profileError || !profile) {
        console.error("Profile verification error:", profileError);
        // Profile might still be creating, proceed anyway
    }

    // 5. If profile exists but organization_id is null, link it manually
    if (profile && !profile.organization_id) {
        await supabase
            .from("profiles")
            .update({
                organization_id: orgId,
                role: "admin",
                status: "active",
            })
            .eq("id", authData.user.id);
    }

    // Admin user goes to admin dashboard
    redirect("/admin/dashboard");
}