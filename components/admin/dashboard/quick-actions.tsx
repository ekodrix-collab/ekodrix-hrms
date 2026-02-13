"use client";

import { motion } from "framer-motion";
import {
    UserPlus,
    FilePlus,
    MessageSquare,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const actions = [
    { label: "Invite Member", icon: UserPlus, color: "text-primary", bg: "bg-primary/10 dark:bg-primary/20" },
    { label: "Post Update", icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "New Task", icon: Zap, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Log Expense", icon: FilePlus, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
];

export function QuickActions() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, index) => (
                <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
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
                </motion.div>
            ))}
        </div>
    );
}
