import { getInvoiceForPrint } from "@/actions/invoices";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import PrintTrigger from "./print-trigger";
import { PrintButtons } from "./print-buttons";
import type { InvoiceItem } from "@/types/invoice";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Invoice PDF | Ekodrix HRMS",
};

interface PrintPageProps {
    params: { id: string };
}

export default async function InvoicePrintPage({ params }: PrintPageProps) {
    const result = await getInvoiceForPrint(params.id);
    const { data: inv, companyName, currencySymbol, error } = result;

    if (error || !inv) notFound();

    const currency = currencySymbol ?? "₹";
    const fmt = (n: number) =>
        `${currency}${Number(n).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const statusColor =
        inv.payment_status === "paid"
            ? "#059669"
            : inv.payment_status === "partially_paid"
            ? "#0284c7"
            : inv.payment_status === "cancelled"
            ? "#dc2626"
            : "#d97706";

    const statusLabel = inv.payment_status.replace("_", " ").toUpperCase();

    let reminderMessage = "Thank you for your business.";
    if (inv.payment_status === "paid") {
        reminderMessage = "Invoice fully paid. Thank you for your business.";
    } else if (inv.payment_status === "partially_paid") {
        reminderMessage = inv.due_date
            ? "Remaining balance payment is pending. Please complete the balance payment before the due date."
            : "Remaining balance payment is pending. Please complete the balance payment.";
    } else if (inv.payment_status === "pending") {
        reminderMessage = inv.due_date
            ? "Thank you for your business. Please make payment by the due date."
            : "Payment is pending for this invoice.";
    }

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Invoice {inv.invoice_number}</title>
                <style>{`
                    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: #f0f4f8;
                        color: #1a1a2e;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .page-wrapper {
                        min-height: 100vh;
                        display: flex;
                        align-items: flex-start;
                        justify-content: center;
                        padding: 40px 20px;
                        background: #f0f4f8;
                    }

                    .invoice-doc {
                        width: 794px;
                        background: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.12);
                    }

                    .invoice-header {
                        background: #ffffff;
                        color: #1e293b;
                        padding: 44px 48px 36px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 24px;
                        border-bottom: 2px solid #e8ecf0;
                    }

                    .company-name {
                        font-size: 28px;
                        font-weight: 900;
                        letter-spacing: -0.5px;
                        color: #10b981;
                        line-height: 1.1;
                    }

                    .company-tagline {
                        font-size: 10px;
                        font-weight: 700;
                        letter-spacing: 0.18em;
                        text-transform: uppercase;
                        color: #047857;
                        margin-top: 6px;
                    }

                    .invoice-title {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 8px;
                    }

                    .invoice-title h1 {
                        font-size: 18px;
                        font-weight: 900;
                        letter-spacing: 0.08em;
                        color: #ffffff;
                        background: #10b981;
                        text-transform: uppercase;
                        padding: 6px 20px;
                        border-radius: 6px;
                        display: inline-block;
                        line-height: 1.2;
                        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
                    }

                    .invoice-number-badge {
                        display: inline-block;
                        background: #312e81;
                        border: 1.5px solid #4338ca;
                        border-radius: 6px;
                        padding: 5px 14px;
                        font-size: 12px;
                        font-weight: 900;
                        letter-spacing: 0.05em;
                        color: #ffffff;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    }

                    .meta-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        border-bottom: 1.5px solid #e8ecf0;
                    }

                    .meta-cell {
                        padding: 20px 24px;
                        border-right: 1.5px solid #e8ecf0;
                    }
                    .meta-cell:last-child { border-right: none; }

                    .meta-label {
                        font-size: 9px;
                        font-weight: 900;
                        letter-spacing: 0.2em;
                        text-transform: uppercase;
                        color: #94a3b8;
                        margin-bottom: 5px;
                    }

                    .meta-value {
                        font-size: 13px;
                        font-weight: 800;
                        color: #1e293b;
                    }

                    .status-pill {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: 900;
                        letter-spacing: 0.12em;
                        text-transform: uppercase;
                        background: ${statusColor}20;
                        color: ${statusColor};
                        border: 1.5px solid ${statusColor}50;
                    }

                    .billing-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        padding: 28px 48px;
                        border-bottom: 1.5px solid #e8ecf0;
                        background: #fafbfc;
                    }

                    .billing-block:first-child { padding-right: 24px; }
                    .billing-block:last-child { padding-left: 24px; border-left: 1.5px solid #e8ecf0; }

                    .section-label {
                        font-size: 9px;
                        font-weight: 900;
                        letter-spacing: 0.22em;
                        text-transform: uppercase;
                        color: #94a3b8;
                        margin-bottom: 10px;
                    }

                    .billing-name {
                        font-size: 16px;
                        font-weight: 900;
                        color: #0f172a;
                        margin-bottom: 3px;
                    }

                    .billing-sub {
                        font-size: 12px;
                        font-weight: 600;
                        color: #64748b;
                        line-height: 1.6;
                    }

                    .items-section { padding: 0 48px; }

                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 28px;
                    }

                    .items-table thead tr { background: #064e3b; }

                    .items-table thead th {
                        padding: 12px 16px;
                        text-align: left;
                        font-size: 9px;
                        font-weight: 900;
                        letter-spacing: 0.18em;
                        text-transform: uppercase;
                        color: rgba(255,255,255,0.8);
                    }

                    .items-table thead th:nth-child(2),
                    .items-table thead th:nth-child(3),
                    .items-table thead th:last-child { text-align: right; }

                    .items-table tbody tr { border-bottom: 1px solid #f1f5f9; }
                    .items-table tbody tr:last-child { border-bottom: none; }
                    .items-table tbody tr:nth-child(even) { background: #f8fafc; }

                    .items-table tbody td {
                        padding: 14px 16px;
                        font-size: 13px;
                        font-weight: 600;
                        color: #1e293b;
                        vertical-align: top;
                    }

                    .items-table tbody td:nth-child(2),
                    .items-table tbody td:nth-child(3) { text-align: right; }

                    .items-table tbody td:last-child {
                        text-align: right;
                        font-weight: 800;
                    }

                    .item-desc {
                        font-size: 11px;
                        color: #94a3b8;
                        font-weight: 500;
                        margin-top: 2px;
                    }

                    .totals-section {
                        margin: 20px 48px 0;
                        padding: 20px 0;
                        border-top: 2px solid #e2e8f0;
                        display: flex;
                        justify-content: flex-end;
                    }

                    .totals-table { width: 260px; }

                    .totals-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        font-size: 13px;
                    }

                    .totals-row.subtotal { color: #64748b; font-weight: 600; }
                    .totals-row.discount { color: #dc2626; font-weight: 600; }

                    .totals-row.grand-total {
                        margin-top: 10px;
                        padding-top: 12px;
                        border-top: 2px solid #064e3b;
                        font-size: 18px;
                        font-weight: 900;
                        color: #064e3b;
                    }

                    .notes-section {
                        margin: 20px 48px 0;
                        padding: 18px 20px;
                        background: #f8fafc;
                        border-radius: 10px;
                        border-left: 4px solid #10b981;
                    }

                    .notes-title {
                        font-size: 9px;
                        font-weight: 900;
                        letter-spacing: 0.2em;
                        text-transform: uppercase;
                        color: #64748b;
                        margin-bottom: 6px;
                    }

                    .notes-text {
                        font-size: 12px;
                        color: #475569;
                        font-weight: 500;
                        line-height: 1.6;
                        white-space: pre-wrap;
                    }

                    .invoice-footer {
                        margin-top: 32px;
                        padding: 20px 48px 32px;
                        text-align: center;
                        border-top: 1.5px solid #e8ecf0;
                    }

                    .footer-text { font-size: 11px; color: #94a3b8; font-weight: 600; }
                    .footer-brand { font-size: 10px; color: #cbd5e1; margin-top: 6px; font-weight: 500; }

                    .no-print-bar {
                        position: fixed;
                        top: 16px;
                        right: 16px;
                        display: flex;
                        gap: 8px;
                        z-index: 1000;
                    }

                    .btn-print {
                        background: #10b981; color: #fff; border: none;
                        border-radius: 10px; padding: 10px 20px; font-weight: 900;
                        font-size: 13px; cursor: pointer; letter-spacing: 0.05em;
                        font-family: inherit;
                    }

                    .btn-close {
                        background: #f1f5f9; color: #475569; border: none;
                        border-radius: 10px; padding: 10px 20px; font-weight: 700;
                        font-size: 13px; cursor: pointer; font-family: inherit;
                    }

                    @media print {
                        body { background: white; }
                        .page-wrapper { padding: 0; background: white; display: block; }
                        .invoice-doc { width: 100%; border-radius: 0; box-shadow: none; }
                        .no-print-bar { display: none !important; }
                    }
                `}</style>
            </head>
            <body>
                <PrintTrigger />

                <PrintButtons />

                <div className="page-wrapper">
                    <div className="invoice-doc">

                        {/* Header */}
                        <div className="invoice-header">
                            <div>
                                <div className="company-name">{companyName}</div>
                                <div className="company-tagline">Professional Services</div>
                            </div>
                            <div className="invoice-title">
                                <h1>Invoice</h1>
                                <div className="invoice-number-badge">{inv.invoice_number}</div>
                            </div>
                        </div>

                        {/* Meta row */}
                        <div className="meta-row" style={{ gridTemplateColumns: inv.due_date ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                            <div className="meta-cell">
                                <div className="meta-label">Invoice Date</div>
                                <div className="meta-value">
                                    {format(new Date(inv.invoice_date), "dd MMMM yyyy")}
                                </div>
                            </div>
                            {inv.due_date && (
                                <div className="meta-cell">
                                    <div className="meta-label">Due Date</div>
                                    <div className="meta-value">
                                        {format(new Date(inv.due_date), "dd MMMM yyyy")}
                                    </div>
                                </div>
                            )}
                            <div className="meta-cell">
                                <div className="meta-label">Payment Status</div>
                                <div className="status-pill">{statusLabel}</div>
                            </div>
                        </div>

                        {/* Billing */}
                        <div className="billing-section">
                            <div className="billing-block">
                                <div className="section-label">Billed To</div>
                                <div className="billing-name">{inv.client_name}</div>
                                {inv.client_company && (
                                    <div className="billing-sub">{inv.client_company}</div>
                                )}
                                {inv.client_email && (
                                    <div className="billing-sub">{inv.client_email}</div>
                                )}
                                {inv.client_phone && (
                                    <div className="billing-sub">{inv.client_phone}</div>
                                )}
                                {inv.client_address && (
                                    <div className="billing-sub" style={{ marginTop: 4, whiteSpace: "pre-line" }}>
                                        {inv.client_address}
                                    </div>
                                )}
                            </div>
                            <div className="billing-block">
                                <div className="section-label">Service Details</div>
                                <div className="billing-name">{inv.service_name}</div>
                                {inv.description && (
                                    <div className="billing-sub" style={{ marginTop: 4 }}>
                                        {inv.description}
                                    </div>
                                )}
                                {inv.payment_method && (
                                    <div className="billing-sub" style={{ marginTop: 8 }}>
                                        <strong>Payment Method:</strong> {inv.payment_method}
                                    </div>
                                )}
                                {inv.payment_date && (
                                    <div className="billing-sub">
                                        <strong>Paid On:</strong>{" "}
                                        {format(new Date(inv.payment_date), "dd MMMM yyyy")}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="items-section">
                            <table className="items-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(inv.invoice_items ?? []).map((item: InvoiceItem) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div>{item.item_name}</div>
                                                {item.description && (
                                                    <div className="item-desc">{item.description}</div>
                                                )}
                                            </td>
                                            <td>{item.quantity}</td>
                                            <td>{fmt(item.unit_price)}</td>
                                            <td>{fmt(item.total_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="totals-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "40px", marginTop: "20px" }}>
                            {/* Payment History print view */}
                            <div style={{ flex: 1, marginRight: "40px" }}>
                                {inv.payments && inv.payments.length > 0 && (
                                    <div>
                                        <div className="section-label" style={{ marginBottom: "8px" }}>Payment History</div>
                                        <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", color: "#64748b" }}>
                                                    <th style={{ textAlign: "left", padding: "4px 0", fontWeight: 800 }}>Date</th>
                                                    <th style={{ textAlign: "left", padding: "4px 0", fontWeight: 800 }}>Method</th>
                                                    <th style={{ textAlign: "right", padding: "4px 0", fontWeight: 800 }}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inv.payments.map((pm) => (
                                                    <tr key={pm.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                        <td style={{ padding: "6px 0", color: "#475569" }}>
                                                            {format(new Date(pm.payment_date), "dd MMM yyyy")}
                                                        </td>
                                                        <td style={{ padding: "6px 0", textTransform: "capitalize", color: "#475569" }}>
                                                            {pm.payment_method.replace('_', ' ')}
                                                        </td>
                                                        <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700, color: "#10b981" }}>
                                                            {fmt(pm.amount_paid)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Summary Table */}
                            <div className="totals-table">
                                <div className="totals-row subtotal">
                                    <span>Subtotal</span>
                                    <span>{fmt(inv.subtotal)}</span>
                                </div>
                                {Number(inv.discount_amount) > 0 && (
                                    <div className="totals-row discount">
                                        <span>Discount</span>
                                        <span>− {fmt(inv.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="totals-row grand-total" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                                    <span>Total Amount</span>
                                    <span>{fmt(inv.total_amount)}</span>
                                </div>
                                <div className="totals-row" style={{ color: "#059669", fontWeight: 700, fontSize: "13px", paddingTop: "8px" }}>
                                    <span>Paid Amount</span>
                                    <span>{fmt(inv.paid_amount ?? 0)}</span>
                                </div>
                                <div className="totals-row" style={{ color: "#064e3b", fontWeight: 900, fontSize: "16px", borderTop: "2px solid #064e3b", marginTop: "6px", paddingTop: "8px" }}>
                                    <span>Balance Due</span>
                                    <span>{fmt(inv.balance_due ?? inv.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {inv.notes && (
                            <div className="notes-section">
                                <div className="notes-title">Notes &amp; Terms</div>
                                <div className="notes-text">{inv.notes}</div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="invoice-footer">
                            <div className="footer-text" style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>
                                {reminderMessage}
                            </div>
                            <div className="footer-brand">
                                Generated by {companyName} · {inv.invoice_number} ·{" "}
                                {format(new Date(), "dd MMM yyyy")}
                            </div>
                        </div>

                    </div>
                </div>
            </body>
        </html>
    );
}
