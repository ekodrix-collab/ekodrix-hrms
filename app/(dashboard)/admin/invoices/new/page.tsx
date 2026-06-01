import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { CreateInvoiceForm } from "@/components/invoices/create-invoice-form";

export const metadata: Metadata = {
    title: "New Invoice | Ekodrix HRMS",
    description: "Create a new professional client invoice.",
};

export default function NewInvoicePage() {
    return (
        <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700 max-w-4xl mx-auto">
            {/* ── Page Header ──────────────────────────────────── */}
            <header className="space-y-1">
                <Link
                    href="/admin/invoices"
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
                </Link>
                <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                    <FileText className="h-3 w-3" />
                    Billing Module
                </div>
                <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    Create Invoice
                </h1>
                <p className="text-muted-foreground font-medium text-sm">
                    Fill in the details below to generate a professional invoice.
                </p>
            </header>

            {/* ── Form ─────────────────────────────────────────── */}
            <CreateInvoiceForm />
        </div>
    );
}
