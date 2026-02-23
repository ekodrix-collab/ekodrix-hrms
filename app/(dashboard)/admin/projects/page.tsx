import { getProjectsAction } from "@/actions/projects";
import { ProjectsClient } from "@/components/admin/projects/projects-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Projects | Admin",
    description: "Manage company projects and track progress.",
};

export default async function AdminProjectsPage() {
    const result = await getProjectsAction();
    const projects = result.ok ? result.data : [];

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Project Management</h2>
            </div>
            <ProjectsClient initialProjects={projects || []} />
        </div>
    );
}
