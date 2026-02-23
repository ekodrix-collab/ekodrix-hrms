"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaveRequest } from "@/types/leaves";
import { Calendar, Check, X, Clock, MessageSquare, Briefcase, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { updateLeaveStatusAction } from "@/actions/leaves";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AdminLeavesClientProps {
    initialRequests: LeaveRequest[];
}

export function AdminLeavesClient({ initialRequests }: AdminLeavesClientProps) {
    const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
    const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
        setLoading(id);
        const res = await updateLeaveStatusAction(id, status, reason);
        if (res.ok) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status, rejection_reason: reason } : r));
            toast.success(`Request ${status} successfully`);
            setIsRejectDialogOpen(false);
            setRejectionReason("");
        } else {
            toast.error(res.message || "Failed to update request");
        }
        setLoading(null);
    };

    const getStatusBadge = (status: LeaveRequest['status']) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20">Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
            case 'cancelled':
                return <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-zinc-200">Cancelled</Badge>;
            default:
                return <Badge className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20">Pending</Badge>;
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const otherRequests = requests.filter(r => r.status !== 'pending');

    return (
        <div className="space-y-8">
            {/* Pending Requests Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Pending Approvals ({pendingRequests.length})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {pendingRequests.length > 0 ? (
                        pendingRequests.map((request) => (
                            <Card key={request.id} className="border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="h-12 w-12 rounded-2xl border-2 border-white dark:border-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
                                            <AvatarImage src={request.user?.avatar_url} />
                                            <AvatarFallback className="bg-zinc-100 font-bold text-zinc-500">
                                                {request.user?.full_name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-zinc-900 dark:text-zinc-100">
                                                    {request.user?.full_name}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-zinc-200/50">
                                                    {request.user?.department || 'Employee'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                                </span>
                                                <span>•</span>
                                                <span className="font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{request.total_days} Days</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:max-w-xs flex-1">
                                        <div className="flex items-start gap-2 bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                                            <MessageSquare className="h-4 w-4 text-zinc-300 shrink-0 mt-0.5" />
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium italic line-clamp-2">
                                                "{request.reason || 'No reason provided'}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleStatusUpdate(request.id, 'approved')}
                                            disabled={loading === request.id}
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl px-4"
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedRequest(request);
                                                setIsRejectDialogOpen(true);
                                            }}
                                            disabled={loading === request.id}
                                            className="border-red-100 text-red-500 hover:bg-red-50 dark:border-red-900/20 dark:hover:bg-red-900/10 font-bold rounded-xl px-4"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/20 dark:bg-zinc-900/20">
                            <CheckCircle2 className="h-10 w-10 text-green-500/30 mx-auto mb-3" />
                            <p className="text-zinc-500 font-bold">All caught up! No pending requests.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* History Section */}
            <section className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-zinc-400" />
                    Processed Requests
                </h2>
                <div className="space-y-3">
                    {otherRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100/80 dark:border-zinc-800/80 bg-white/30 dark:bg-zinc-900/30">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border border-white dark:border-zinc-800">
                                    <AvatarImage src={request.user?.avatar_url} />
                                    <AvatarFallback className="text-[10px] font-bold">
                                        {request.user?.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{request.user?.full_name}</p>
                                    <p className="text-xs text-zinc-500 font-medium">
                                        {format(new Date(request.start_date), 'MMM d')} • {request.total_days} days • {request.leave_type?.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {getStatusBadge(request.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="rounded-[2rem] border-zinc-100 dark:border-zinc-800 p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Reject Request</DialogTitle>
                        <DialogDescription className="font-medium text-zinc-500">
                            Please provide a reason for rejecting this leave request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejectionReason" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                                Rejection Reason
                            </Label>
                            <Textarea
                                id="rejectionReason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="E.g., High workload during this period, insufficient notice..."
                                className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRejectDialogOpen(false)}
                            className="rounded-xl font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl"
                            onClick={() => selectedRequest && handleStatusUpdate(selectedRequest.id, 'rejected', rejectionReason)}
                            disabled={!rejectionReason || loading === selectedRequest?.id}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
