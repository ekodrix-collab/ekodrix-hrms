import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/invoice";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface InvoiceStatusBadgeProps {
    status: InvoiceStatus;
    className?: string;
    showIcon?: boolean;
}

const config: Record<
    InvoiceStatus,
    { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
    paid: {
        label: "PAID",
        icon: CheckCircle2,
        className:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    },
    partially_paid: {
        label: "PARTIALLY PAID",
        icon: Clock,
        className:
            "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
    },
    pending: {
        label: "PENDING",
        icon: Clock,
        className:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    },
    cancelled: {
        label: "CANCELLED",
        icon: XCircle,
        className:
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    },
};

export function InvoiceStatusBadge({
    status,
    className,
    showIcon = true,
}: InvoiceStatusBadgeProps) {
    const { label, icon: Icon, className: colorClass } = config[status] ?? config.pending;

    return (
        <Badge
            variant="outline"
            className={cn(
                "gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                colorClass,
                className
            )}
        >
            {showIcon && <Icon className="h-3 w-3" />}
            {label}
        </Badge>
    );
}
