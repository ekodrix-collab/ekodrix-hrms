// src/app/(dashboard)/admin/layout.tsx
// Middleware already validates that the user is authenticated AND has role=admin
// AND that their account is active before any request reaches this layout.
// We only do a single cheap getSession() check here to avoid a redundant DB round-trip.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Fast session check — reads from cookie, no network call to Supabase Auth.
    // Middleware has already enforced role=admin and status=active.
    const supabase = createSupabaseServerClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login");
    }

    return <>{children}</>;
}