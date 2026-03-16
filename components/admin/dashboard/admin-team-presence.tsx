"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";

interface TeamMemberPresence {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    status: string;
    punch_in: string | null;
    punch_out: string | null;
}

interface AdminTeamPresenceProps {
    teamPresence?: TeamMemberPresence[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    triggerElement: React.ReactNode;
}

export function AdminTeamPresence({ teamPresence = [], isOpen, onOpenChange, triggerElement }: AdminTeamPresenceProps) {
    // Group members by status
    const workingMembers = teamPresence.filter(m => m.status === "present");
    const breakMembers = teamPresence.filter(m => m.status === "on_break");
    const punchedOutMembers = teamPresence.filter(m => m.status === "completed");

    const formatTime = (isoString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
        }).format(new Date(isoString));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {triggerElement}
            </DialogTrigger>

            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50">
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/50 space-y-3">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xl font-bold">Who&apos;s In Today</span>
                            <span className="text-xs font-medium text-zinc-500">
                                {workingMembers.length} working · {breakMembers.length} on break · {punchedOutMembers.length} punched out
                            </span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-0 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {teamPresence.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/20">
                            <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                            <p>No team members have punched in today.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Working & Break Members */}
                            <div className="p-2 space-y-1">
                                {workingMembers.length === 0 && breakMembers.length === 0 ? (
                                    <div className="p-8 text-center text-sm font-medium text-zinc-500">
                                        No active team members right now.
                                    </div>
                                ) : (
                                    [...workingMembers, ...breakMembers].map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-950 shadow-sm">
                                                        <AvatarImage src={member.avatar_url || ""} />
                                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                                                            {member.full_name?.charAt(0) || "U"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span
                                                        className={cn(
                                                            "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-950",
                                                            member.status === 'present' ? "bg-green-500" :
                                                                member.status === 'on_break' ? "bg-orange-500" :
                                                                    "bg-zinc-400"
                                                        )}
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {member.full_name || "Unknown"}
                                                    </span>
                                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                        {member.role === 'founder' ? 'Founder' : member.role || "Employee"}
                                                    </span>
                                                </div>
                                            </div>

                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "px-3 py-1 bg-white dark:bg-zinc-900 border shadow-sm",
                                                    member.status === 'present' ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50" :
                                                        member.status === 'on_break' ? "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50" :
                                                            "text-zinc-600 dark:text-zinc-400"
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        member.status === 'present' ? "bg-green-500 animate-pulse" :
                                                            member.status === 'on_break' ? "bg-orange-500" :
                                                                "bg-zinc-400"
                                                    )} />
                                                    {member.status === 'present' ? 'WORKING' :
                                                        member.status === 'on_break' ? 'ON BREAK' :
                                                            'COMPLETED'}
                                                </div>
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Punched Out Members Section */}
                            {punchedOutMembers.length > 0 && (
                                <div className="border-t border-red-100/50 dark:border-red-900/20 bg-red-50/30 dark:bg-red-950/10">
                                    <div className="px-5 py-3 text-xs font-black uppercase tracking-widest text-red-400 dark:text-red-500">
                                        Punched Out
                                    </div>
                                    <div className="p-2 pt-0 space-y-1">
                                        {punchedOutMembers.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 rounded-xl hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors opacity-75"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-950 shadow-sm grayscale opacity-80">
                                                            <AvatarImage src={member.avatar_url || ""} />
                                                            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-bold">
                                                                {member.full_name?.charAt(0) || "U"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-950 bg-red-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                            {member.full_name || "Unknown"}
                                                        </span>
                                                        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                            {member.role === 'founder' ? 'Founder' : member.role || "Employee"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge
                                                        variant="secondary"
                                                        className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 text-[10px]"
                                                    >
                                                        <div className="flex items-center gap-1 font-bold">
                                                            <span>✕</span> PUNCHED OUT
                                                        </div>
                                                    </Badge>
                                                    {member.punch_out && (
                                                        <span className="text-[10px] font-bold text-red-400/80 mr-1">
                                                            at {formatTime(member.punch_out)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-green-500">{workingMembers.length} WORKING</span>
                    <span className="text-orange-500">{breakMembers.length} ON BREAK</span>
                    <span className="text-blue-500">{punchedOutMembers.length} DONE</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper utility
function cn(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}
