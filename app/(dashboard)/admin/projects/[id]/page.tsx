import { getProjectDetailsAction } from "@/actions/projects";
import { ProjectDetailsClient } from "@/components/admin/projects/project-details-client";
import { getAllEmployeesAction } from "@/actions/tasks";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Employee, Project } from "@/types/dashboard";

export const metadata: Metadata = {
    title: "Project Details | Admin",
};

export default async function ProjectDetailsPage({ params }: { params: { id: string } }) {
    const [projectRes, employeesRes] = await Promise.all([
        getProjectDetailsAction(params.id),
        getAllEmployeesAction()
    ]);

    if (!projectRes.ok || !projectRes.data) {
        return notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <ProjectDetailsClient
                project={projectRes.data as unknown as Project}
                employees={employeesRes.ok ? (employeesRes.data as unknown as Employee[] ?? []) : []}
                canAssignProjectManager
            />
        </div>
    );
}
