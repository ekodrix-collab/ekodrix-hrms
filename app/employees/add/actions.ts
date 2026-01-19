'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function addEmployee(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Get user's profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { error: 'Unauthorized - Admin only' }
    }

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const position = formData.get('position') as string
    const department = formData.get('department') as string
    const startDate = formData.get('startDate') as string

    // Create admin client with service role key for user creation
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // 1. Create Supabase Auth user for the employee
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
            full_name: `${firstName} ${lastName}`,
            first_login: true, // Flag for password reset
        }
    })

    if (authError || !authData.user) {
        console.error('Auth User Creation Error:', authError)
        return { error: 'Could not create employee account: ' + authError?.message }
    }

    // 2. Create Profile with employee role
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: authData.user.id,
            organization_id: profile.organization_id,
            role: 'employee',
            email: email,
            full_name: `${firstName} ${lastName}`,
        })

    if (profileError) {
        console.error('Profile Creation Error:', profileError)
        // Cleanup: delete auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return { error: 'Could not create employee profile' }
    }

    // 3. Create Employee record
    const { error: employeeError } = await supabase
        .from('employees')
        .insert({
            organization_id: profile.organization_id,
            profile_id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            email,
            position,
            department,
            start_date: startDate,
            status: 'active'
        })

    if (employeeError) {
        console.error('Employee Creation Error:', employeeError)
        // Cleanup: delete auth user and profile if employee creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        await supabase.from('profiles').delete().eq('id', authData.user.id)
        return { error: 'Could not create employee record' }
    }

    revalidatePath('/employees')
    redirect('/employees')
}
