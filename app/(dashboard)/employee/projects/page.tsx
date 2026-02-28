import { getProjectsAction } from "@/actions/projects";
import { EmployeeProjectsClient } from "@/components/employee/employee-projects-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "My Projects | Ekodrix",
    description: "View and track the projects you are contributing to.",
};

export default async function EmployeeProjectsPage() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch projects
    const result = await getProjectsAction();

    // For now, we fetch all active projects. 
    // In a future refinement, we might filter projects where the user has at least one task.
    const projects = result.ok ? result.data : [];

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <EmployeeProjectsClient initialProjects={projects || []} userId={user?.id} />
        </div>
    );
}
