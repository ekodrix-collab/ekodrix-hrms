"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
    CheckCircle2,
    Circle,
    AlertCircle,
    Calendar,
    Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Standup } from "@/types/dashboard";

interface StandupWithProfile extends Standup {
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
        department: string | null;
    } | null;
}

interface StandupListProps {
    standups: StandupWithProfile[];
    isLoading: boolean;
}

// Helper component to render multi-line text with proper formatting
function FormattedText({ text }: { text: string | null | undefined }) {
    if (!text) return <span className="text-zinc-400 italic">Not reported</span>;

    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim());

    // If only one line, display as paragraph
    if (lines.length === 1) {
        return <p className="text-sm leading-relaxed font-medium">{lines[0]}</p>;
    }

    // Multiple lines - display as bullet list
    return (
        <ul className="space-y-1.5 list-none">
            {lines.map((line, idx) => (
                <li key={idx} className="text-sm leading-relaxed font-medium flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1 text-xs">•</span>
                    <span className="flex-1">{line.trim()}</span>
                </li>
            ))}
        </ul>
    );
}

export function StandupList({ standups, isLoading }: StandupListProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 rounded-3xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                ))}
            </div>
        );
    }

    if (standups.length === 0) {
        return (
            <Card className="border-none shadow-sm bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-12 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full w-fit mx-auto">
                        <Calendar className="h-8 w-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-bold">No standups found</h3>
                    <p className="text-sm text-muted-foreground font-medium">
                        Try adjusting your filters or check back later for today&apos;s submissions.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
                {standups.map((standup, index) => (
                    <motion.div
                        key={standup.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="overflow-hidden border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
                            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-800 shadow-md">
                                            <AvatarImage src={standup.profiles?.avatar_url || undefined} />
                                            <AvatarFallback className="bg-blue-600 text-white font-black">
                                                {standup.profiles?.full_name?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                {standup.profiles?.full_name}
                                                {standup.blockers && (
                                                    <Badge variant="destructive" className="h-5 px-1.5 text-[9px] font-black uppercase">
                                                        Blocked
                                                    </Badge>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1">
                                                    <Briefcase className="h-3 w-3" />
                                                    {standup.profiles?.department || "General"}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(standup.date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Submitted at</div>
                                        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                            {format(new Date(standup.created_at), 'hh:mm aa')}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 flex items-center">
                                            <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </div>
                                            Completed Accomplishments
                                        </h4>
                                        <div className="p-4 rounded-2xl bg-green-50/30 dark:bg-green-900/5 border border-green-100/50 dark:border-green-900/20 text-zinc-700 dark:text-zinc-300">
                                            <FormattedText text={standup.tasks_completed} />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center">
                                            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-2">
                                                <Circle className="h-3.5 w-3.5" />
                                            </div>
                                            Planned Focus for Today
                                        </h4>
                                        <div className="p-4 rounded-2xl bg-blue-50/30 dark:bg-blue-900/5 border border-blue-100/50 dark:border-blue-900/20 text-zinc-700 dark:text-zinc-300">
                                            <FormattedText text={standup.tasks_planned} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 flex items-center">
                                            <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-2">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                            </div>
                                            Urgent Blockers & Risks
                                        </h4>
                                        <div className={`p-4 rounded-2xl border ${standup.blockers
                                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400'
                                            : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}>
                                            <FormattedText text={standup.blockers} />
                                        </div>
                                    </div>

                                    {standup.notes && (
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center">
                                                Additional Notes
                                            </h4>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
                                                &quot;{standup.notes}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
