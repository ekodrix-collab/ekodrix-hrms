"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Standup } from "@/types/dashboard";
import { format } from "date-fns";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface EmployeeStandupsProps {
    standups: Standup[];
}

// Helper component to render multi-line text with proper formatting
function FormattedText({ text }: { text: string }) {
    if (!text) return <span className="text-zinc-400">None reported</span>;

    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 1) {
        return <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{lines[0]}</p>;
    }
    return (
        <ul className="space-y-1.5 list-none">
            {lines.map((line, idx) => (
                <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium flex items-start gap-2">
                    <span className="text-primary mt-1 text-xs">•</span>
                    <span className="flex-1">{line.trim()}</span>
                </li>
            ))}
        </ul>
    );
}

export function EmployeeStandups({ standups }: EmployeeStandupsProps) {
    return (
        <div className="space-y-4">
            {standups.length > 0 ? (
                standups.map((standup) => (
                    <Card key={standup.id} className="border-none shadow-sm bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
                        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <span>Standup for {format(new Date(standup.date), 'MMM dd, yyyy')}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{format(new Date(standup.created_at), 'hh:mm aa')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 grid gap-4">
                            <div className="grid gap-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center">
                                    <CheckCircle2 className="mr-1.5 h-3 w-3" />
                                    Completed
                                </h4>
                                <FormattedText text={standup.tasks_completed} />
                            </div>
                            <div className="grid gap-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center">
                                    <Circle className="mr-1.5 h-3 w-3" />
                                    Planned Today
                                </h4>
                                <FormattedText text={standup.tasks_planned} />
                            </div>
                            {standup.blockers && (
                                <div className="grid gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center">
                                        <AlertCircle className="mr-1.5 h-3 w-3" />
                                        Blockers
                                    </h4>
                                    <div className="text-sm text-red-700 dark:text-red-300 leading-relaxed font-bold">
                                        <FormattedText text={standup.blockers} />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card className="border-none shadow-sm bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-10 text-center">
                    <p className="text-sm font-bold text-muted-foreground opacity-40">No standup reports found.</p>
                </Card>
            )}
        </div>
    );
}
