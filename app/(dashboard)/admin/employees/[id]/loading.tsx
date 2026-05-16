import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDetailsLoading() {
    return (
        <div className="space-y-8 p-4 md:p-8">
            <div className="space-y-3">
                <Skeleton className="h-8 w-40" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-72" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
            </div>

            <div className="space-y-6">
                <Skeleton className="h-12 w-[520px] rounded-xl" />
                <Skeleton className="h-[420px] w-full rounded-2xl" />
                <Skeleton className="h-[360px] w-full rounded-2xl" />
            </div>
        </div>
    );
}
