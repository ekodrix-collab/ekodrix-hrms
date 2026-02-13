// src/app/(auth)/callback/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");
    const error = requestUrl.searchParams.get("error");
    // const errorDescription = requestUrl.searchParams.get("error_description");

    const supabase = createSupabaseServerClient();

    console.log("=== CALLBACK ROUTE ===");
    console.log("Params:", {
        code: code ? "exists" : "none",
        token_hash: token_hash ? "exists" : "none",
        type,
        error
    });

    // For invitations and password recovery, we let the destination page handle session cleanup if needed
    // verifyOtp will establish the new session successfully

    // Handle code exchange (for OAuth, magic links, and some invites)
    if (code) {
        console.log("Exchanging code for session...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
            );
        }

        console.log("Code exchange successful, user:", data.user?.email);
    }

    // Handle token hash (for email confirmations and invites)
    if (token_hash) {
        console.log("Verifying token hash...");

        // Determine the correct type for verification
        let verifyType: "signup" | "invite" | "recovery" | "email" = "email";
        if (type === "invite") {
            verifyType = "invite";
        } else if (type === "signup") {
            verifyType = "signup";
        } else if (type === "recovery") {
            verifyType = "recovery";
        }

        const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: verifyType,
        });

        if (verifyError) {
            console.error("Token verification error:", verifyError);
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(verifyError.message)}`, requestUrl.origin)
            );
        }

        console.log("Token verification successful, user:", data.user?.email);
    }

    // Get the current user after authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    console.log("Callback authenticated user:", user?.email, "Type:", type);

    // Handle different callback types BEFORE the generic user check
    // This allows implicit flows (fragment tokens) to be handled by the client on the redirected page
    if (type === "invite") {
        console.log("Invite callback - redirecting to set-password");
        return NextResponse.redirect(new URL("/set-password", requestUrl.origin));
    }

    if (type === "recovery") {
        // Password recovery - redirect to reset password
        console.log("Recovery callback - redirecting to reset-password");
        return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
    }

    if (!user) {
        console.error("No user after callback - redirecting to login");
        return NextResponse.redirect(new URL("/login?error=no_session", requestUrl.origin));
    }

    // For signup confirmations, check profile status
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

    // If user status is 'invited', they need to set password
    if (profile?.status === "invited") {
        console.log("User status is invited - redirecting to set-password");
        return NextResponse.redirect(new URL("/set-password", requestUrl.origin));
    }

    // Normal login - redirect based on role
    const role = profile?.role ?? "employee";
    const redirectTo = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";

    console.log("Normal callback - redirecting to:", redirectTo);
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}