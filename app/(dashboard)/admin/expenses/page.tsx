"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllExpenses } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Loader2, Receipt, Wallet } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminExpensesPage() {
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["admin-all-expenses"],
    queryFn: () => getAllExpenses(),
  });

  const totalSpent = expenses?.reduce((acc: number, curr: { amount: string | number }) => acc + Number(curr.amount), 0) || 0;

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-widest">
            <Receipt className="h-3 w-3" />
            Financial Hub
          </div>
          <h1 className="text-4xl font-black">Expense Management</h1>
          <p className="text-muted-foreground font-medium text-sm">Track and audit company expenditures efficiently.</p>
        </div>

        <div className="flex items-center gap-4">
          <Card className="bg-purple-600 text-white border-none px-6 py-3 flex items-center gap-4 shadow-xl shadow-purple-500/20">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Outlay</p>
              <p className="text-2xl font-black tabular-nums">₹{totalSpent.toLocaleString()}</p>
            </div>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Detailed audit log of all validated expenses</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-medium">
                  <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Emplyee</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {isLoading ? (
                      <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" /></td></tr>
                    ) : expenses && expenses.length > 0 ? (
                      expenses.map((expense: {
                        id: string;
                        description: string;
                        expense_date: string;
                        amount: string | number;
                        payment_method: string;
                        profiles: {
                          avatar_url: string;
                          full_name: string;
                        };
                        expense_categories: {
                          color: string;
                          name: string;
                        };
                      }, index: number) => (
                        <motion.tr
                          key={expense.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="group hover:bg-zinc-50 h-[72px] dark:hover:bg-zinc-800/30 transition-all"
                        >
                          <td className="px-6">
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold uppercase">{expense.description}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</p>
                            </div>
                          </td>
                          <td className="px-6">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 border border-zinc-100 dark:border-zinc-800">
                                <AvatarImage src={expense.profiles?.avatar_url} />
                                <AvatarFallback className="text-[10px] font-black">{expense.profiles?.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-bold">{expense.profiles?.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6">
                            <Badge variant="outline" className="gap-2 font-black text-[9px] uppercase tracking-widest border-zinc-200 dark:border-zinc-800">
                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: expense.expense_categories?.color }} />
                              {expense.expense_categories?.name}
                            </Badge>
                          </td>
                          <td className="px-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{expense.payment_method}</span>
                          </td>
                          <td className="px-6 text-right">
                            <span className="text-sm font-black tabular-nums">₹{Number(expense.amount).toLocaleString()}</span>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="py-20 text-center opacity-40 font-bold">No expenses logged yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
