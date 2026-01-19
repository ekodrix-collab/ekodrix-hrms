import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { addEmployee } from "./actions"

export default async function AddEmployeePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        redirect('/employees')
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <h1 className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></h1>
                <nav className="ml-8 flex gap-6">
                    <Link href="/" className="text-sm font-medium hover:underline">Dashboard</Link>
                    <Link href="/employees" className="text-sm font-medium text-green-600 hover:underline">Employees</Link>
                </nav>
            </header>

            <main className="flex-1 p-8">
                <div className="mx-auto max-w-2xl space-y-8">
                    <div>
                        <Link href="/employees" className="text-sm text-muted-foreground hover:underline">← Back to Employees</Link>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight">Add Employee</h2>
                        <p className="text-muted-foreground">Add a new team member to your organization</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Information</CardTitle>
                            <CardDescription>Enter the details for the new employee</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={addEmployee} className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" name="firstName" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" name="lastName" required />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Temporary Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Employee will reset on first login"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Employee will be required to change this password on first login
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="position">Position</Label>
                                    <Input id="position" name="position" placeholder="e.g. Developer, Designer" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input id="department" name="department" placeholder="e.g. Engineering, Sales" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="startDate">Start Date</Label>
                                    <Input id="startDate" name="startDate" type="date" required />
                                </div>
                                <div className="flex gap-4">
                                    <Button type="submit" className="flex-1">Add Employee</Button>
                                    <Link href="/employees" className="flex-1">
                                        <Button type="button" variant="outline" className="w-full">Cancel</Button>
                                    </Link>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
