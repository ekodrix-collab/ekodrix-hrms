"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    UserPlus,
    FilePlus,
    MessageSquare,
    Zap
} from "lucide-react";
import { getAllEmployees } from "@/actions/employees";
import { InviteEmployeeModal } from "@/components/admin/dashboard/invite-employee-modal";
import { PostUpdateModal } from "@/components/admin/dashboard/post-update-modal";
import { LogExpenseModal } from "@/components/admin/dashboard/log-expense-modal";
import { AdminTaskForm } from "@/components/tasks/admin-task-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const actions = [
    { label: "Invite Member", icon: UserPlus, color: "text-primary", bg: "bg-primary/10 dark:bg-primary/20" },
    { label: "Post Update", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "New Task", icon: Zap, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Log Expense", icon: FilePlus, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
];

type EmployeeRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    department?: string | null;
    role?: string | null;
};

function ActionCard({ action }: { action: (typeof actions)[number] }) {
    return (
        <Button
            type="button"
            variant="ghost"
            className={cn(
                "w-full h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-transparent transition-all duration-300",
                "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-lg shadow-zinc-200/50"
            )}
        >
            <div className={cn("p-3 rounded-xl", action.bg, action.color)}>
                <action.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                {action.label}
            </span>
        </Button>
    );
}

export function QuickActions() {
    const { data: employees = [] } = useQuery<EmployeeRow[]>({
        queryKey: ["admin-employees-quick-actions"],
        queryFn: () => getAllEmployees(),
    });

    const taskEmployees = useMemo(
        () =>
            employees
                .filter((employee) => employee && (employee.role === "employee" || employee.role === "founder"))
                .map((employee) => ({
                    id: employee.id,
                    full_name: employee.full_name || employee.email || "Team Member",
                    email: employee.email || "",
                    department: employee.department ?? null,
                })),
        [employees]
    );

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <InviteEmployeeModal trigger={<ActionCard action={actions[0]} />} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <PostUpdateModal trigger={<ActionCard action={actions[1]} />} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <AdminTaskForm employees={taskEmployees} trigger={<ActionCard action={actions[2]} />} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <LogExpenseModal trigger={<ActionCard action={actions[3]} />} />
            </motion.div>
        </div>
    );
}
