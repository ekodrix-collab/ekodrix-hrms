// src/app/(dashboard)/employee/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.log("Employee Layout: No user, redirecting to login");
        redirect("/login");
    }

    // Both employees and admins can access employee pages
    // So we just verify authentication
    console.log("Employee Layout: User authenticated, rendering content");

    return <>{children}</>;
}