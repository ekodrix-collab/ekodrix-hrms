import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Middleware already guards all dashboard routes and validates auth.
  // Use getSession() here (reads from cookie, no network call) as a fast
  // server-side check before rendering the shell.
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return <DashboardShell>{children}</DashboardShell>;
}

