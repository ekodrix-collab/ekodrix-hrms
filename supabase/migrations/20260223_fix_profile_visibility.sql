-- FIX: Profile visibility RLS
-- Allows users in the same organization (including both being NULL) to see each other.
-- This is critical for initial setup where organizations might not be assigned yet.

DROP POLICY IF EXISTS "Users can view organization profiles" ON public.profiles;

CREATE POLICY "Users can view organization profiles" ON public.profiles
    FOR SELECT USING (
        (
            EXISTS (
                SELECT 1 FROM public.profiles current_user_p
                WHERE current_user_p.id = auth.uid()
                AND (
                    current_user_p.organization_id = public.profiles.organization_id
                    OR (current_user_p.organization_id IS NULL AND public.profiles.organization_id IS NULL)
                )
            )
        )
        OR (id = auth.uid())
        OR (auth.uid() IS NULL) -- Allow service role
    );
