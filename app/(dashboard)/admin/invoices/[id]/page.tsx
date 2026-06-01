import { Metadata } from "next";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export const metadata: Metadata = {
    title: "Invoice Details | Ekodrix HRMS",
    description: "View and manage invoice details.",
};

interface InvoiceDetailPageProps {
    params: { id: string };
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
    return (
        <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-700">
            <InvoiceDetailClient id={params.id} />
        </div>
    );
}
