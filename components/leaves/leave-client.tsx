"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApplyLeaveDialog } from "./apply-leave-dialog";
import { LeaveBalance, LeaveRequest, LeaveType } from "@/types/leaves";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cancelLeaveRequestAction } from "@/actions/leaves";
import { toast } from "sonner";

interface LeaveClientProps {
    initialBalances: LeaveBalance[];
    initialRequests: LeaveRequest[];
    leaveTypes: LeaveType[];
}

export function LeaveClient({ initialBalances, initialRequests, leaveTypes }: LeaveClientProps) {
    const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
    const [isCancelling, setIsCancelling] = useState<string | null>(null);

    // Sync state with props when server data changes
    useEffect(() => {
        setRequests(initialRequests);
    }, [initialRequests]);

    const handleCancelRequest = async (id: string) => {
        setIsCancelling(id);
        const res = await cancelLeaveRequestAction(id);
        if (res.ok) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r));
            toast.success("Leave request cancelled successfully");
        } else {
            toast.error(res.message || "Failed to cancel request");
        }
        setIsCancelling(null);
    };

    const getStatusBadge = (status: LeaveRequest['status']) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20 hover:bg-green-500/20">Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">Rejected</Badge>;
            case 'cancelled':
                return <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-zinc-200">Cancelled</Badge>;
            default:
                return <Badge className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20">Pending</Badge>;
        }
    };

    return (
        <div className="space-y-8">
            {/* Balance Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {initialBalances.length > 0 ? (
                    initialBalances.map((balance) => (
                        <Card key={balance.id} className="relative overflow-hidden group border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm transition-all hover:shadow-md">
                            <div
                                className="absolute top-0 left-0 w-1 h-full rotate-0 transition-all group-hover:w-2"
                                style={{ backgroundColor: balance.leave_type?.color || '#3b82f6' }}
                            />
                            <CardHeader className="pb-2">
                                <CardDescription className="font-bold flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: balance.leave_type?.color || '#3b82f6' }}
                                    />
                                    {balance.leave_type?.name}
                                </CardDescription>
                                <CardTitle className="text-4xl font-black">
                                    {balance.entitlement - balance.used}
                                    <span className="text-sm text-zinc-400 font-medium ml-2">days left</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    <span>Used: {balance.used}</span>
                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                    <span>Total Entitlement: {balance.entitlement}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                        <AlertCircle className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                        <p className="text-zinc-500 font-medium whitespace-pre-wrap">No leave balances initialized. Please contact HR.</p>
                    </div>
                )}
            </div>

            {/* Requests Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    My Leave History
                </h2>
                <ApplyLeaveDialog leaveTypes={leaveTypes} />
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {requests.length > 0 ? (
                    requests.map((request) => (
                        <Card key={request.id} className="border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:shadow-sm transition-all overflow-hidden">
                            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="p-3 rounded-2xl shrink-0"
                                        style={{ backgroundColor: `${request.leave_type?.color || '#3b82f6'}15` }}
                                    >
                                        <Calendar className="h-5 w-5" style={{ color: request.leave_type?.color || '#3b82f6' }} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                                {format(new Date(request.start_date), 'MMM d, yyyy')}
                                                {request.start_date !== request.end_date && ` - ${format(new Date(request.end_date), 'MMM d, yyyy')}`}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-tighter">
                                                {request.total_days} {request.total_days === 1 ? 'Day' : 'Days'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-zinc-500 font-medium">
                                            {request.leave_type?.name} • {request.reason || 'No reason provided'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {getStatusBadge(request.status)}
                                    {request.status === 'pending' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10"
                                            onClick={() => handleCancelRequest(request.id)}
                                            disabled={isCancelling === request.id}
                                        >
                                            {isCancelling === request.id ? 'Cancelling...' : 'Cancel Request'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {request.status === 'rejected' && request.rejection_reason && (
                                <div className="px-5 pb-4 pt-0">
                                    <div className="bg-red-50/50 dark:bg-red-900/10 rounded-xl p-3 border border-red-100 dark:border-red-900/20">
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter mb-1">Rejection Reason</p>
                                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">{request.rejection_reason}</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/30 dark:bg-zinc-900/30">
                        <Clock className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">No Leave History</h3>
                        <p className="text-zinc-500 font-medium mt-1">You haven&apos;t requested any leaves yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
