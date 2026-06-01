"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/invoice";

const STATUS_OPTIONS: { label: string; value: "all" | InvoiceStatus }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Paid", value: "paid" },
    { label: "Cancelled", value: "cancelled" },
];

interface InvoiceFiltersProps {
    search: string;
    status: "all" | InvoiceStatus;
    onSearchChange: (v: string) => void;
    onStatusChange: (v: "all" | InvoiceStatus) => void;
    onClear: () => void;
}

export function InvoiceFilters({
    search,
    status,
    onSearchChange,
    onStatusChange,
    onClear,
}: InvoiceFiltersProps) {
    const hasFilters = search || status !== "all";

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    id="invoice-search"
                    placeholder="Search by number, client, or service…"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium text-sm"
                />
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {STATUS_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onStatusChange(opt.value)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                            status === opt.value
                                ? "bg-primary text-white shadow-sm shadow-primary/30"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClear}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
