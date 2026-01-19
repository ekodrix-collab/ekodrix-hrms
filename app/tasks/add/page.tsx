import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { createTask } from "./actions"

export default async function AddTaskPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/onboarding')
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <Link href="/" className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></Link>
                <nav className="ml-8 flex gap-6">
                    <Link href="/" className="text-sm font-medium hover:underline">Dashboard</Link>
                    <Link href="/employees" className="text-sm font-medium hover:underline">Employees</Link>
                    <Link href="/attendance" className="text-sm font-medium hover:underline">Attendance</Link>
                    <Link href="/tasks" className="text-sm font-medium text-green-600 hover:underline">Tasks</Link>
                </nav>
            </header>

            <main className="flex-1 p-8">
                <div className="mx-auto max-w-2xl space-y-8">
                    <div>
                        <Link href="/tasks" className="text-sm text-muted-foreground hover:underline">← Back to Tasks</Link>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight">Create Task</h2>
                        <p className="text-muted-foreground">Add a new task to your list</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Task Details</CardTitle>
                            <CardDescription>Enter the information for your new task</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={createTask} className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input id="title" name="title" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea id="description" name="description" rows={3} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            defaultValue="medium"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dueDate">Due Date (Optional)</Label>
                                        <Input id="dueDate" name="dueDate" type="date" />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Button type="submit" className="flex-1">Create Task</Button>
                                    <Link href="/tasks" className="flex-1">
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
