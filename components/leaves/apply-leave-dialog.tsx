"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Info } from "lucide-react";
import { LeaveType } from "@/types/leaves";
import { applyLeaveAction } from "@/actions/leaves";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface ApplyLeaveDialogProps {
    leaveTypes: LeaveType[];
}

export function ApplyLeaveDialog({ leaveTypes }: ApplyLeaveDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isHalfDay, setIsHalfDay] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.append("isHalfDay", String(isHalfDay));

        const res = await applyLeaveAction(formData);

        if (res.ok) {
            toast.success("Leave application submitted successfully!");
            setOpen(false);
            // Refresh the page to show latest data
            window.location.reload();
        } else {
            toast.error(res.message || "Failed to submit leave application");
        }
        setLoading(false);
    };

    const isSameDay = startDate === endDate;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                    <Plus className="h-5 w-5 mr-2" />
                    Apply for Leave
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-zinc-100 dark:border-zinc-800 p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Apply for Leave</DialogTitle>
                    <DialogDescription className="font-medium text-zinc-500">
                        Submit your leave request for approval.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="leaveTypeId" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Leave Type
                        </Label>
                        <Select name="leaveTypeId" required>
                            <SelectTrigger className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-100 dark:border-zinc-800">
                                {leaveTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id} className="font-medium">
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                                From Date
                            </Label>
                            <Input
                                id="startDate"
                                name="startDate"
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    if (new Date(e.target.value) > new Date(endDate)) {
                                        setEndDate(e.target.value);
                                    }
                                }}
                                className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                                To Date
                            </Label>
                            <Input
                                id="endDate"
                                name="endDate"
                                type="date"
                                required
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium"
                            />
                        </div>
                    </div>

                    {isSameDay && (
                        <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <Checkbox
                                id="half-day"
                                checked={isHalfDay}
                                onCheckedChange={(checked) => setIsHalfDay(!!checked)}
                            />
                            <label
                                htmlFor="half-day"
                                className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Request as Half Day (0.5)
                            </label>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Reason
                        </Label>
                        <Textarea
                            id="reason"
                            name="reason"
                            required
                            placeholder="Brief explanation for your leave..."
                            className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-primary font-medium leading-relaxed">
                            Weekends (Sat & Sun) are automatically excluded from leave calculations.
                            Applications for dates resulting in 0 weekdays will be rejected.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-black rounded-xl h-12 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {loading ? "Submitting..." : "Submit Application"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
