import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
    try {
        const content = fs.readFileSync('.env.local', 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
            if (match) {
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[match[1]] = value;
            }
        });
    } catch (e) {}
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // Fetch a single invoice using both methods to see if it is returned
    // First, let's find an invoice with no payments
    const { data: invoices } = await supabase.from('invoices').select('id, invoice_number').eq('is_active', true);
    if (!invoices || invoices.length === 0) {
        console.log("No invoices found");
        return;
    }

    const testId = invoices[0].id;
    console.log(`Testing with Invoice ID: ${testId} (${invoices[0].invoice_number})`);

    // Method A: query with .eq('payments.is_active', true)
    const { data: resA, error: errA } = await supabase
        .from('invoices')
        .select('id, invoice_number, payments(*)')
        .eq('id', testId)
        .eq('payments.is_active', true)
        .single();

    console.log("Method A Result:", resA ? "Success" : "Failed", errA?.message || "");
    if (resA) {
        console.log("Payments returned in Method A:", resA.payments);
    }
}

test();
