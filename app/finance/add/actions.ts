'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return { error: 'Unauthorized' }
    }

    const type = formData.get('type') as string
    const category = formData.get('category') as string
    const amount = formData.get('amount') as string
    const date = formData.get('date') as string
    const description = formData.get('description') as string

    const { error } = await supabase
        .from('transactions')
        .insert({
            organization_id: profile.organization_id,
            type,
            category,
            amount: parseFloat(amount),
            date,
            description
        })

    if (error) {
        console.error('Transaction Creation Error:', error)
        return { error: 'Could not create transaction' }
    }

    revalidatePath('/finance')
    redirect('/finance')
}
