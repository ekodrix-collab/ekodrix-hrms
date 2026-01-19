import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { markTaskComplete, markTaskIncomplete } from "./actions"

export default async function TasksPage() {
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

    // Fetch tasks for current user
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })

    const todoTasks = tasks?.filter(t => t.status === 'todo') || []
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || []
    const doneTasks = tasks?.filter(t => t.status === 'done') || []

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
                <div className="mx-auto max-w-7xl space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
                            <p className="text-muted-foreground">Manage your daily tasks and track progress</p>
                        </div>
                        <Link href="/tasks/add">
                            <Button>Add Task</Button>
                        </Link>
                    </div>

                    {/* Kanban Board */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* To Do */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">To Do</h3>
                                <Badge variant="secondary">{todoTasks.length}</Badge>
                            </div>
                            <div className="space-y-3">
                                {todoTasks.length > 0 ? todoTasks.map(task => (
                                    <Card key={task.id}>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">{task.title}</CardTitle>
                                            {task.description && <CardDescription className="text-sm">{task.description}</CardDescription>}
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {task.due_date && (
                                                <p className="text-xs text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                                            )}
                                            <form action={markTaskComplete}>
                                                <input type="hidden" name="taskId" value={task.id} />
                                                <Button size="sm" variant="outline" className="w-full">Mark As Done</Button>
                                            </form>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <Card>
                                        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                                            No tasks
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {/* In Progress */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">In Progress</h3>
                                <Badge variant="secondary">{inProgressTasks.length}</Badge>
                            </div>
                            <div className="space-y-3">
                                {inProgressTasks.length > 0 ? inProgressTasks.map(task => (
                                    <Card key={task.id}>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">{task.title}</CardTitle>
                                            {task.description && <CardDescription className="text-sm">{task.description}</CardDescription>}
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {task.due_date && (
                                                <p className="text-xs text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                                            )}
                                            <form action={markTaskComplete}>
                                                <input type="hidden" name="taskId" value={task.id} />
                                                <Button size="sm" variant="outline" className="w-full">Mark As Done</Button>
                                            </form>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <Card>
                                        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                                            No tasks
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {/* Done */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Done</h3>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">{doneTasks.length}</Badge>
                            </div>
                            <div className="space-y-3">
                                {doneTasks.length > 0 ? doneTasks.map(task => (
                                    <Card key={task.id} className="opacity-75">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base line-through">{task.title}</CardTitle>
                                            {task.description && <CardDescription className="text-sm">{task.description}</CardDescription>}
                                        </CardHeader>
                                        <CardContent>
                                            <form action={markTaskIncomplete}>
                                                <input type="hidden" name="taskId" value={task.id} />
                                                <Button size="sm" variant="ghost" className="w-full">Reopen</Button>
                                            </form>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <Card>
                                        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                                            No tasks
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
