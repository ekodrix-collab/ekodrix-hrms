import { z } from 'zod'

export const onboardingSchema = z.object({
    companyName: z.string().min(2, "Company name must be at least 2 characters").max(50),
    companySlug: z.string().min(2).max(20).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
})

export type OnboardingFormValues = z.infer<typeof onboardingSchema>

export const taskSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
    dueDate: z.string().optional(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
