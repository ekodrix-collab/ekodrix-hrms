import { createOrganization } from './actions'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already has a profile (already in an org)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/50 p-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-xl">Create Organization</CardTitle>
          <CardDescription>
            Set up your company workspace to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganization} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" name="companyName" placeholder="Acme Inc." required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companySlug">Company Slug (URL)</Label>
              <Input id="companySlug" name="companySlug" placeholder="acme" required />
              <p className="text-xs text-muted-foreground">Used for your unique URL. Alphanumeric and dashes only.</p>
            </div>
            <Button type="submit" className="w-full">
              Create Workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
