"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type {
    CreateInvoiceInput,
    UpdateInvoiceInput,
    Invoice,
    InvoiceFilters,
    InvoiceSummary,
    CreatePaymentInput,
} from "@/types/invoice";

// ── Helpers ────────────────────────────────────────────────────

function assertAdmin(role: string | null | undefined): role is "admin" {
    return role === "admin";
}

/** Generate invoice number client-side as fallback (DB function is preferred) */
function buildInvoiceNumber(existingNumbers: string[]): string {
    const year = new Date().getFullYear().toString();
    const prefix = `INV-${year}-`;
    const used = existingNumbers
        .filter((n) => n?.startsWith(prefix))
        .map((n) => parseInt(n.split("-")[2] ?? "0", 10))
        .filter((n) => !isNaN(n));
    const next = used.length > 0 ? Math.max(...used) + 1 : 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
}

function calcItemTotal(qty: number, price: number): number {
    return Math.round(qty * price * 100) / 100;
}

// ── CREATE INVOICE ─────────────────────────────────────────────

export async function createInvoice(input: CreateInvoiceInput) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();

    if (!user || !assertAdmin(role)) {
        return { error: "Unauthorized: Admin access required." };
    }

    if (!input.items || input.items.length === 0) {
        return { error: "At least one invoice item is required." };
    }

    // Generate invoice number via DB function
    let invoiceNumber: string;
    const { data: numData, error: numError } = await supabase
        .rpc("generate_invoice_number");

    if (numError || !numData) {
        // Fallback: generate client-side
        const { data: existingNums } = await supabase
            .from("invoices")
            .select("invoice_number")
            .eq("is_active", true);
        invoiceNumber = buildInvoiceNumber(
            (existingNums ?? []).map((r: { invoice_number: string }) => r.invoice_number)
        );
    } else {
        invoiceNumber = numData as string;
    }

    // Calculate totals
    const items = input.items.map((item, i) => ({
        ...item,
        total_price: calcItemTotal(item.quantity, item.unit_price),
        sort_order: i,
    }));
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = input.discount_amount ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
            invoice_number: invoiceNumber,
            invoice_date: input.invoice_date,
            due_date: input.due_date || null,
            client_name: input.client_name,
            client_email: input.client_email ?? null,
            client_phone: input.client_phone ?? null,
            client_address: input.client_address ?? null,
            client_company: input.client_company ?? null,
            service_name: input.service_name,
            description: input.description ?? null,
            subtotal,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            paid_amount: 0.00,
            balance_due: totalAmount,
            payment_status: "pending",
            payment_method: input.payment_method ?? null,
            notes: input.notes ?? null,
            organization_id: organizationId ?? null,
            created_by: user.id,
            is_active: true,
        })
        .select("id, invoice_number")
        .single();

    if (invoiceError || !invoice) {
        return { error: invoiceError?.message ?? "Failed to create invoice." };
    }

    // Insert line items
    const { error: itemsError } = await supabase.from("invoice_items").insert(
        items.map((item) => ({
            invoice_id: invoice.id,
            item_name: item.item_name,
            description: item.description ?? null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            sort_order: item.sort_order,
        }))
    );

    if (itemsError) {
        // Rollback invoice if items failed
        await supabase.from("invoices").delete().eq("id", invoice.id);
        return { error: itemsError.message };
    }

    revalidatePath("/admin/invoices");
    return { success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
}

// ── GET INVOICES (list) ────────────────────────────────────────

export async function getInvoices(filters?: InvoiceFilters) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized.", data: [] };
    }

    let query = supabase
        .from("invoices")
        .select(
            `id, invoice_number, invoice_date, due_date,
             client_name, client_email, client_company,
             service_name, subtotal, discount_amount, total_amount,
             paid_amount, balance_due,
             payment_status, payment_date, payment_method,
             is_active, created_at, updated_at, created_by,
             creator:profiles!created_by(full_name, avatar_url, email)`
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    // Filters
    if (filters?.status && filters.status !== "all") {
        query = query.eq("payment_status", filters.status);
    }
    if (filters?.from) {
        query = query.gte("invoice_date", filters.from);
    }
    if (filters?.to) {
        query = query.lte("invoice_date", filters.to);
    }
    if (filters?.search) {
        query = query.or(
            `invoice_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,service_name.ilike.%${filters.search}%`
        );
    }

    const { data, error } = await query;

    if (error) return { error: error.message, data: [] };

    return {
        data: (data ?? []) as unknown as Invoice[],
        error: null,
    };
}

// ── GET SINGLE INVOICE (with items) ───────────────────────────

export async function getInvoiceById(id: string) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized.", data: null };
    }

    const { data, error } = await supabase
        .from("invoices")
        .select(
            `*, 
             invoice_items(*),
             payments(*, creator:profiles!created_by(full_name)),
             creator:profiles!created_by(full_name, avatar_url, email)`
        )
        .eq("id", id)
        .eq("is_active", true)
        .eq("payments.is_active", true)
        .order("sort_order", { referencedTable: "invoice_items", ascending: true })
        .order("created_at", { referencedTable: "payments", ascending: false })
        .single();

    if (error || !data) {
        return { error: error?.message ?? "Invoice not found.", data: null };
    }

    return { data: data as unknown as Invoice, error: null };
}

// ── GET INVOICE FOR PRINT (no auth restriction — ID is secret) ─

export async function getInvoiceForPrint(id: string) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized.", data: null };
    }

    const { data, error } = await supabase
        .from("invoices")
        .select(
            `*, 
             invoice_items(*),
             payments(*),
             creator:profiles!created_by(full_name, email)`
        )
        .eq("id", id)
        .eq("payments.is_active", true)
        .order("sort_order", { referencedTable: "invoice_items", ascending: true })
        .order("created_at", { referencedTable: "payments", ascending: false })
        .single();

    if (error || !data) {
        return { error: error?.message ?? "Invoice not found.", data: null };
    }

    // Also fetch company settings for the PDF header
    const { data: settings } = await supabase
        .from("company_settings")
        .select("company_name, currency_symbol")
        .single();

    return {
        data: data as unknown as Invoice,
        companyName: settings?.company_name ?? "Ekodrix",
        currencySymbol: settings?.currency_symbol ?? "₹",
        error: null,
    };
}

// ── UPDATE INVOICE STATUS ──────────────────────────────────────

export async function updateInvoiceStatus(
    id: string,
    status: "paid" | "pending" | "partially_paid" | "cancelled",
    paymentDate?: string
) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized." };
    }

    // Fetch the invoice to get its total_amount
    const { data: invoice } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("id", id)
        .single();

    if (!invoice) {
        return { error: "Invoice not found." };
    }

    const totalAmount = Number(invoice.total_amount);
    let paidAmount = 0;

    if (status === "paid") {
        paidAmount = totalAmount;
    } else if (status === "pending" || status === "partially_paid" || status === "cancelled") {
        // Sum up actual active payments
        const { data: payments } = await supabase
            .from("payments")
            .select("amount_paid")
            .eq("invoice_id", id)
            .eq("is_active", true);
        
        paidAmount = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
    }

    const balanceDue = Math.max(0, totalAmount - paidAmount);

    const { error } = await supabase
        .from("invoices")
        .update({
            payment_status: status,
            payment_date: status === "paid" ? (paymentDate ?? new Date().toISOString().split("T")[0]) : null,
            paid_amount: paidAmount,
            balance_due: balanceDue,
        })
        .eq("id", id)
        .eq("is_active", true);

    if (error) return { error: error.message };

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
    return { success: true };
}

// ── UPDATE INVOICE (edit) ──────────────────────────────────────

export async function updateInvoice(id: string, input: UpdateInvoiceInput) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized." };
    }

    // Guard: do not allow editing PAID invoices
    const { data: existing } = await supabase
        .from("invoices")
        .select("payment_status, paid_amount")
        .eq("id", id)
        .single();

    if (existing?.payment_status === "paid") {
        return { error: "Cannot edit a PAID invoice. Change status first." };
    }

    // Recalculate if items provided
    const updates: Record<string, unknown> = {};

    if (input.invoice_date) updates.invoice_date = input.invoice_date;
    if (input.due_date !== undefined) updates.due_date = input.due_date || null;
    if (input.client_name) updates.client_name = input.client_name;
    if (input.client_email !== undefined) updates.client_email = input.client_email ?? null;
    if (input.client_phone !== undefined) updates.client_phone = input.client_phone ?? null;
    if (input.client_address !== undefined) updates.client_address = input.client_address ?? null;
    if (input.client_company !== undefined) updates.client_company = input.client_company ?? null;
    if (input.service_name) updates.service_name = input.service_name;
    if (input.description !== undefined) updates.description = input.description ?? null;
    if (input.notes !== undefined) updates.notes = input.notes ?? null;
    if (input.payment_method !== undefined) updates.payment_method = input.payment_method ?? null;

    if (input.items && input.items.length > 0) {
        const items = input.items.map((item, i) => ({
            ...item,
            total_price: calcItemTotal(item.quantity, item.unit_price),
            sort_order: i,
        }));
        const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
        const discountAmount = input.discount_amount ?? 0;
        const totalAmount = Math.max(0, subtotal - discountAmount);
        updates.subtotal = subtotal;
        updates.discount_amount = discountAmount;
        updates.total_amount = totalAmount;

        const paidAmount = Number(existing?.paid_amount) || 0;
        updates.balance_due = Math.max(0, totalAmount - paidAmount);

        // Replace items
        await supabase.from("invoice_items").delete().eq("invoice_id", id);
        await supabase.from("invoice_items").insert(
            items.map((item) => ({
                invoice_id: id,
                item_name: item.item_name,
                description: item.description ?? null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                sort_order: item.sort_order,
            }))
        );
    }

    const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .eq("is_active", true);

    if (error) return { error: error.message };

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
    return { success: true };
}

// ── SOFT DELETE INVOICE ────────────────────────────────────────

export async function softDeleteInvoice(id: string) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized." };
    }

    const { error } = await supabase
        .from("invoices")
        .update({ is_active: false })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/invoices");
    return { success: true };
}

// ── INVOICE SUMMARY STATS ──────────────────────────────────────

export async function getInvoiceSummary(): Promise<InvoiceSummary> {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    const empty: InvoiceSummary = {
        total: 0, paid: 0, pending: 0, cancelled: 0,
        totalRevenue: 0, pendingRevenue: 0,
    };

    if (!assertAdmin(role)) return empty;

    const { data } = await supabase
        .from("invoices")
        .select("payment_status, total_amount, paid_amount, balance_due")
        .eq("is_active", true);

    if (!data) return empty;

    return data.reduce<InvoiceSummary>((acc, row) => {
        acc.total += 1;
        const paid = Number(row.paid_amount) || 0;
        const balance = Number(row.balance_due) || 0;

        if (row.payment_status === "paid") {
            acc.paid += 1;
        } else if (row.payment_status === "pending" || row.payment_status === "partially_paid") {
            acc.pending += 1;
        } else if (row.payment_status === "cancelled") {
            acc.cancelled += 1;
        }

        if (row.payment_status !== "cancelled") {
            acc.totalRevenue += paid;
            acc.pendingRevenue += balance;
        }

        return acc;
    }, { ...empty });
}

// ── ADD PAYMENT ───────────────────────────────────────────────

export async function addPayment(input: CreatePaymentInput) {
    const supabase = createSupabaseServerClient();
    const { user, role } = await getOrgContext();

    if (!user || !assertAdmin(role)) {
        return { error: "Unauthorized: Admin access required." };
    }

    if (input.amount_paid <= 0) {
        return { error: "Payment amount must be greater than zero." };
    }

    // 1. Fetch current invoice totals & status to validate
    const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount, balance_due, payment_status")
        .eq("id", input.invoice_id)
        .eq("is_active", true)
        .single();

    if (invoiceError || !invoice) {
        return { error: invoiceError?.message ?? "Invoice not found." };
    }

    if (invoice.payment_status === "paid") {
        return { error: "Cannot add payment to a fully PAID invoice." };
    }

    if (invoice.payment_status === "cancelled") {
        return { error: "Cannot add payment to a CANCELLED invoice." };
    }

    // 2. Prevent overpayment / negative balance
    const remainingBalance = Number(invoice.balance_due);
    if (input.amount_paid > remainingBalance) {
        return { error: `Overpayment not allowed. Maximum accepted payment is ₹${remainingBalance.toFixed(2)}.` };
    }

    // 3. Insert payment row
    const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
            invoice_id: input.invoice_id,
            amount_paid: input.amount_paid,
            payment_date: input.payment_date,
            payment_method: input.payment_method,
            transaction_reference: input.transaction_reference ?? null,
            notes: input.notes ?? null,
            created_by: user.id,
            is_active: true
        })
        .select()
        .single();

    if (paymentError) {
        return { error: paymentError.message };
    }

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${input.invoice_id}`);
    return { success: true, payment };
}

// ── SOFT DELETE PAYMENT ────────────────────────────────────────

export async function softDeletePayment(id: string, invoiceId: string) {
    const supabase = createSupabaseServerClient();
    const { role } = await getOrgContext();

    if (!assertAdmin(role)) {
        return { error: "Unauthorized: Admin access required." };
    }

    // Check if the parent invoice is paid and protect it
    const { data: invoice } = await supabase
        .from("invoices")
        .select("payment_status")
        .eq("id", invoiceId)
        .single();

    if (invoice?.payment_status === "paid") {
        return { error: "Cannot delete payments from a fully PAID invoice. Revert or change status first." };
    }

    const { error } = await supabase
        .from("payments")
        .update({ is_active: false })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${invoiceId}`);
    return { success: true };
}
