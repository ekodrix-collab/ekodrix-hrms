import { getAllLeaveRequestsAction } from "@/actions/leaves";
import { AdminLeavesClient } from "@/components/admin/leaves/admin-leaves-client";

export default async function AdminLeavesPage() {
    const res = await getAllLeaveRequestsAction();
    const requests = res.ok ? res.data || [] : [];

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">
                    Leave Requests
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    Manage and review employee time-off requests.
                </p>
            </div>

            <AdminLeavesClient initialRequests={requests} />
        </div>
    );
}
