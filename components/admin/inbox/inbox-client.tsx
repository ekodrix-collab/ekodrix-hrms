"use client";

import { useState, useEffect } from "react";
import { InboxItem, toggleInboxHandledAction } from "@/actions/inbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, ChevronRight, AlertCircle, Calendar, Receipt, ClipboardCheck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface InboxClientProps {
    initialItems: InboxItem[];
}

export function InboxClient({ initialItems }: InboxClientProps) {
    const [items, setItems] = useState<InboxItem[]>(initialItems);
    const [loading, setLoading] = useState<string | null>(null);

    // Sync state with props when server data refreshes
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const handleToggleHandled = async (id: string, currentStatus: boolean) => {
        setLoading(id);
        const res = await toggleInboxHandledAction(id, !currentStatus);
        if (res.ok) {
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, is_handled: !currentStatus } : item
            ));
            toast.success("Inbox item updated");
        } else {
            toast.error(res.message || "Failed to update item");
        }
        setLoading(null);
    };

    const getIcon = (type: InboxItem['entity_type']) => {
        switch (type) {
            case 'leave_request': return <Calendar className="h-5 w-5 text-blue-500" />;
            case 'expense': return <Receipt className="h-5 w-5 text-green-500" />;
            case 'task_review': return <ClipboardCheck className="h-5 w-5 text-purple-500" />;
            default: return <AlertCircle className="h-5 w-5 text-zinc-500" />;
        }
    };

    const getLink = (item: InboxItem) => {
        switch (item.entity_type) {
            case 'leave_request': return "/admin/leaves";
            case 'expense': return "/admin/finance";
            case 'task_review': return "/admin/tasks";
            default: return "#";
        }
    };

    const unhandledItems = items.filter(i => !i.is_handled);
    const handledItems = items.filter(i => i.is_handled);

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Action Needed ({unhandledItems.length})
                    </h2>
                </div>

                <div className="space-y-3">
                    {unhandledItems.length > 0 ? (
                        unhandledItems.map((item) => (
                            <Card key={item.id} className="border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                                <CardContent className="p-0">
                                    <div className="p-4 md:p-6 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-700/50 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
                                                {getIcon(item.entity_type)}
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate uppercase tracking-tight">
                                                        {item.title}
                                                    </span>
                                                    {item.priority === 'high' || item.priority === 'urgent' ? (
                                                        <Badge variant="destructive" className="text-[8px] h-4 px-1 uppercase font-black">
                                                            {item.priority}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link href={getLink(item)}>
                                                <Button variant="ghost" size="sm" className="h-9 px-3 font-bold rounded-xl text-zinc-500 hover:text-primary hover:bg-primary/5">
                                                    Open <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 hover:border-primary hover:text-primary transition-colors"
                                                onClick={() => handleToggleHandled(item.id, item.is_handled)}
                                                disabled={loading === item.id}
                                            >
                                                <Check className={cn("h-4 w-4", loading === item.id && "animate-pulse")} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="px-6 pb-2">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            Received {format(new Date(item.created_at), 'PPP p')}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/20 dark:bg-zinc-900/20">
                            <ClipboardCheck className="h-12 w-12 text-zinc-200 dark:text-zinc-800 mx-auto mb-3" />
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">All actions completed</p>
                        </div>
                    )}
                </div>
            </section>

            {handledItems.length > 0 && (
                <section className="space-y-4 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <h2 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Recently Handled</h2>
                    <div className="space-y-2">
                        {handledItems.slice(0, 5).map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100/50 dark:border-zinc-800/50 opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50">
                                        <Check className="h-4 w-4 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{item.title}</p>
                                        <p className="text-[10px] text-zinc-500 font-medium">{format(new Date(item.updated_at || item.created_at), 'PPP')}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-600"
                                    onClick={() => handleToggleHandled(item.id, item.is_handled)}
                                    disabled={loading === item.id}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
