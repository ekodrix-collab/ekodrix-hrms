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
import { Plus, Rocket } from "lucide-react";
import { createProjectAction } from "@/actions/projects";
import { toast } from "sonner";

export function CreateProjectDialog({ onSuccess }: { onSuccess?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const res = await createProjectAction(formData);

        if (res.ok) {
            toast.success("Project created successfully!");
            setOpen(false);
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
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-zinc-100 dark:border-zinc-800 p-8">
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
