
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has a profile/organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  // Fetch some stats
  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
        <Link href="/" className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></Link>
        <nav className="ml-8 flex gap-6">
          <Link href="/" className="text-sm font-medium text-green-600 hover:underline">Dashboard</Link>
          <Link href="/employees" className="text-sm font-medium hover:underline">Employees</Link>
          <Link href="/attendance" className="text-sm font-medium hover:underline">Attendance</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{profile.full_name || user.email}</span>
          <form action={async () => {
            'use server'
            const supabase = createClient()
            await supabase.auth.signOut()
            redirect('/login')
          }}>
            <Button variant="outline" size="sm">Sign Out</Button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Welcome back, {profile.full_name || user.email}!</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-semibold leading-none tracking-tight">Total Employees</h3>
              <p className="text-2xl font-bold mt-2">{employeeCount || 0}</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-semibold leading-none tracking-tight">Active Tasks</h3>
              <p className="text-2xl font-bold mt-2">--</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-semibold leading-none tracking-tight">Today's Attendance</h3>
              <p className="text-2xl font-bold mt-2">--</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
              <h3 className="font-semibold leading-none tracking-tight">This Month</h3>
              <p className="text-2xl font-bold mt-2">--</p>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Status:</strong> Phase 1 & 2 complete. Configure Supabase credentials in .env.local to enable full functionality.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
