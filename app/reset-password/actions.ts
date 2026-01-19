'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        return { error: 'Passwords do not match' }
    }

    // Validate password length
    if (newPassword.length < 8) {
        return { error: 'Password must be at least 8 characters' }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    })

    if (updateError) {
        console.error('Password Update Error:', updateError)
        return { error: 'Could not update password: ' + updateError.message }
    }

    // Remove first_login flag
    const { error: metadataError } = await supabase.auth.updateUser({
        data: {
            first_login: false,
        }
    })

    if (metadataError) {
        console.error('Metadata Update Error:', metadataError)
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
