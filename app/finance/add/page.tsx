import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { createTransaction } from "./actions"

export default async function AddTransactionPage() {
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

    if (!profile || profile.role !== 'admin') {
        redirect('/finance')
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
                <Link href="/" className="text-xl font-bold text-primary">Ekodrix<span className="text-green-600">HRMS</span></Link>
                <nav className="ml-8 flex gap-6">
                    <Link href="/" className="text-sm font-medium hover:underline">Dashboard</Link>
                    <Link href="/finance" className="text-sm font-medium text-green-600 hover:underline">Finance</Link>
                </nav>
            </header>

            <main className="flex-1 p-8">
                <div className="mx-auto max-w-2xl space-y-8">
                    <div>
                        <Link href="/finance" className="text-sm text-muted-foreground hover:underline">← Back to Finance</Link>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight">Add Transaction</h2>
                        <p className="text-muted-foreground">Record a new income or expense</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Details</CardTitle>
                            <CardDescription>Enter the transaction information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={createTransaction} className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Type</Label>
                                    <select
                                        id="type"
                                        name="type"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="income">Income</option>
                                        <option value="expense">Expense</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Input id="category" name="category" placeholder="Salary, Rent, Tools, etc." required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="amount">Amount (₹)</Label>
                                    <Input id="amount" name="amount" type="number" step="0.01" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input id="date" name="date" type="date" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea id="description" name="description" rows={2} />
                                </div>
                                <div className="flex gap-4">
                                    <Button type="submit" className="flex-1">Add Transaction</Button>
                                    <Link href="/finance" className="flex-1">
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
