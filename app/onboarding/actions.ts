'use server'

import { createClient } from '@/utils/supabase/server'
import { onboardingSchema } from '@/lib/schemas'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const rawData = {
    companyName: formData.get('companyName'),
    companySlug: formData.get('companySlug'),
  }

  const validatedFields = onboardingSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return { error: 'Invalid fields', issues: validatedFields.error.issues }
  }

  const { companyName, companySlug } = validatedFields.data

  // 1. Create Organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: companyName,
      slug: companySlug,
    })
    .select()
    .single()

  if (orgError) {
    console.error('Org Creation Error:', orgError)
    return { error: 'Could not create organization. Slug might be taken.' }
  }

  // 2. Create Profile linked to Org and User
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      organization_id: org.id,
      role: 'admin',
      email: user.email,
      full_name: user.user_metadata.full_name || '',
    })

  if (profileError) {
    console.error('Profile Creation Error:', profileError)
    return { error: 'Could not create profile.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
