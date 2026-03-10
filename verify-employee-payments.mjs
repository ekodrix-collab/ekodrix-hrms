import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyEmployeePayments() {
    console.log('--- Verifying Employee Payments Integration ---');

    // 1. Check if employee_payments table exists and its structure
    const { data: tableExists, error: tableError } = await supabase
        .from('employee_payments')
        .select('*')
        .limit(1);

    if (tableError) {
        console.error('❌ employee_payments table check failed:', tableError.message);
    } else {
        console.log('✅ employee_payments table exists.');
    }

    // 2. Test data retrieval for a sample profile
    const { data: profile } = await supabase.from('profiles').select('id, full_name').limit(1).single();

    if (profile) {
        console.log(`Testing with profile: ${profile.full_name} (${profile.id})`);

        // Check types
        const types = ['salary', 'project_share', 'commission', 'bonus', 'reimbursement'];
        console.log('Payment types to check:', types.join(', '));

        const { data: payments, error: paymentError } = await supabase
            .from('employee_payments')
            .select('*')
            .eq('employee_id', profile.id);

        if (paymentError) {
            console.error('❌ Error fetching payments:', paymentError.message);
        } else {
            console.log(`✅ Found ${payments?.length || 0} payments in new table.`);
            const typeCount = payments?.reduce((acc, p) => {
                const type = p.payment_type;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            console.log('Payment counts by type:', typeCount);
        }
    }

    console.log('--- Verification Complete ---');
}

verifyEmployeePayments();
