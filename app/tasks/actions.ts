'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
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

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const dueDate = formData.get('dueDate') as string

    const { error } = await supabase
        .from('tasks')
        .insert({
            organization_id: profile.organization_id,
            assigned_to: user.id,
            title,
            description,
            status: 'todo',
            due_date: dueDate || null
        })

    if (error) {
        console.error('Task Creation Error:', error)
        return { error: 'Could not create task' }
    }

    revalidatePath('/tasks')
    redirect('/tasks')
}

export async function markTaskComplete(formData: FormData) {
    const supabase = await createClient()
    const taskId = formData.get('taskId') as string

    const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', taskId)

    if (error) {
        console.error('Task Update Error:', error)
        return { error: 'Could not update task' }
    }

    revalidatePath('/tasks')
}

export async function markTaskIncomplete(formData: FormData) {
    const supabase = await createClient()
    const taskId = formData.get('taskId') as string

    const { error } = await supabase
        .from('tasks')
        .update({ status: 'todo' })
        .eq('id', taskId)

    if (error) {
        console.error('Task Update Error:', error)
        return { error: 'Could not update task' }
    }

    revalidatePath('/tasks')
}
