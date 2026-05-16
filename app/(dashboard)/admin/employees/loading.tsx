import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEmployeesLoading() {
    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36 rounded-md" />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
            </div>
        </div>
    );
}
