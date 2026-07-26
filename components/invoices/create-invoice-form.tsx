"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createInvoice } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, User, FileText, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ── Validation schema ──────────────────────────────────────────
const itemSchema = z.object({
    item_name: z.string().min(1, "Item name is required"),
    description: z.string().optional(),
    quantity: z.coerce.number().positive("Must be > 0"),
    unit_price: z.coerce.number().min(0, "Must be ≥ 0"),
});

const formSchema = z.object({
    invoice_date: z.string().min(1, "Invoice date is required"),
    due_date: z.string().optional(),
    client_name: z.string().min(1, "Client name is required"),
    client_email: z.string().email("Invalid email").optional().or(z.literal("")),
    client_phone: z.string().optional(),
    client_address: z.string().optional(),
    client_company: z.string().optional(),
    service_name: z.string().min(1, "Service name is required"),
    description: z.string().optional(),
    discount_amount: z.coerce.number().min(0).optional(),
    payment_method: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(itemSchema).min(1, "Add at least one item"),
});

type FormValues = z.infer<typeof formSchema>;

const today = new Date().toISOString().split("T")[0];

const CURRENCY = "₹";

function fmt(n: number) {
    return `${CURRENCY}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

interface CreateInvoiceFormProps {
    onSuccess?: (id: string) => void;
}

export function CreateInvoiceForm({ onSuccess }: CreateInvoiceFormProps) {
    const router = useRouter();
    const qc = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            invoice_date: today,
            discount_amount: 0,
            items: [{ item_name: "", description: "", quantity: 1, unit_price: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    const items = watch("items");
    const discount = watch("discount_amount") ?? 0;
    const subtotal = items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
    );
    const total = Math.max(0, subtotal - Number(discount));

    const onSubmit = async (values: FormValues) => {
        const result = await createInvoice({
            ...values,
            due_date: values.due_date ? values.due_date : undefined,
            client_email: values.client_email || undefined,
            items: values.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
            })),
        });

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success(`Invoice ${result.invoiceNumber} created!`);
        qc.invalidateQueries({ queryKey: ["invoices"] });
        qc.invalidateQueries({ queryKey: ["invoice-summary"] });

        if (onSuccess && result.invoiceId) {
            onSuccess(result.invoiceId);
        } else if (result.invoiceId) {
            router.push(`/admin/invoices/${result.invoiceId}`);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* ── Client Info ──────────────────────────────────── */}
            <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-black">
                        <User className="h-4 w-4 text-primary" />
                        Client Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="client_name" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Client Name <span className="text-red-500">*</span>
                        </Label>
                        <Input id="client_name" placeholder="John Doe" {...register("client_name")} />
                        {errors.client_name && (
                            <p className="text-[11px] text-red-500 font-bold">{errors.client_name.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="client_company" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Company / Organization
                        </Label>
                        <Input id="client_company" placeholder="Acme Corp" {...register("client_company")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="client_email" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Email
                        </Label>
                        <Input id="client_email" type="email" placeholder="client@email.com" {...register("client_email")} />
                        {errors.client_email && (
                            <p className="text-[11px] text-red-500 font-bold">{errors.client_email.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="client_phone" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Phone
                        </Label>
                        <Input id="client_phone" placeholder="+91 9876543210" {...register("client_phone")} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="client_address" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Address
                        </Label>
                        <Input id="client_address" placeholder="123 Main Street, City, State, PIN" {...register("client_address")} />
                    </div>
                </CardContent>
            </Card>

            {/* ── Invoice Details ───────────────────────────────── */}
            <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-black">
                        <FileText className="h-4 w-4 text-primary" />
                        Invoice Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="invoice_date" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Invoice Date <span className="text-red-500">*</span>
                        </Label>
                        <Input id="invoice_date" type="date" {...register("invoice_date")} />
                        {errors.invoice_date && (
                            <p className="text-[11px] text-red-500 font-bold">{errors.invoice_date.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="due_date" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Due Date
                        </Label>
                        <Input id="due_date" type="date" {...register("due_date")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="service_name" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Service Name <span className="text-red-500">*</span>
                        </Label>
                        <Input id="service_name" placeholder="e.g. Web Development" {...register("service_name")} />
                        {errors.service_name && (
                            <p className="text-[11px] text-red-500 font-bold">{errors.service_name.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="payment_method" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Payment Method
                        </Label>
                        <Controller
                            control={control}
                            name="payment_method"
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                >
                                    <SelectTrigger id="payment_method" className="w-full">
                                        <SelectValue placeholder="Select Payment Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Service Description
                        </Label>
                        <Input id="description" placeholder="Brief description of services rendered" {...register("description")} />
                    </div>
                </CardContent>
            </Card>

            {/* ── Line Items ────────────────────────────────────── */}
            <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base font-black">
                            <Package className="h-4 w-4 text-primary" />
                            Line Items
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ item_name: "", description: "", quantity: 1, unit_price: 0 })}
                            className="gap-1.5 text-xs font-black uppercase tracking-widest"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add Item
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-1">
                        {["Item Name", "Description", "Qty", "Unit Price", ""].map((h) => (
                            <span key={h} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {h}
                            </span>
                        ))}
                    </div>

                    <AnimatePresence>
                        {fields.map((field, index) => {
                            const qty = Number(watch(`items.${index}.quantity`)) || 0;
                            const price = Number(watch(`items.${index}.unit_price`)) || 0;
                            const lineTotal = qty * price;

                            return (
                                <motion.div
                                    key={field.id}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800"
                                >
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase md:hidden text-muted-foreground">Item</Label>
                                        <Input
                                            placeholder="Item name"
                                            {...register(`items.${index}.item_name`)}
                                            className="h-9 text-sm"
                                        />
                                        {errors.items?.[index]?.item_name && (
                                            <p className="text-[11px] text-red-500 font-bold">{errors.items[index]?.item_name?.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase md:hidden text-muted-foreground">Description</Label>
                                        <Input
                                            placeholder="Optional description"
                                            {...register(`items.${index}.description`)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase md:hidden text-muted-foreground">Qty</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="1"
                                            {...register(`items.${index}.quantity`)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase md:hidden text-muted-foreground">Unit Price</Label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                                {CURRENCY}
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                {...register(`items.${index}.unit_price`)}
                                                className="h-9 pl-6 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-3">
                                        <span className="text-sm font-black tabular-nums text-zinc-900 dark:text-zinc-100 md:min-w-[80px] md:text-right">
                                            {fmt(lineTotal)}
                                        </span>
                                        {fields.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {errors.items?.root && (
                        <p className="text-[11px] text-red-500 font-bold">{errors.items.root.message}</p>
                    )}

                    {/* Totals */}
                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                        <div className="space-y-2 min-w-[240px]">
                            <div className="flex justify-between text-sm font-medium text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="font-bold tabular-nums">{fmt(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <Label htmlFor="discount_amount" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                    Discount
                                </Label>
                                <div className="relative w-32">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                        {CURRENCY}
                                    </span>
                                    <Input
                                        id="discount_amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        {...register("discount_amount")}
                                        className="h-8 pl-6 text-sm text-right"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-base font-black border-t border-zinc-200 dark:border-zinc-700 pt-2">
                                <span>Total</span>
                                <span className="tabular-nums text-primary">{fmt(total)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Notes ─────────────────────────────────────────── */}
            <Card className="border-none shadow-lg bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
                <CardContent className="pt-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Notes / Terms
                        </Label>
                        <textarea
                            id="notes"
                            {...register("notes")}
                            rows={3}
                            placeholder="Payment terms, thank you note, bank details…"
                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── Submit ────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-[160px] font-black uppercase tracking-widest"
                >
                    {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating…</>
                    ) : (
                        "Create Invoice"
                    )}
                </Button>
            </div>
        </form>
    );
}
