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

async function checkData() {
    console.log("Checking profiles table...");

    // 1. Get all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role, organization_id, full_name, status');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Total profiles found: ${profiles.length}`);

    // 2. Group by organization_id
    const orgGroups = {};
    profiles.forEach(p => {
        const orgId = p.organization_id || 'NULL';
        if (!orgGroups[orgId]) orgGroups[orgId] = [];
        orgGroups[orgId].push(p);
    });

    console.log("\nGroups by Organization ID:");
    Object.keys(orgGroups).forEach(orgId => {
        console.log(`\nOrganization: ${orgId}`);
        const roles = {};
        orgGroups[orgId].forEach(p => {
            roles[p.role] = (roles[p.role] || 0) + 1;
        });
        console.log(`  Count: ${orgGroups[orgId].length}`);
        console.log(`  Roles:`, roles);
        console.log(`  Samples:`, orgGroups[orgId].slice(0, 3).map(p => ({ email: p.email, role: p.role, status: p.status, id: p.id })));
    });

    // 3. Check if there are organizations
    const { data: orgs } = await supabase.from('organizations').select('id, name');
    console.log("\nOrganizations in database:", orgs);

    // 4. Try to simulate the fetch in getOrganizationEmployees
    // We need an admin user to test. Let's pick the first admin we find.
    const admin = profiles.find(p => p.role === 'admin' && p.organization_id);
    if (admin) {
        console.log(`\nSimulating fetch for admin: ${admin.email} (Org: ${admin.organization_id})`);
        const { data: employees } = await supabase
            .from('profiles')
            .select('*')
            .eq('organization_id', admin.organization_id)
            .neq('id', admin.id);

        console.log(`Found ${employees?.length || 0} other members in this org.`);
        if (employees && employees.length > 0) {
            console.log(`Sample employee:`, employees[0].email, employees[0].role);
        }
    } else {
        console.log("\nNo admin with organization_id found to simulate fetch.");
    }
}

checkData();
