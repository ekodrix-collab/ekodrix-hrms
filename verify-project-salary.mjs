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

async function verifyProjectSalary() {
    console.log('--- Verifying Project Salary Integration ---');

    // 1. Check if employee_id column exists
    const { data: columnInfo, error: columnError } = await supabase
        .rpc('get_column_info', { table_name: 'expenses', column_name: 'employee_id' });

    if (columnError) {
        if (columnError.message.includes('function get_column_info(...) does not exist')) {
            console.log('Note: RPC get_column_info not found. Attempting direct query check...');
            const { error: queryError } = await supabase
                .from('expenses')
                .select('employee_id')
                .limit(1);

            if (queryError) {
                console.error('❌ employee_id column check failed:', queryError.message);
            } else {
                console.log('✅ employee_id column exists in expenses table.');
            }
        } else {
            console.error('❌ Error checking column info:', columnError.message);
        }
    } else {
        console.log('✅ employee_id column exists.');
    }

    // 2. Verify getProjectMembersAction (logic check)
    // We can't easily call the server action here without more setup, 
    // but we can check the profiles and project_members join
    const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .limit(1);

    if (projectError || !projects?.length) {
        console.log('⚠️ No projects found to test membership.');
    } else {
        const projectId = projects[0].id;
        console.log(`Checking members for project: ${projects[0].name} (${projectId})`);

        const { data: members, error: memberError } = await supabase
            .from('project_members')
            .select('profile_id, profiles(full_name)')
            .eq('project_id', projectId);

        if (memberError) {
            console.error('❌ Error fetching project members:', memberError.message);
        } else {
            console.log(`✅ Found ${members.length} members for the project.`);
        }
    }

    // 3. Verify projectSalaries retrieval in getEmployeeFinanceData (logic check)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1);

    if (profileError || !profile?.length) {
        console.log('⚠️ No profiles found to test finance data.');
    } else {
        const profileId = profile[0].id;
        console.log(`Checking project salaries for employee: ${profile[0].full_name} (${profileId})`);

        const { data: salaries, error: salaryError } = await supabase
            .from('expenses')
            .select('amount, description, created_at, projects(name)')
            .eq('employee_id', profileId)
            .eq('category', 'Salary Payments');

        if (salaryError) {
            console.error('❌ Error fetching project salaries:', salaryError.message);
        } else {
            console.log(`✅ Found ${salaries.length} project salary payments.`);
            if (salaries.length > 0) {
                console.log('Sample Salary Payment:', salaries[0]);
            }
        }
    }

    console.log('--- Verification Complete ---');
}

verifyProjectSalary();
