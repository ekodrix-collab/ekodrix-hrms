"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoiceById, updateInvoiceStatus, softDeleteInvoice, addPayment, softDeletePayment } from "@/actions/invoices";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Printer, Trash2, CheckCircle2, Clock, XCircle,
    Loader2, User, FileText, CalendarDays, Package, Plus, Receipt
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { InvoiceItem, InvoiceStatus } from "@/types/invoice";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const CURRENCY = "₹";
const fmt = (n: number) =>
    `${CURRENCY}${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface InvoiceDetailClientProps {
    id: string;
}

export function InvoiceDetailClient({ id }: InvoiceDetailClientProps) {
    const router = useRouter();
    const qc = useQueryClient();

    const { data: res, isLoading } = useQuery({
        queryKey: ["invoice", id],
        queryFn: () => getInvoiceById(id),
    });

    const inv = res?.data;
    const activePayments = inv?.payments?.filter((pm) => pm.is_active) ?? [];

    const statusMut = useMutation({
        mutationFn: (s: InvoiceStatus) => updateInvoiceStatus(id, s),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["invoice", id] });
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["invoice-summary"] });
            toast.success("Status updated.");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: () => softDeleteInvoice(id),
        onSuccess: () => {
            toast.success("Invoice deleted.");
            router.push("/admin/invoices");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [payDate, setPayDate] = useState("");
    const [method, setMethod] = useState("bank_transfer");
    const [ref, setRef] = useState("");
    const [pmNotes, setPmNotes] = useState("");

    // Initialize fields when dialog opens
    useEffect(() => {
        if (inv) {
            setAmount(String(inv.balance_due ?? inv.total_amount));
            setPayDate(new Date().toISOString().split("T")[0]);
            setMethod("bank_transfer");
            setRef("");
            setPmNotes("");
        }
    }, [isPaymentOpen, inv]);

    const addPaymentMut = useMutation({
        mutationFn: () => addPayment({
            invoice_id: id,
            amount_paid: Number(amount),
            payment_date: payDate,
            payment_method: method,
            transaction_reference: ref,
            notes: pmNotes,
        }),
        onSuccess: (res) => {
            if (res.error) {
                toast.error(res.error);
            } else {
                setIsPaymentOpen(false);
                qc.invalidateQueries({ queryKey: ["invoice", id] });
                qc.invalidateQueries({ queryKey: ["invoices"] });
                qc.invalidateQueries({ queryKey: ["invoice-summary"] });
                toast.success("Payment recorded successfully.");
            }
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deletePaymentMut = useMutation({
        mutationFn: (paymentId: string) => softDeletePayment(paymentId, id),
        onSuccess: (res) => {
            if (res.error) {
                toast.error(res.error);
            } else {
                qc.invalidateQueries({ queryKey: ["invoice", id] });
                qc.invalidateQueries({ queryKey: ["invoices"] });
                qc.invalidateQueries({ queryKey: ["invoice-summary"] });
                toast.success("Payment deleted successfully.");
            }
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) {
        return (
            <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!inv) {
        return (
            <div className="flex h-60 flex-col items-center justify-center gap-3 opacity-50">
                <FileText className="h-10 w-10" />
                <p className="font-bold">Invoice not found.</p>
                <Link href="/admin/invoices"><Button variant="outline" size="sm">Back to Invoices</Button></Link>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
        >
            {/* ── Top bar ───────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/admin/invoices">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <p className="text-xs font-black text-primary uppercase tracking-widest">
                            {inv.invoice_number}
                        </p>
                        <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                            {inv.client_name}
                        </p>
                    </div>
                    <InvoiceStatusBadge status={inv.payment_status} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Add Payment Action */}
                    {inv.payment_status !== "paid" && inv.payment_status !== "cancelled" && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setIsPaymentOpen(true)}
                            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-sm"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add Payment
                        </Button>
                    )}

                    {/* Status actions */}
                    {inv.payment_status !== "paid" && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate("paid")}
                            className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-black text-xs uppercase tracking-widest"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                        </Button>
                    )}
                    {inv.payment_status === "paid" && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate("pending")}
                            className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 font-black text-xs uppercase tracking-widest"
                        >
                            <Clock className="h-3.5 w-3.5" /> Revert to Pending
                        </Button>
                    )}
                    {inv.payment_status !== "cancelled" && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate("cancelled")}
                            className="gap-1.5 text-zinc-500 font-black text-xs uppercase tracking-widest"
                        >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                        </Button>
                    )}

                    {/* PDF / Print */}
                    <Link href={`/admin/invoices/${id}/print`} target="_blank">
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-1.5 font-black text-xs uppercase tracking-widest shadow-sm"
                        >
                            <Printer className="h-3.5 w-3.5" /> Download PDF
                        </Button>
                    </Link>

                    {/* Delete */}
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteMut.isPending}
                        onClick={() => {
                            if (confirm("Delete this invoice? This cannot be undone.")) {
                                deleteMut.mutate();
                            }
                        }}
                        className="h-8 w-8 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: Invoice info ─────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Client Card */}
                    <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-black">
                                <User className="h-4 w-4 text-primary" /> Billed To
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <p className="font-black text-zinc-900 dark:text-zinc-100">{inv.client_name}</p>
                            {inv.client_company && (
                                <p className="text-sm font-bold text-muted-foreground">{inv.client_company}</p>
                            )}
                            {inv.client_email && (
                                <p className="text-sm text-muted-foreground">{inv.client_email}</p>
                            )}
                            {inv.client_phone && (
                                <p className="text-sm text-muted-foreground">{inv.client_phone}</p>
                            )}
                            {inv.client_address && (
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{inv.client_address}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <CardTitle className="flex items-center gap-2 text-sm font-black">
                                <Package className="h-4 w-4 text-primary" /> Line Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Item</th>
                                        <th className="px-5 py-3 text-right">Qty</th>
                                        <th className="px-5 py-3 text-right">Unit Price</th>
                                        <th className="px-5 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {(inv.invoice_items ?? []).map((item: InvoiceItem) => (
                                        <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.item_name}</p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right font-bold tabular-nums">{item.quantity}</td>
                                            <td className="px-5 py-3.5 text-right font-bold tabular-nums">{fmt(item.unit_price)}</td>
                                            <td className="px-5 py-3.5 text-right font-black tabular-nums">{fmt(item.total_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                                <div className="space-y-2 min-w-[220px]">
                                    <div className="flex justify-between text-sm text-muted-foreground font-medium">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums">{fmt(inv.subtotal)}</span>
                                    </div>
                                    {Number(inv.discount_amount) > 0 && (
                                        <div className="flex justify-between text-sm text-muted-foreground font-medium">
                                            <span>Discount</span>
                                            <span className="tabular-nums text-red-500">− {fmt(inv.discount_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-black border-t border-zinc-200 dark:border-zinc-700 pt-2">
                                        <span>Total</span>
                                        <span className="tabular-nums text-primary">{fmt(inv.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span>Paid Amount</span>
                                        <span className="tabular-nums">{fmt(inv.paid_amount ?? 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2 text-zinc-900 dark:text-zinc-100">
                                        <span>Balance Due</span>
                                        <span className="tabular-nums">{fmt(inv.balance_due ?? inv.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment History */}
                    {activePayments.length > 0 && (
                        <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl overflow-hidden">
                            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <CardTitle className="flex items-center gap-2 text-sm font-black">
                                    <Receipt className="h-4 w-4 text-primary" /> Payment History
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                                        <tr>
                                            <th className="px-5 py-3 text-left">Date</th>
                                            <th className="px-5 py-3 text-left">Method</th>
                                            <th className="px-5 py-3 text-left">Reference / Notes</th>
                                            <th className="px-5 py-3 text-right">Amount</th>
                                            <th className="px-5 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {activePayments.map((pm) => (
                                            <tr key={pm.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                                <td className="px-5 py-3.5 font-bold">
                                                    {format(new Date(pm.payment_date), "dd MMM yyyy")}
                                                </td>
                                                <td className="px-5 py-3.5 capitalize font-medium">
                                                    {pm.payment_method.replace('_', ' ')}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-muted-foreground">
                                                    {pm.transaction_reference && (
                                                        <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
                                                            Ref: {pm.transaction_reference}
                                                        </span>
                                                    )}
                                                    {pm.notes && <span>{pm.notes}</span>}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                                    {fmt(pm.amount_paid)}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={deletePaymentMut.isPending}
                                                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                                        onClick={() => {
                                                            if (confirm("Delete this payment? This will update the invoice balance.")) {
                                                                deletePaymentMut.mutate(pm.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes */}
                    {inv.notes && (
                        <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-black">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-line font-medium">{inv.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Right: Meta info ────────────────────────────── */}
                <div className="space-y-5">
                    <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-black">
                                <FileText className="h-4 w-4 text-primary" /> Invoice Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InfoRow label="Invoice #" value={inv.invoice_number} highlight />
                            <InfoRow label="Service" value={inv.service_name} />
                            {inv.description && <InfoRow label="Description" value={inv.description} />}
                            <InfoRow label="Invoice Date" value={format(new Date(inv.invoice_date), "dd MMM yyyy")} />
                            {inv.due_date && (
                                <InfoRow label="Due Date" value={format(new Date(inv.due_date), "dd MMM yyyy")} />
                            )}
                            {inv.payment_method && (
                                <InfoRow label="Payment Method" value={inv.payment_method} />
                            )}
                            {inv.payment_date && (
                                <InfoRow
                                    label="Paid On"
                                    value={format(new Date(inv.payment_date), "dd MMM yyyy")}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-black">
                                <CalendarDays className="h-4 w-4 text-primary" /> Audit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InfoRow label="Created" value={format(new Date(inv.created_at), "dd MMM yyyy, HH:mm")} />
                            <InfoRow label="Updated" value={format(new Date(inv.updated_at), "dd MMM yyyy, HH:mm")} />
                            {(inv.creator as { full_name?: string } | null)?.full_name && (
                                <InfoRow label="Created By" value={(inv.creator as { full_name: string }).full_name} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Payment Dialog */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black">
                            <Receipt className="h-5 w-5 text-primary" /> Record Payment
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const amt = Number(amount);
                        const currentBalance = inv.balance_due ?? inv.total_amount;
                        if (isNaN(amt) || amt <= 0) {
                            toast.error("Please enter a valid amount greater than zero.");
                            return;
                        }
                        if (amt > Number(currentBalance)) {
                            toast.error(`Amount cannot exceed the remaining balance of ${fmt(currentBalance)}.`);
                            return;
                        }
                        addPaymentMut.mutate();
                    }} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Amount Paid (₹)
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="font-bold tabular-nums"
                                required
                            />
                            <p className="text-[10px] text-muted-foreground font-semibold">
                                Remaining Balance: {fmt(inv.balance_due ?? inv.total_amount)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment_date" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Payment Date
                            </Label>
                            <Input
                                id="payment_date"
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment_method" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Payment Method
                            </Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reference" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Reference Number (Optional)
                            </Label>
                            <Input
                                id="reference"
                                placeholder="e.g. TXN-123456, Check #"
                                value={ref}
                                onChange={(e) => setRef(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Notes (Optional)
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional details..."
                                value={pmNotes}
                                onChange={(e) => setPmNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsPaymentOpen(false)}
                                className="font-bold text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={addPaymentMut.isPending}
                                className="font-black text-xs uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {addPaymentMut.isPending ? "Saving..." : "Record Payment"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex-shrink-0">
                {label}
            </span>
            <span className={`text-xs font-bold text-right ${highlight ? "text-primary" : "text-zinc-900 dark:text-zinc-100"}`}>
                {value}
            </span>
        </div>
    );
}
