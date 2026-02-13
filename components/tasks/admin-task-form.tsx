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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAdminTaskAction } from "@/actions/tasks";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface Employee {
    id: string;
    full_name: string;
    email: string;
    department?: string;
}

interface AdminTaskFormProps {
    employees: Employee[];
    onSuccess?: () => void;
}

export function AdminTaskForm({ employees, onSuccess }: AdminTaskFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployee) {
            toast.error("Please select an employee");
            return;
        }

        if (!title.trim()) {
            toast.error("Task title is required");
            return;
        }

        setIsSubmitting(true);

        const result = await createAdminTaskAction({
            userId: selectedEmployee,
            title: title.trim(),
            description: description.trim(),
            priority,
            dueDate: dueDate || undefined,
        });

        setIsSubmitting(false);

        if (result.ok) {
            toast.success("Task assigned successfully");
            // Reset form
            setTitle("");
            setDescription("");
            setPriority("medium");
            setDueDate("");
            setSelectedEmployee("");
            setIsOpen(false);
            onSuccess?.();
        } else {
            toast.error(result.message || "Failed to create task");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button
                onClick={() => setIsOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
            >
                <UserPlus className="h-4 w-4" />
                Assign Task
            </Button>

            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Assign New Task</DialogTitle>
                        <DialogDescription>
                            Create and assign a task to an employee. They will be notified immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Employee Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="employee">Assign to Employee *</Label>
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger id="employee" className="w-full">
                                    <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">{emp.full_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {emp.email} {emp.department && `• ${emp.department}`}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Task Title */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Task Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Complete Q1 Report"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add task details, requirements, or context..."
                                className="min-h-[100px]"
                            />
                        </div>

                        {/* Priority & Due Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger id="priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                        <SelectItem value="high">🟠 High</SelectItem>
                                        <SelectItem value="medium">🟡 Medium</SelectItem>
                                        <SelectItem value="low">🟢 Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                "Assign Task"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
