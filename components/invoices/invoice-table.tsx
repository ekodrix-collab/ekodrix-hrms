"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, softDeleteInvoice, updateInvoiceStatus } from "@/actions/invoices";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import {
    Eye, Printer, Trash2, CheckCircle2, Clock, XCircle, Loader2, FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CURRENCY = "₹";
const fmt = (n: number) =>
    `${CURRENCY}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function InvoiceTable() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | InvoiceStatus>("all");

    const { data, isLoading } = useQuery({
        queryKey: ["invoices", { search, status }],
        queryFn: () => getInvoices({ search, status }),
        staleTime: 15_000,
    });

    const invoices = (data?.data ?? []) as Invoice[];

    const statusMut = useMutation({
        mutationFn: ({ id, s }: { id: string; s: InvoiceStatus }) =>
            updateInvoiceStatus(id, s),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["invoice-summary"] });
            toast.success("Invoice status updated.");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => softDeleteInvoice(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["invoice-summary"] });
            toast.success("Invoice deleted.");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const handleClear = () => { setSearch(""); setStatus("all"); };

    return (
        <div className="space-y-4">
            <InvoiceFilters
                search={search}
                status={status}
                onSearchChange={setSearch}
                onStatusChange={setStatus}
                onClear={handleClear}
            />

            <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                <CardContent className="p-0">
                    {/* Mobile view */}
                    <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                        {isLoading ? (
                            <div className="p-16 flex justify-center">
                                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                            </div>
                        ) : invoices.length > 0 ? (
                            invoices.map((inv) => (
                                <div key={inv.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-black text-primary uppercase tracking-widest">
                                                {inv.invoice_number}
                                            </p>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                                                {inv.client_name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground font-medium">
                                                {inv.service_name}
                                            </p>
                                        </div>
                                        <InvoiceStatusBadge status={inv.payment_status} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-black tabular-nums text-zinc-900 dark:text-zinc-100">
                                            {fmt(inv.total_amount)}
                                            {Number(inv.paid_amount) > 0 && (
                                                <span className="text-[10px] font-medium text-muted-foreground ml-2">
                                                    (Paid: {fmt(Number(inv.paid_amount))} / Bal: {fmt(Number(inv.balance_due))})
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-bold">
                                            {format(new Date(inv.invoice_date), "dd MMM yyyy")}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Link href={`/admin/invoices/${inv.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                                                <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                                            </Button>
                                        </Link>
                                        <Link href={`/admin/invoices/${inv.id}/print`} target="_blank" className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                                                <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState hasFilters={!!(search || status !== "all")} />
                        )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-zinc-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        </td>
                                    </tr>
                                ) : invoices.length > 0 ? (
                                    invoices.map((inv, i) => (
                                        <motion.tr
                                            key={inv.id}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.025 }}
                                            className="group h-[72px] hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                                        >
                                            <td className="px-6">
                                                <span className="text-xs font-black text-primary uppercase tracking-widest">
                                                    {inv.invoice_number}
                                                </span>
                                            </td>
                                            <td className="px-6">
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                        {inv.client_name}
                                                    </p>
                                                    {inv.client_email && (
                                                        <p className="text-[11px] text-muted-foreground font-medium">
                                                            {inv.client_email}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6">
                                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[180px] truncate">
                                                    {inv.service_name}
                                                </p>
                                            </td>
                                            <td className="px-6">
                                                <div>
                                                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                                        {format(new Date(inv.invoice_date), "dd MMM yyyy")}
                                                    </p>
                                                    {inv.due_date && (
                                                        <p className="text-[10px] text-muted-foreground font-medium">
                                                            Due: {format(new Date(inv.due_date), "dd MMM yyyy")}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6">
                                                <InvoiceStatusBadge status={inv.payment_status} />
                                            </td>
                                            <td className="px-6 text-right">
                                                <span className="text-sm font-black tabular-nums text-zinc-900 dark:text-zinc-100">
                                                    {fmt(inv.total_amount)}
                                                </span>
                                                {Number(inv.paid_amount) > 0 && (
                                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5 tabular-nums">
                                                        Paid: {fmt(Number(inv.paid_amount))} <br/> Bal: {fmt(Number(inv.balance_due))}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 text-right">
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/admin/invoices/${inv.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/admin/invoices/${inv.id}/print`} target="_blank">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg text-muted-foreground"
                                                            >
                                                                <span className="text-lg leading-none">⋯</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                                                Change Status
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuItem
                                                                disabled={inv.payment_status === "paid"}
                                                                onClick={() => statusMut.mutate({ id: inv.id, s: "paid" })}
                                                                className="gap-2 text-emerald-600 font-bold text-sm"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" /> Mark as Paid
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                disabled={inv.payment_status === "pending"}
                                                                onClick={() => statusMut.mutate({ id: inv.id, s: "pending" })}
                                                                className="gap-2 text-amber-600 font-bold text-sm"
                                                            >
                                                                <Clock className="h-4 w-4" /> Mark as Pending
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                disabled={inv.payment_status === "cancelled"}
                                                                onClick={() => statusMut.mutate({ id: inv.id, s: "cancelled" })}
                                                                className="gap-2 text-zinc-500 font-bold text-sm"
                                                            >
                                                                <XCircle className="h-4 w-4" /> Cancel Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    if (confirm("Permanently delete this invoice?")) {
                                                                        deleteMut.mutate(inv.id);
                                                                    }
                                                                }}
                                                                className="gap-2 text-red-500 font-bold text-sm"
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7}>
                                            <EmptyState hasFilters={!!(search || status !== "all")} />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
    return (
        <div className="py-20 flex flex-col items-center gap-3 text-center opacity-50">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="font-bold text-sm">
                {hasFilters ? "No invoices match your filters." : "No invoices yet."}
            </p>
            {!hasFilters && (
                <p className="text-xs text-muted-foreground">
                    Create your first invoice to get started.
                </p>
            )}
        </div>
    );
}
