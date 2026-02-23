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
import { Loader2, UserPlus, X, PlusCircle, LayoutGrid, Zap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Employee {
    id: string;
    full_name: string;
    email: string;
    department?: string;
}

interface AdminTaskFormProps {
    employees: Employee[];
    onSuccess?: () => void;
    projectId?: string;
    isMarketplaceDefault?: boolean;
}

interface Subtask {
    title: string;
    completed: boolean;
}

export function AdminTaskForm({
    employees,
    onSuccess,
    projectId,
    isMarketplaceDefault = false
}: AdminTaskFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<string>(isMarketplaceDefault ? "marketplace" : "");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [subtaskInput, setSubtaskInput] = useState("");

    const isMarketplace = selectedEmployee === "marketplace";

    const addSubtask = () => {
        if (subtaskInput.trim()) {
            setSubtasks([...subtasks, { title: subtaskInput.trim(), completed: false }]);
            setSubtaskInput("");
        }
    };

    const removeSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmployee) {
            toast.error("Please select an employee or Marketplace");
            return;
        }

        if (!title.trim()) {
            toast.error("Task title is required");
            return;
        }

        setIsSubmitting(true);

        const result = await createAdminTaskAction({
            userId: isMarketplace ? "" : selectedEmployee,
            title: title.trim(),
            description: description.trim(),
            priority,
            dueDate: dueDate || undefined,
            projectId: projectId,
            isOpenAssignment: isMarketplace,
            subtasks: subtasks
        });

        setIsSubmitting(false);

        if (result.ok) {
            toast.success("Task created and assigned successfully");
            // Reset form
            setTitle("");
            setDescription("");
            setPriority("medium");
            setDueDate("");
            setSelectedEmployee(isMarketplaceDefault ? "marketplace" : "");
            setSubtasks([]);
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
                className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg rounded-2xl px-6 font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95"
            >
                <PlusCircle className="h-5 w-5" />
                Add Project Task
            </Button>

            <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] p-0 border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                <PlusCircle className="h-6 w-6 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Create New Task</DialogTitle>
                            <DialogDescription className="font-medium text-zinc-500">
                                Define the objective and assign it to a team member or the marketplace.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-6">
                                {/* Task Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        Objective Title *
                                    </Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., UI Refinement"
                                        required
                                        className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        Detailed Brief
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What needs to be done?"
                                        className="min-h-[120px] rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Assignment Strategy */}
                                <div className="space-y-2">
                                    <Label htmlFor="employee" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        Deployment Strategy
                                    </Label>
                                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                        <SelectTrigger id="employee" className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold h-12">
                                            <SelectValue placeholder="Select Strategy" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-zinc-100 dark:border-zinc-800 mt-2">
                                            <SelectItem value="marketplace" className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                        <Zap className="h-4 w-4 text-blue-500 fill-current" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">Task Marketplace</span>
                                                        <span className="text-[10px] text-zinc-400 uppercase font-black">Open Assignment</span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                            {employees.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id} className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Users className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{emp.full_name}</span>
                                                            <span className="text-[10px] text-zinc-400 uppercase font-black">{emp.department || 'Staff'}</span>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="priority" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            Priority
                                        </Label>
                                        <Select value={priority} onValueChange={setPriority}>
                                            <SelectTrigger id="priority" className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                                <SelectItem value="high">🟠 High</SelectItem>
                                                <SelectItem value="medium">🟡 Medium</SelectItem>
                                                <SelectItem value="low">🟢 Low</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dueDate" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            Due Date
                                        </Label>
                                        <Input
                                            id="dueDate"
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtasks Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    Action Items (Subtasks)
                                </Label>
                                <Badge variant="secondary" className="text-[10px] font-black uppercase px-2 h-5 rounded-lg bg-zinc-100 text-zinc-500">
                                    {subtasks.length} Breakdown
                                </Badge>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g., Draft initial design..."
                                    value={subtaskInput}
                                    onChange={(e) => setSubtaskInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addSubtask();
                                        }
                                    }}
                                    className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium h-11"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addSubtask}
                                    className="rounded-xl border-zinc-200 h-11 px-4 font-bold"
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {subtasks.map((st, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-zinc-50/80 dark:bg-zinc-900/80 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 group animate-in slide-in-from-left-2 duration-300">
                                        <div className="h-5 w-5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0" />
                                        <span className="flex-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">{st.title}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => removeSubtask(i)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {subtasks.length === 0 && (
                                    <div className="text-center py-8 rounded-2xl border-2 border-dashed border-zinc-100/50">
                                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">No breakdown provided</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="p-8 pt-4 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800">
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                                className="font-bold text-zinc-500 rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-primary hover:bg-primary/90 text-white font-black px-8 rounded-2xl shadow-xl shadow-primary/20 h-12 min-w-[160px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Task"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
