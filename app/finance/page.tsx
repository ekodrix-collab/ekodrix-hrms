import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function FinancePage() {
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

    // Fetch transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('date', { ascending: false })
        .limit(10)

    // Calculate totals
    const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const balance = income - expenses

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <Link href="/" className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></Link>
                <nav className="ml-8 flex gap-6">
                    <Link href="/" className="text-sm font-medium hover:underline">Dashboard</Link>
                    <Link href="/employees" className="text-sm font-medium hover:underline">Employees</Link>
                    <Link href="/attendance" className="text-sm font-medium hover:underline">Attendance</Link>
                    <Link href="/tasks" className="text-sm font-medium hover:underline">Tasks</Link>
                    <Link href="/finance" className="text-sm font-medium text-green-600 hover:underline">Finance</Link>
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
                            <h2 className="text-3xl font-bold tracking-tight">Finance</h2>
                            <p className="text-muted-foreground">Track income and expenses</p>
                        </div>
                        {profile.role === 'admin' && (
                            <Link href="/finance/add">
                                <Button>Add Transaction</Button>
                            </Link>
                        )}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>Total Income</CardDescription>
                                <CardTitle className="text-3xl text-green-600">₹{income.toFixed(2)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>Total Expenses</CardDescription>
                                <CardTitle className="text-3xl text-red-600">₹{expenses.toFixed(2)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>Balance</CardDescription>
                                <CardTitle className={`text-3xl ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{balance.toFixed(2)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Recent Transactions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>Latest financial activities</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {transactions && transactions.length > 0 ? (
                                <div className="space-y-4">
                                    {transactions.map(transaction => (
                                        <div key={transaction.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                                            <div className="space-y-1">
                                                <p className="font-medium">{transaction.category}</p>
                                                <p className="text-sm text-muted-foreground">{transaction.description || 'No description'}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {transaction.type === 'income' ? '+' : '-'}₹{Number(transaction.amount).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-sm text-muted-foreground py-4">No transactions found. Add your first transaction to get started.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
