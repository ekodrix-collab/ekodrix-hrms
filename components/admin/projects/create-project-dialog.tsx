"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Plus, Rocket, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createProjectAction } from "@/actions/projects";
import { getAllEmployeesAction } from "@/actions/tasks";
import { toast } from "sonner";

interface EmployeeOption {
    id: string;
    full_name: string | null;
    email: string;
    department?: string | null;
    avatar_url?: string | null;
}

export function CreateProjectDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState("none");
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

    const { data: employees = [] } = useQuery({
        queryKey: ["project-create-employees"],
        queryFn: async () => {
            const res = await getAllEmployeesAction();
            if (!res.ok) return [];
            return (res.data ?? []) as EmployeeOption[];
        },
        staleTime: 60_000,
    });

    const toggleTeamMember = (employeeId: string) => {
        setSelectedTeamIds((prev) => (
            prev.includes(employeeId)
                ? prev.filter((id) => id !== employeeId)
                : [...prev, employeeId]
        ));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        formData.set("projectManagerId", selectedManagerId === "none" ? "" : selectedManagerId);
        formData.set("teamMemberIds", JSON.stringify(selectedTeamIds));
        const res = await createProjectAction(formData);

        if (res.ok) {
            toast.success("Project created successfully!");
            setOpen(false);
            setSelectedManagerId("none");
            setSelectedTeamIds([]);
            onSuccess?.();
        } else {
            toast.error(res.message || "Failed to create project");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white font-black rounded-2xl px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    <Plus className="h-5 w-5 mr-2" />
                    New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-zinc-100 dark:border-zinc-800 p-8">
                <DialogHeader>
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Rocket className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Initiate Project</DialogTitle>
                    <DialogDescription className="font-medium text-zinc-500">
                        Define a new company objective and start tracking progress.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Project Name
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            placeholder="e.g. Q1 Marketing Campaign"
                            className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Objective
                        </Label>
                        <Textarea
                            id="description"
                            name="description"
                            placeholder="Describe the main goal of this project..."
                            className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contractAmount" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Contract Amount
                        </Label>
                        <Input
                            id="contractAmount"
                            name="contractAmount"
                            type="number"
                            step="0.01"
                            placeholder="e.g. 5000"
                            className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium h-12"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                                Priority
                            </Label>
                            <Select name="priority" defaultValue="medium">
                                <SelectTrigger className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-zinc-100 dark:border-zinc-800">
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deadline" className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                                Deadline
                            </Label>
                            <Input
                                id="deadline"
                                name="deadline"
                                type="date"
                                className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium h-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Project Manager
                        </Label>
                        <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                            <SelectTrigger className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium h-10">
                                <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-100 dark:border-zinc-800">
                                <SelectItem value="none">Unassigned</SelectItem>
                                {employees.map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id}>
                                        {employee.full_name || employee.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-tighter text-zinc-500">
                            Project Team
                        </Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-between rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium h-10"
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <Users className="h-4 w-4 text-zinc-500" />
                                        {selectedTeamIds.length > 0 ? `${selectedTeamIds.length} team member(s) selected` : "Select team members"}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-80 sm:w-[420px] max-h-72 overflow-y-auto rounded-xl border-zinc-100 dark:border-zinc-800">
                                <DropdownMenuLabel className="text-xs uppercase tracking-widest text-zinc-500 py-2 flex items-center justify-between">
                                    Team Members
                                    {employees.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] font-black uppercase tracking-tighter text-primary hover:text-primary/80 px-2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const allIds = employees.map(emp => emp.id);
                                                setSelectedTeamIds(selectedTeamIds.length === employees.length ? [] : allIds);
                                            }}
                                        >
                                            {selectedTeamIds.length === employees.length ? "Deselect All" : "Select All"}
                                        </Button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {employees.length === 0 && (
                                    <div className="px-2 py-3 text-sm text-zinc-500">No active employees available</div>
                                )}
                                {employees.map((employee) => (
                                    <DropdownMenuCheckboxItem
                                        key={employee.id}
                                        checked={selectedTeamIds.includes(employee.id)}
                                        onCheckedChange={() => toggleTeamMember(employee.id)}
                                        onSelect={(event) => event.preventDefault()}
                                        className="rounded-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={employee.avatar_url || undefined} />
                                                <AvatarFallback className="text-[10px]">{employee.full_name?.charAt(0) || "U"}</AvatarFallback>
                                            </Avatar>
                                            <span>{employee.full_name || employee.email}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedTeamIds.length > 0 && (
                            <p className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-green-600" />
                                Team members will be attached during project creation.
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-black rounded-xl h-12 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {loading ? "Creating..." : "Create Project"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
