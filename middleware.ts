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

  // Detect background requests (Server Actions, Prefetches, AJAX)
  const isServerAction = request.headers.has("next-action");
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1" ||
    request.headers.has("next-router-prefetch");
  const isJsonRequest = request.headers.get("accept")?.includes("application/json");
  const isBackgroundRequest = isServerAction || isPrefetch || isJsonRequest;

  // Use getUser() instead of getSession() for security
  const {
    data: { user },
    error: authError,
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

  // Fetch profile once if user exists to optimize
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, status, organization_id")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Handle Root path redirection
  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const role = profile?.role ?? "employee";
    const redirectTo = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Protected route access without user
  if (!user && !isPublicRoute) {
    // If it's a background request, return 401 instead of redirecting
    // This prevents the whole page from redirecting during a race condition in background polls
    if (isBackgroundRequest) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is logged in but trying to access public auth routes
  if (user && isPublicRoute) {
    const role = profile?.role ?? "employee";
    const redirectTo = role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Role-based access control and account status check
  if (user && (isAdminRoute || isEmployeeRoute)) {
    // Check if user account is active
    if (profile?.status === "inactive") {
      if (isBackgroundRequest) {
        return new NextResponse(JSON.stringify({ error: "Account inactive" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account_inactive", request.url));
    }

    const role = profile?.role ?? "employee";

    // Employee trying to access admin routes
    if (isAdminRoute && role !== "admin") {
      if (isBackgroundRequest) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }
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