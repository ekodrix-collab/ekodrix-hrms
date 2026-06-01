// types/invoice.ts
// Invoice module type definitions — EKODRIX HRMS

export type InvoiceStatus = 'paid' | 'pending' | 'partially_paid' | 'cancelled';

// ── Payment row shape ──────────────────────────────────────────
export interface Payment {
    id: string;
    invoice_id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    transaction_reference: string | null;
    notes: string | null;
    created_by: string;
    is_active: boolean;
    created_at: string;
    creator?: {
        full_name: string;
        avatar_url: string | null;
        email: string;
    } | null;
}

// ── DB row shapes ──────────────────────────────────────────────
export interface InvoiceItem {
    id: string;
    invoice_id: string;
    item_name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    sort_order: number;
    created_at: string;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;

    // Client info
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    client_address: string | null;
    client_company: string | null;

    // Service
    service_name: string;
    description: string | null;

    // Financials
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
    balance_due: number;

    // Payment
    payment_status: InvoiceStatus;
    payment_date: string | null;
    payment_method: string | null;

    // Meta
    notes: string | null;
    organization_id: string | null;
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Joined relations (optional — returned from queries)
    invoice_items?: InvoiceItem[];
    payments?: Payment[];
    creator?: {
        full_name: string;
        avatar_url: string | null;
        email: string;
    } | null;
}

// ── Form / DTO types ───────────────────────────────────────────
export interface InvoiceItemInput {
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
}

export interface CreateInvoiceInput {
    invoice_date: string;
    due_date?: string;

    client_name: string;
    client_email?: string;
    client_phone?: string;
    client_address?: string;
    client_company?: string;

    service_name: string;
    description?: string;

    discount_amount?: number;
    payment_method?: string;
    notes?: string;

    items: InvoiceItemInput[];
}

export interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
    payment_status?: InvoiceStatus;
    payment_date?: string;
}

// ── Filter / list types ────────────────────────────────────────
export interface InvoiceFilters {
    search?: string;
    status?: InvoiceStatus | 'all';
    from?: string;
    to?: string;
}

export interface InvoiceListItem extends Omit<Invoice, 'invoice_items' | 'creator'> {
    creator_name?: string | null;
}

// ── Summary stats ──────────────────────────────────────────────
export interface InvoiceSummary {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    totalRevenue: number;
    pendingRevenue: number;
}

// ── Payment Inputs ─────────────────────────────────────────────
export interface CreatePaymentInput {
    invoice_id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    transaction_reference?: string;
    notes?: string;
}

