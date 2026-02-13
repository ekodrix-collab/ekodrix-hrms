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

async function checkData() {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: orgs } = await supabase.from('organizations').select('*');

    fs.writeFileSync('debug-data.json', JSON.stringify({ profiles, orgs }, null, 2));
    console.log("Data written to debug-data.json");
}

checkData();
