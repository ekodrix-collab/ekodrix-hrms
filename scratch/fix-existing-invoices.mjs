import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple manual env parser
function loadEnv() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
            if (match) {
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[match[1]] = value;
            }
        });
    } catch (e) {
        console.error("Could not load .env.local:", e.message);
    }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvoices() {
    console.log("Fetching all active invoices...");
    const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('is_active', true);

    if (invError) {
        console.error("Error fetching invoices:", invError);
        return;
    }

    console.log(`Found ${invoices.length} invoices. Updating calculations...`);

    for (const inv of invoices) {
        // Fetch all active payments for this invoice
        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('amount_paid')
            .eq('invoice_id', inv.id)
            .eq('is_active', true);

        if (payError) {
            console.error(`Error fetching payments for invoice ${inv.invoice_number}:`, payError);
            continue;
        }

        const totalAmount = Number(inv.total_amount);
        const totalPaid = payments ? payments.reduce((sum, p) => sum + Number(p.amount_paid), 0) : 0;
        
        let correctPaid = totalPaid;
        let balanceDue = Math.max(0, totalAmount - totalPaid);
        let correctStatus = inv.payment_status;

        // If the invoice is already marked as 'paid' but has no payment logs, keep it as 'paid' (historical manual overrides)
        if (inv.payment_status === 'paid' && totalPaid === 0) {
            correctPaid = totalAmount;
            balanceDue = 0.00;
            correctStatus = 'paid';
        } else if (inv.payment_status !== 'cancelled') {
            if (totalPaid >= totalAmount && totalAmount > 0) {
                correctStatus = 'paid';
            } else if (totalPaid > 0) {
                correctStatus = 'partially_paid';
            } else {
                correctStatus = 'pending';
            }
        }

        // Special case: if we previously modified INV-2026-0001 (or any similar) to pending, but it was originally paid, let's restore it
        if (inv.invoice_number === 'INV-2026-0001' && totalPaid === 0) {
            correctPaid = totalAmount;
            balanceDue = 0.00;
            correctStatus = 'paid';
        }

        console.log(`Invoice ${inv.invoice_number}:`);
        console.log(`  Total Amount: ₹${totalAmount.toFixed(2)}`);
        console.log(`  Current Paid: ₹${Number(inv.paid_amount).toFixed(2)} -> Correct Paid: ₹${correctPaid.toFixed(2)}`);
        console.log(`  Current Balance: ₹${Number(inv.balance_due).toFixed(2)} -> Correct Balance: ₹${balanceDue.toFixed(2)}`);
        console.log(`  Current Status: ${inv.payment_status} -> Correct Status: ${correctStatus}`);

        // Update the invoice in DB
        const { error: updateError } = await supabase
            .from('invoices')
            .update({
                paid_amount: correctPaid,
                balance_due: balanceDue,
                payment_status: correctStatus
            })
            .eq('id', inv.id);

        if (updateError) {
            console.error(`  Error updating invoice ${inv.invoice_number}:`, updateError);
        } else {
            console.log(`  Successfully updated ${inv.invoice_number}.`);
        }
    }
}

fixInvoices();
