import { Badge } from "@/components/ui/badge";

const priorityConfig: Record<string, string> = {
    urgent: "bg-red-500/10 text-red-600 border-red-200",
    high: "bg-orange-500/10 text-orange-600 border-orange-200",
    medium: "bg-blue-500/10 text-blue-600 border-blue-200",
    low: "bg-zinc-500/10 text-zinc-600 border-zinc-200",
};

interface TaskPriorityBadgeProps {
    priority: string;
    /** Extra Tailwind classes, e.g. text-[8px] for table rows */
    className?: string;
}

export function TaskPriorityBadge({ priority, className }: TaskPriorityBadgeProps) {
    const colorClass = priorityConfig[priority] ?? priorityConfig.low;
    return (
        <Badge
            variant="outline"
            className={`font-black uppercase capitalize ${colorClass} ${className ?? "text-[9px]"}`}
        >
            {priority}
        </Badge>
    );
}
