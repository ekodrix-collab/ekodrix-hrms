// src/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required" };
  }

  const supabase = createSupabaseServerClient();

  // Sign in the user
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    console.error("Login error:", authError);
    return { ok: false, message: authError.message };
  }

  if (!authData.user) {
    return { ok: false, message: "Login failed: No user returned" };
  }

  console.log("✅ User logged in:", authData.user.id, authData.user.email);

  // ALWAYS use admin client to get profile (bypasses RLS)
  const adminClient = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, role, is_active, status")
    .eq("id", authData.user.id)
    .single();

  console.log("Profile from ADMIN client:", { profile, profileError });

  // Determine role
  let role = "employee"; // default

  if (profile) {
    role = profile.role || "employee";
    console.log("✅ Got role from profile:", role);

    // Check if user is active
    if (!profile.is_active || profile.status === "inactive") {
      await supabase.auth.signOut();
      return { ok: false, message: "Your account has been deactivated" };
    }

    // Check if user needs to set password
    if (profile.status === "invited") {
      redirect("/set-password");
    }
  } else {
    // Fallback to user metadata
    role = authData.user.user_metadata?.role || "employee";
    console.log("⚠️ Fallback to user_metadata role:", role);
  }

  revalidatePath("/", "layout");

  // Redirect based on role
  console.log("🔀 Final redirect - Role:", role);

  if (role === "admin") {
    console.log("➡️ Redirecting to /admin/dashboard");
    redirect("/admin/dashboard");
  } else {
    console.log("➡️ Redirecting to /employee/dashboard");
    redirect("/employee/dashboard");
  }
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { ok: false, message: "Email is required" };
  }

  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/callback?type=recovery`,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Password reset email sent" };
}

export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use admin client to always get profile
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    profile,
  };
}