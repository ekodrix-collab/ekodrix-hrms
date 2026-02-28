import { CheckCircle2, Clock, Eye, ListTodo } from "lucide-react";

interface TaskStatsBarProps {
    tasks: Array<{ status: string }>;
    className?: string;
}

const statDefs = [
    {
        key: "todo",
        label: "To Do",
        icon: ListTodo,
        color: "text-zinc-500",
        bg: "bg-zinc-50 dark:bg-zinc-800/50",
        border: "border-zinc-100 dark:border-zinc-800",
        dot: "bg-zinc-400",
    },
    {
        key: "in_progress",
        label: "Working",
        icon: Clock,
        color: "text-amber-500",
        bg: "bg-amber-50/50 dark:bg-amber-900/10",
        border: "border-amber-100 dark:border-amber-900/30",
        dot: "bg-amber-400",
    },
    {
        key: "review",
        label: "In Review",
        icon: Eye,
        color: "text-purple-500",
        bg: "bg-purple-50/50 dark:bg-purple-900/10",
        border: "border-purple-100 dark:border-purple-900/30",
        dot: "bg-purple-400",
    },
    {
        key: "done",
        label: "Done",
        icon: CheckCircle2,
        color: "text-green-500",
        bg: "bg-green-50/50 dark:bg-green-900/10",
        border: "border-green-100 dark:border-green-900/30",
        dot: "bg-green-400",
    },
];

export function TaskStatsBar({ tasks, className = "" }: TaskStatsBarProps) {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
    tasks.forEach((t) => {
        if (t.status in counts) counts[t.status]++;
    });
    const total = tasks.length;

    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
            {statDefs.map(({ key, label, icon: Icon, color, bg, border, dot }) => (
                <div
                    key={key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${bg} ${border}`}
                >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${bg} border ${border}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-0.5">
                            {label}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                            <span className={`text-xl font-black leading-none ${color}`}>{counts[key]}</span>
                            {total > 0 && (
                                <span className="text-[9px] font-bold text-zinc-400">
                                    / {Math.round((counts[key] / total) * 100)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`ml-auto h-2 w-2 rounded-full ${dot} animate-pulse shrink-0`} />
                </div>
            ))}
        </div>
    );
}
