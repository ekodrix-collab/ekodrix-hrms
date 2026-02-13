const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        console.log(`  Samples:`, orgGroups[orgId].slice(0, 2).map(p => ({ email: p.email, role: p.role, status: p.status })));
    });

    // 3. Check if there are organizations
    const { data: orgs } = await supabase.from('organizations').select('id, name');
    console.log("\nOrganizations in database:", orgs);
}

checkData();
