"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Send,
    Target,
    History as HistoryIcon,
    TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { submitStandupAction, getEmployeeStandups } from "@/actions/employee-actions";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Standup } from "@/types/dashboard";

// Helper component to render multi-line text with proper formatting
function FormattedText({ text }: { text: string }) {
    if (!text) return <span className="text-zinc-400">None reported</span>;

    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim());

    // If only one line, display as paragraph
    if (lines.length === 1) {
        return <p className="text-sm text-zinc-700 dark:text-zinc-300">{lines[0]}</p>;
    }

    // Multiple lines - display as bullet list
    return (
        <ul className="space-y-1.5 list-none">
            {lines.map((line, idx) => (
                <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 mt-1 text-xs">•</span>
                    <span className="flex-1">{line.trim()}</span>
                </li>
            ))}
        </ul>
    );
}

export default function EmployeeStandupPage() {
    const [standups, setStandups] = useState<Standup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        getEmployeeStandups().then(res => {
            if (res.ok) setStandups(res.data || []);
            setIsLoading(false);
        });
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const res = await submitStandupAction(formData);

        if (res.ok) {
            toast.success("Standup submitted successfully!");
            // Refresh list
            const updated = await getEmployeeStandups();
            if (updated.ok) setStandups(updated.data || []);
            (e.target as HTMLFormElement).reset();
        } else {
            toast.error(res.message || "Failed to submit standup");
        }
        setIsSubmitting(false);
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    const todayEntry = standups.find(s => s.date === new Date().toISOString().slice(0, 10));

    return (
        <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-8">
                <header className="pt-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-orange-600 rounded-lg text-white shadow-lg shadow-orange-500/20">
                                <Target className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Daily Updates</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Daily Standup</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                            Share your progress, plans, and any blockers with your team.
                        </p>
                    </motion.div>
                </header>

                <div className="grid lg:grid-cols-2 gap-6">
                    <Card className="border-2 border-orange-100 dark:border-orange-900/30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Today&apos;s Update</CardTitle>
                            <CardDescription>What&apos;s happening today?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {todayEntry ? (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-6 rounded-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-orange-600">SUBMITTED</Badge>
                                        <span className="text-xs font-bold text-orange-600">{format(new Date(todayEntry.date), 'MMMM d, yyyy')}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-orange-600 uppercase mb-1">What I accomplished</p>
                                        <FormattedText text={todayEntry.tasks_completed || ""} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-wider">What I&apos;m planning</label>
                                        <FormattedText text={todayEntry.tasks_planned || ""} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-red-600 uppercase mb-1">Blockers</p>
                                        <div className="text-sm text-red-700 dark:text-red-400">
                                            <FormattedText text={todayEntry.blockers || ""} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Accomplishments (Yesterday/Today)</label>
                                        <Textarea
                                            name="accomplished"
                                            placeholder="What did you get done?"
                                            className="min-h-[100px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Plans for Today</label>
                                        <Textarea
                                            name="planned"
                                            placeholder="What are you working on next?"
                                            className="min-h-[100px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Any Blockers?</label>
                                        <Textarea
                                            name="blockers"
                                            placeholder="Is anything holding you back?"
                                            className="min-h-[80px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Current Status</label>
                                        <Select name="status" defaultValue="on_track">
                                            <SelectTrigger className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="on_track">On Track</SelectItem>
                                                <SelectItem value="at_risk">At Risk</SelectItem>
                                                <SelectItem value="blocked">Blocked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 shadow-lg shadow-orange-500/20 shadow-orange-500/40 transition-all duration-300"
                                    >
                                        {isSubmitting ? "Submitting..." : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Submit Standup
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-bold">History</CardTitle>
                                            <CardDescription>Your previous standup entries</CardDescription>
                                        </div>
                                        <HistoryIcon className="h-5 w-5 text-primary" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {standups.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-400">
                                        <p className="text-sm font-medium">No previous entries yet</p>
                                    </div>
                                ) : (
                                    standups.map((entry, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:shadow-md transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">{entry.date === new Date().toISOString().slice(0, 10) ? 'Today&apos;s Update' : 'Previous Update'}</p>
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
                                                    {entry.notes && entry.notes.includes('_') ? entry.notes.replace('_', ' ').toUpperCase() : (entry.notes?.toUpperCase() || 'ON TRACK')}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">{entry.tasks_completed}</p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/20">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                        <TrendingUp className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg">Consistency Streak</h3>
                                        <p className="text-xs text-orange-100">You&apos;ve submitted 12 standups in a row!</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full" style={{ width: "85%" }} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
