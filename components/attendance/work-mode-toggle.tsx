"use client";

import { motion } from "framer-motion";
import { Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkModeToggleProps {
    value: "office" | "home";
    onChange: (value: "office" | "home") => void;
    disabled?: boolean;
}

export function WorkModeToggle({ value, onChange, disabled }: WorkModeToggleProps) {
    return (
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl flex gap-3 w-full max-w-[320px] mx-auto">
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("office")}
                className={cn(
                    "relative flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    value === "office"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
            >
                {value === "office" && (
                    <motion.div
                        layoutId="work-mode-bg"
                        className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <Building2 className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Office</span>
            </button>

            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("home")}
                className={cn(
                    "relative flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    value === "home"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
            >
                {value === "home" && (
                    <motion.div
                        layoutId="work-mode-bg"
                        className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <Home className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Home</span>
            </button>
        </div>
    );
}
