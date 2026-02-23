import { getLeaveTypesAction, getMyLeaveBalancesAction, getMyLeaveRequestsAction } from "@/actions/leaves";
import { LeaveClient } from "@/components/leaves/leave-client";

export default async function EmployeeLeavesPage() {
    const [typesRes, balancesRes, requestsRes] = await Promise.all([
        getLeaveTypesAction(),
        getMyLeaveBalancesAction(),
        getMyLeaveRequestsAction()
    ]);

    const leaveTypes = typesRes.ok ? typesRes.data || [] : [];
    const balances = balancesRes.ok ? balancesRes.data || [] : [];
    const requests = requestsRes.ok ? requestsRes.data || [] : [];

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Leave Management</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    Track your leave balances and manage your time-off requests.
                </p>
            </div>

            <LeaveClient
                initialBalances={balances}
                initialRequests={requests}
                leaveTypes={leaveTypes}
            />
        </div>
    );
}
