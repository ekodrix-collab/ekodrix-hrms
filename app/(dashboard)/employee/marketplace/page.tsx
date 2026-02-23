import { getOpenTasksAction } from "@/actions/tasks";
import { MarketplaceClient } from "@/components/employee/marketplace-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Task Marketplace | Ekodrix",
    description: "Claim unassigned tasks and contribute to projects.",
};

export default async function MarketplacePage() {
    const result = await getOpenTasksAction();
    const tasks = result.ok ? result.data : [];

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <MarketplaceClient initialTasks={tasks || []} />
        </div>
    );
}
