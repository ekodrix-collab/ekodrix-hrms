import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProjectDetailsAction } from "@/actions/projects";
import { ProjectFinanceTab } from "@/components/admin/projects/project-finance-tab";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import type { Project } from "@/types/dashboard";

export const metadata: Metadata = {
  title: "Project Finance | Admin"
};

export default async function ProjectFinanceDetailPage({ params }: { params: { id: string } }) {
  const projectRes = await getProjectDetailsAction(params.id);
  if (!projectRes.ok || !projectRes.data) return notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/project-finance">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
      <ProjectFinanceTab project={projectRes.data as unknown as Project} />
    </div>
  );
}
