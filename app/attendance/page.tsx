import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { punchIn, punchOut } from "./actions"

export default async function AttendancePage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/onboarding')
    }

    // Get today's attendance for current user
    const today = new Date().toISOString().split('T')[0]

    // For employees, we need to first get their employee record
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    let todayAttendance = null
    if (employee) {
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employee.id)
            .eq('date', today)
            .single()

        todayAttendance = data
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <Link href="/" className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></Link>
                <nav className="ml-8 flex gap-6">
                    <Link href="/" className="text-sm font-medium hover:underline">Dashboard</Link>
                    <Link href="/employees" className="text-sm font-medium hover:underline">Employees</Link>
                    <Link href="/attendance" className="text-sm font-medium text-green-600 hover:underline">Attendance</Link>
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
                            <p className="text-muted-foreground">Manage your attendance and work hours</p>
                        </div>
                    </div>

                    {/* Punch In/Out Widget */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>Today's Attendance</CardTitle>
                            <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!employee ? (
                                <div className="rounded-md border p-4 bg-yellow-50 dark:bg-yellow-900/20">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        You need to be added as an employee to mark attendance.
                                    </p>
                                </div>
                            ) : !todayAttendance ? (
                                <div className="space-y-4">
                                    <p className="text-muted-foreground">You haven't punched in yet today.</p>
                                    <form action={punchIn}>
                                        <Button size="lg" className="w-full">Punch In</Button>
                                    </form>
                                </div>
                            ) : !todayAttendance.clock_out ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Clock In</p>
                                            <p className="text-xl font-semibold">{new Date(todayAttendance.clock_in).toLocaleTimeString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Status</p>
                                            <p className="text-xl font-semibold text-green-600">Working</p>
                                        </div>
                                    </div>
                                    <form action={punchOut}>
                                        <Button size="lg" variant="outline" className="w-full">Punch Out</Button>
                                    </form>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Clock In</p>
                                            <p className="text-lg font-semibold">{new Date(todayAttendance.clock_in).toLocaleTimeString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Clock Out</p>
                                            <p className="text-lg font-semibold">{new Date(todayAttendance.clock_out).toLocaleTimeString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Hours</p>
                                            <p className="text-lg font-semibold text-green-600">{todayAttendance.total_hours || 0}h</p>
                                        </div>
                                    </div>
                                    <div className="text-center text-sm text-muted-foreground">
                                        You've completed your attendance for today.
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Attendance (placeholder) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Attendance</CardTitle>
                            <CardDescription>Your attendance history</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Recent attendance records will appear here.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
