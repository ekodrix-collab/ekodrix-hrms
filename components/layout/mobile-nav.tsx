"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
} from "@/components/ui/dialog";
import { adminNav, employeeNav, NavGroup } from "./sidebar";

export function MobileNav() {
    const [open, setOpen] = React.useState(false);
    const pathname = usePathname() ?? "";
    const isAdmin = pathname.startsWith("/admin");
    const navGroups = isAdmin ? adminNav : employeeNav;

    // Close sheet on path change
    React.useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-10 w-10 text-zinc-600 dark:text-zinc-400"
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent
                className="fixed left-0 top-0 bottom-0 w-[280px] h-full p-0 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-black/40 backdrop-blur-3xl focus-visible:outline-none"
                style={{
                    transform: "none",
                    left: 0,
                    top: 0,
                }}
            >
                <div className="flex flex-col h-full">
                    {/* Brand Section */}
                    <div className="h-20 flex items-center px-6 mb-2">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                <Zap className="h-6 w-6 text-white fill-current" />
                            </div>
                            <div className="flex flex-col">
                                <DialogTitle className="text-lg font-black leading-none text-zinc-900 dark:text-white uppercase mt-0.5">
                                    Ekodrix
                                </DialogTitle>
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">HRMS PLATFORM</span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Groups */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-hide">
                        {navGroups.map((group) => (
                            <div key={group.group} className="space-y-2">
                                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                                    {group.group}
                                </h3>
                                <ul className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.disabled ? "#" : item.href}
                                                    className={cn(
                                                        "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300",
                                                        isActive
                                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100",
                                                        item.disabled && "opacity-40 cursor-not-allowed"
                                                    )}
                                                >
                                                    <item.icon className={cn(
                                                        "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                                                        isActive ? "text-white" : "text-zinc-400 group-hover:text-primary"
                                                    )} />
                                                    <span>{item.label}</span>

                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="active-indicator-mobile"
                                                            className="absolute right-2 h-1 w-1 rounded-full bg-white"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                        />
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
