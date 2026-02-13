// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // Static files like .ico, .png, etc.
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Use getUser() instead of getSession() for security
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Define route types
  const publicRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isCallbackRoute = pathname.startsWith("/callback");
  const isSetPasswordRoute = pathname.startsWith("/set-password");
  const isInviteRoute = pathname.startsWith("/invite");
  const isAdminRoute = pathname.startsWith("/admin");
  const isEmployeeRoute = pathname.startsWith("/employee");

  // Allow callback, invite, and set-password routes (they handle their own auth)
  if (isCallbackRoute || isInviteRoute || isSetPasswordRoute) {
    return response;
  }

  // Root path handling
  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get user role from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "employee";
    const redirectTo = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // No user and trying to access protected route
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Has user but trying to access public auth routes
  if (user && isPublicRoute) {
    // Get user role and redirect to appropriate dashboard
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "employee";
    const redirectTo = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Role-based access control
  if (user && (isAdminRoute || isEmployeeRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    // Check if user account is active
    if (profile?.status === "inactive") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account_inactive", request.url));
    }

    const role = profile?.role ?? "employee";

    // Employee trying to access admin routes
    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }

    // Admin can access both admin and employee routes
    // No need to redirect admins from employee routes
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};