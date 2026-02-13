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
    } catch (e) { }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Starting Verification...");

    // 1. Get Admins
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'admin');

    for (const admin of profiles) {
        console.log(`\nVerifying for Admin: ${admin.email} (Org: ${admin.organization_id})`);

        // Simulating the dashboard count query
        const { count: empCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', admin.organization_id)
            .eq('role', 'employee');

        console.log(`- Employees in Org: ${empCount}`);

        // Simulating attendance check
        const istDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('id, user_id, profiles!inner(organization_id)', { count: 'exact', head: true })
            .eq('date', istDate)
            .eq('status', 'present')
            .eq('profiles.organization_id', admin.organization_id);

        console.log(`- Present today in Org: ${attendanceCount}`);

        // Verification logic
        if (admin.email === 'ekodrix@gmail.com') {
            if (empCount === 0) {
                console.log("✅ Correct: ekodrix@gmail.com has 0 employees in their org.");
            } else {
                console.log("❌ Error: ekodrix@gmail.com should have 0 employees but found " + empCount);
            }
        } else if (admin.email === 'mhdrashid142@gmail.com') {
            if (empCount === 2) {
                console.log("✅ Correct: mhdrashid142@gmail.com has 2 employees in their org.");
            } else {
                console.log("❌ Error: mhdrashid142@gmail.com should have 2 employees but found " + empCount);
            }
        }
    }
}

verify();
