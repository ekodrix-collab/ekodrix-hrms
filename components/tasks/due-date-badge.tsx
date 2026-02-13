import { format, isPast, isToday, isTomorrow, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueDateBadgeProps {
    dueDate: string | null | undefined;
    className?: string;
    showIcon?: boolean;
}

export function DueDateBadge({ dueDate, className, showIcon = true }: DueDateBadgeProps) {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const dueToday = isToday(date);
    const dueTomorrow = isTomorrow(date);
    const dueSoon = date <= addDays(new Date(), 3) && !isOverdue;

    let colorClass = "text-zinc-500 border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50";
    let Icon = Clock;
    let text = format(date, "MMM d");

    if (isOverdue) {
        colorClass = "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50";
        Icon = AlertCircle;
        text = `Overdue: ${format(date, "MMM d")}`;
    } else if (dueToday) {
        colorClass = "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900/50";
        Icon = AlertTriangle;
        text = "Due Today";
    } else if (dueTomorrow) {
        colorClass = "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50";
        text = "Due Tomorrow";
    } else if (dueSoon) {
        colorClass = "text-primary border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/20";
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-bold text-[10px] uppercase tracking-wide gap-1.5 px-2 py-0.5 h-5",
                colorClass,
                className
            )}
        >
            {showIcon && <Icon className="h-3 w-3" />}
            {text}
        </Badge>
    );
}
