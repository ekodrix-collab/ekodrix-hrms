'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function punchIn() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return { error: 'Profile not found' }
    }

    // Get employee record
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!employee) {
        return { error: 'Employee record not found' }
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Create attendance record
    const { error } = await supabase
        .from('attendance')
        .insert({
            organization_id: profile.organization_id,
            employee_id: employee.id,
            clock_in: now.toISOString(),
            date: today
        })

    if (error) {
        console.error('Punch In Error:', error)
        return { error: 'Could not punch in' }
    }

    revalidatePath('/attendance')
}

export async function punchOut() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Get employee record
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!employee) {
        return { error: 'Employee record not found' }
    }

    const today = new Date().toISOString().split('T')[0]

    // Get today's attendance
    const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', today)
        .single()

    if (!attendance) {
        return { error: 'No punch in record found' }
    }

    const clockOut = new Date()
    const clockIn = new Date(attendance.clock_in)
    const diffMs = clockOut.getTime() - clockIn.getTime()
    const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100

    // Update attendance record
    const { error } = await supabase
        .from('attendance')
        .update({
            clock_out: clockOut.toISOString(),
            total_hours: totalHours
        })
        .eq('id', attendance.id)

    if (error) {
        console.error('Punch Out Error:', error)
        return { error: 'Could not punch out' }
    }

    revalidatePath('/attendance')
}
