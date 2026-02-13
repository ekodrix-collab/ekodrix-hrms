// src/actions/invitations.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface Employee {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    department: string | null;
    designation: string | null;
    created_at?: string;
}

export interface InviteEmployeeData {
    email: string;
    fullName: string;
    department?: string;
    designation?: string;
    role?: "admin" | "employee";
}

export async function inviteEmployee(data: InviteEmployeeData) {
    const supabase = createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // 1. Verify current user is admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    // Get admin's profile and organization
    const { data: adminProfile } = await supabase
        .from("profiles")
        .select(
            "organization_id, role, full_name, organization:organizations(name)"
        )
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { error: "Only admins can invite employees" };
    }

    if (!adminProfile.organization_id) {
        return { error: "You must be part of an organization" };
    }

    // 2. Check if user already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );

    if (userExists) {
        return { error: "A user with this email already exists" };
    }

    // 3. Get organization name for email
    const orgName =
        (adminProfile.organization as { name?: string })?.name || "the team";

    // 4. Invite user using Supabase Admin API
    const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(data.email.toLowerCase(), {
            data: {
                full_name: data.fullName,
                role: data.role || "employee",
                organization_id: adminProfile.organization_id,
                department: data.department || null,
                designation: data.designation || null,
                status: "invited",
                invited_by: user.id,
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?type=invite`,
        });

    if (inviteError) {
        // Handle Rate Limit Error by generating a manual link
        if (inviteError.status === 429 || inviteError.message.includes("rate limit")) {
            console.warn("Email rate limit hit. Generating manual link fallback...");

            const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                type: 'invite',
                email: data.email.toLowerCase(),
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?type=invite`,
                    data: {
                        full_name: data.fullName,
                        role: data.role || "employee",
                        organization_id: adminProfile.organization_id,
                        department: data.department || null,
                        designation: data.designation || null,
                        status: "invited",
                        invited_by: user.id,
                    },
                }
            });

            if (linkError) {
                return { error: `Failed to even generate a link: ${linkError.message}` };
            }

            // Construct a direct link to set-password instead of using the generic supabase verify link
            // This is more robust as it lands the user directly where they need to be
            const manualLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token_hash=${linkData.properties.hashed_token}&type=invite`;

            revalidatePath("/admin/employees");
            return {
                success: true,
                message: "Email rate limit hit, but invitation link was generated!",
                manualLink: manualLink,
                emailLimitHit: true
            };
        }

        console.error("Invite error:", inviteError);
        return { error: inviteError.message };
    }

    console.log("✅ User invited successfully:", inviteData.user?.email);

    revalidatePath("/admin/employees");

    return {
        success: true,
        message: `Invitation sent to ${data.email}`,
        userId: inviteData.user?.id,
    };
}

// Get all employees in organization
export async function getOrganizationEmployees(): Promise<{ error?: string; employees: Employee[] }> {
    const supabase = createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated", employees: [] };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) {
        return { error: "No organization", employees: [] };
    }

    const { data: employees, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, status, department, designation, created_at")
        .eq("organization_id", profile.organization_id)
        .neq("id", user.id) // Exclude current user
        .order("created_at", { ascending: false });

    if (error) {
        return { error: error.message, employees: [] };
    }

    return { employees: (employees as Employee[]) || [] };
}

// Resend invitation to a user
export async function resendInvitation(userId: string) {
    const supabase = createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // Verify admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { error: "Unauthorized" };
    }

    // Get the invited user's profile with all metadata needed for re-invitation
    const { data: invitedProfile } = await supabase
        .from("profiles")
        .select("email, status, organization_id, full_name, role, department, designation, invited_by")
        .eq("id", userId)
        .single();

    if (!invitedProfile) {
        return { error: "User not found" };
    }

    if (invitedProfile.organization_id !== adminProfile.organization_id) {
        return { error: "User not in your organization" };
    }

    if (invitedProfile.status !== "invited") {
        return { error: "User has already accepted the invitation" };
    }

    // 1. Delete the existing auth user to allow re-invitation
    // Since profiles has ON DELETE CASCADE (linked to auth.users.id), 
    // the profile will also be deleted, but we have the metadata saved in invitedProfile
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
        console.error("Error deleting user for resend:", deleteError);
        // Continue anyway, it might be that the user doesn't exist in auth but exists in profiles
    }

    // 2. Re-invite using inviteUserByEmail which triggers the email
    const { error: resendError } =
        await adminClient.auth.admin.inviteUserByEmail(invitedProfile.email, {
            data: {
                full_name: invitedProfile.full_name,
                role: invitedProfile.role || "employee",
                organization_id: invitedProfile.organization_id,
                department: invitedProfile.department || null,
                designation: invitedProfile.designation || null,
                status: "invited",
                invited_by: invitedProfile.invited_by || user.id,
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?type=invite`,
        });

    if (resendError) {
        if (resendError.status === 429 || resendError.message.includes("rate limit")) {
            console.warn("Resend path: Email rate limit hit. Generating manual link...");

            const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                type: 'invite',
                email: invitedProfile.email,
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?type=invite`,
                    data: {
                        full_name: invitedProfile.full_name,
                        role: invitedProfile.role || "employee",
                        organization_id: invitedProfile.organization_id,
                        department: invitedProfile.department || null,
                        designation: invitedProfile.designation || null,
                        status: "invited",
                        invited_by: invitedProfile.invited_by || user.id,
                    },
                }
            });

            if (linkError) return { error: linkError.message };

            // Construct a direct link to set-password
            const manualLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token_hash=${linkData.properties.hashed_token}&type=invite`;

            revalidatePath("/admin/employees");
            return {
                success: true,
                message: "Email rate limit hit. Copied fallback link.",
                manualLink: manualLink,
                emailLimitHit: true
            };
        }
        console.error("Resend invite error after deletion:", resendError);
        return { error: resendError.message };
    }

    revalidatePath("/admin/employees");

    return { success: true, message: "Invitation resent successfully" };
}

// Just get an invitation link for an existing user
export async function getInvitationLink(userId: string) {
    const supabase = createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: invitedProfile } = await supabase
        .from("profiles")
        .select("email, full_name, role, organization_id, department, designation, invited_by, status")
        .eq("id", userId)
        .single();

    if (!invitedProfile || invitedProfile.status !== 'invited') {
        return { error: "User not found or already active" };
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: invitedProfile.email,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?type=invite`,
            data: {
                full_name: invitedProfile.full_name,
                role: invitedProfile.role,
                organization_id: invitedProfile.organization_id,
                department: invitedProfile.department,
                designation: invitedProfile.designation,
                status: "invited",
                invited_by: invitedProfile.invited_by,
            },
        }
    });

    if (linkError) return { error: linkError.message };

    // Construct a direct link to set-password
    const manualLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token_hash=${linkData.properties.hashed_token}&type=invite`;

    return {
        success: true,
        manualLink: manualLink
    };
}

// Cancel invitation (delete user if not yet active)
export async function cancelInvitation(userId: string) {
    const supabase = createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // Verify admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { error: "Unauthorized" };
    }

    // Get the invited user's profile
    const { data: invitedProfile } = await supabase
        .from("profiles")
        .select("status, organization_id")
        .eq("id", userId)
        .single();

    if (!invitedProfile) {
        return { error: "User not found" };
    }

    if (invitedProfile.organization_id !== adminProfile.organization_id) {
        return { error: "User not in your organization" };
    }

    if (invitedProfile.status !== "invited") {
        return { error: "Cannot cancel - user has already joined" };
    }

    // Delete user from auth (cascade deletes profile)
    const { error: deleteError } =
        await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
        return { error: deleteError.message };
    }

    revalidatePath("/admin/employees");

    return { success: true, message: "Invitation cancelled" };
}