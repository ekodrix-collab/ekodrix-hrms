// src/app/(dashboard)/employee/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Middleware already validates auth for /employee/* routes.
    // Use getSession() (cookie read, no network call) as a cheap server guard.
    const supabase = createSupabaseServerClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    }

    // Both employees and admins can access employee pages —
    // middleware already enforces role-based access control.
    return <>{children}</>;
}