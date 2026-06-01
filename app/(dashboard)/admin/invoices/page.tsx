import { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { InvoiceStatsCards } from "@/components/invoices/invoice-stats-cards";

export const metadata: Metadata = {
    title: "Invoices | Ekodrix HRMS",
    description: "Admin-only invoice management — create, track, and download professional invoices.",
};

export default function AdminInvoicesPage() {
    return (
        <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
            {/* ── Page Header ──────────────────────────────────── */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-black text-xs uppercase tracking-widest">
                        <FileText className="h-3 w-3" />
                        Billing Module
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100">
                        Invoices
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm md:text-base">
                        Create, manage, and download professional client invoices.
                    </p>
                </div>

                <div className="flex justify-center md:justify-end">
                    <Link href="/admin/invoices/new">
                        <Button
                            id="create-invoice-btn"
                            className="gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20 px-6"
                        >
                            <Plus className="h-4 w-4" />
                            New Invoice
                        </Button>
                    </Link>
                </div>
            </header>

            {/* ── Summary Stats ─────────────────────────────────── */}
            <InvoiceStatsCards />

            {/* ── Invoice Table ─────────────────────────────────── */}
            <InvoiceTable />
        </div>
    );
}
