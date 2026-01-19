import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function EmployeesPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's profile to check organization
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/onboarding')
    }

    // Fetch employees from the organization
    const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <h1 className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></h1>
                <nav className="ml-8 flex gap-6">
                    <Link href="/" className="text-sm font-medium hover:underline">Dashboard</Link>
                    <Link href="/employees" className="text-sm font-medium text-green-600 hover:underline">Employees</Link>
                </nav>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{user.email}</span>
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
                <div className="mx-auto max-w-7xl space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                            <p className="text-muted-foreground">Manage your team members</p>
                        </div>
                        {profile.role === 'admin' && (
                            <Link href="/employees/add">
                                <Button>Add Employee</Button>
                            </Link>
                        )}
                    </div>

                    {employees && employees.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {employees.map((employee) => (
                                <Card key={employee.id}>
                                    <CardHeader>
                                        <CardTitle>{employee.first_name} {employee.last_name}</CardTitle>
                                        <CardDescription>{employee.email}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Status:</span>
                                                <span className={employee.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                                                    {employee.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Start Date:</span>
                                                <span>{new Date(employee.start_date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-muted-foreground">No employees found. Add your first employee to get started.</p>
                                {profile.role === 'admin' && (
                                    <Link href="/employees/add">
                                        <Button className="mt-4">Add Employee</Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    )
}
