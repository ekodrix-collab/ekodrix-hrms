"use client";

import React, { useState, useMemo } from "react";
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
import { createAdminTaskAction, updateAdminTaskAction } from "@/actions/tasks";
import { toast } from "sonner";
import { Loader2, X, PlusCircle, Zap, Users, Sparkles, Clock, AlertTriangle, Tag, Copy, Clipboard, Image as ImageIcon, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTaskAttachmentsAction } from "@/actions/tasks";
import { TaskAttachment } from "@/types/tasks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Employee {
    id: string;
    full_name: string;
    email: string;
    department?: string | null;
}

interface AdminTaskFormProps {
    employees: Employee[];
    onSuccess?: () => void;
    projectId?: string;
    projectOverview?: string;
    isMarketplaceDefault?: boolean;
    initialData?: {
        id: string;
        title: string;
        description: string;
        priority: string;
        status?: string;
        dueDate?: string;
        assignment_status: string;
        user_id?: string;
        subtasks: Subtask[];
        estimated_hours?: number | null;
        difficulty_score?: number | null;
        task_type?: string | null;
    };
    projectMembers?: { id: string }[];
    projectManagerId?: string;
    trigger?: React.ReactNode;
    readonly?: boolean;
}

interface Subtask {
    title: string;
    completed: boolean;
}

interface AiRefinedTask {
    title: string;
    description: string;
    subtasks: string[];
    estimated_hours: number;
    difficulty_score: number;
    priority: "Low" | "Medium" | "High";
    task_type: "Feature" | "Bug Fix" | "Improvement" | "Refactor";
}

const DIFFICULTY_LABELS: Record<number, string> = {
    1: "1 — Trivial",
    2: "2 — Small",
    3: "3 — Medium",
    4: "4 — Complex",
    5: "5 — Major",
};

export function AdminTaskForm({
    employees,
    onSuccess,
    projectId,
    projectOverview,
    isMarketplaceDefault = false,
    initialData,
    projectMembers,
    projectManagerId,
    trigger,
    readonly = false,
}: AdminTaskFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [roughInput, setRoughInput] = useState("");
    const [isPasting, setIsPasting] = useState(false);
    const [pasteValue, setPasteValue] = useState("");

    // Core task fields
    const [selectedEmployee, setSelectedEmployee] = useState<string>(
        initialData
            ? (initialData.assignment_status === 'open' ? 'marketplace' : (initialData.user_id || ""))
            : (isMarketplaceDefault ? "marketplace" : "")
    );
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [priority, setPriority] = useState(initialData?.priority || "medium");
    const [status, setStatus] = useState(initialData?.status || "todo");
    const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
    const [subtasks, setSubtasks] = useState<Subtask[]>(initialData?.subtasks || []);
    const [subtaskInput, setSubtaskInput] = useState("");
    const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
    const [editingSubtaskValue, setEditingSubtaskValue] = useState("");

    // AI-generated fields
    const [estimatedHours, setEstimatedHours] = useState<string>(
        initialData?.estimated_hours != null ? String(initialData.estimated_hours) : ""
    );
    const [difficultyScore, setDifficultyScore] = useState<string>(
        initialData?.difficulty_score != null ? String(initialData.difficulty_score) : ""
    );
    const [taskType, setTaskType] = useState<string>(initialData?.task_type || "");

    // Attachment fields
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Fetch attachments and user role if editing
    React.useEffect(() => {
        const supabase = createSupabaseBrowserClient();
        
        // Get user role
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
                    if (data) setUserRole(data.role);
                });
            }
        });

        if (initialData?.id && isOpen) {
            getTaskAttachmentsAction(initialData.id).then((res) => {
                if (res.ok && res.data) {
                    setAttachments(res.data);
                }
            });
        }
    }, [initialData?.id, isOpen]);

    // Filter employees if projectMembers is provided
    const displayEmployees = useMemo(() => {
        if (!projectMembers && !projectManagerId) return employees;

        const projectMemberIds = new Set(projectMembers?.map(m => m.id) || []);
        if (projectManagerId) projectMemberIds.add(projectManagerId);

        return employees.filter(emp =>
            projectMemberIds.has(emp.id) ||
            (initialData?.user_id && emp.id === initialData.user_id)
        );
    }, [employees, projectMembers, projectManagerId, initialData?.user_id]);

    const isMarketplace = selectedEmployee === "marketplace";

    const resetEditingSubtask = () => {
        setEditingSubtaskIndex(null);
        setEditingSubtaskValue("");
    };

    const addSubtask = () => {
        if (subtaskInput.trim()) {
            setSubtasks([...subtasks, { title: subtaskInput.trim(), completed: false }]);
            setSubtaskInput("");
        }
    };

    const removeSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
        if (editingSubtaskIndex === index) {
            resetEditingSubtask();
            return;
        }
        if (editingSubtaskIndex !== null && editingSubtaskIndex > index) {
            setEditingSubtaskIndex((prev) => (prev === null ? null : prev - 1));
        }
    };

    const startEditingSubtask = (index: number) => {
        setEditingSubtaskIndex(index);
        setEditingSubtaskValue(subtasks[index]?.title || "");
    };

    const saveEditingSubtask = () => {
        if (editingSubtaskIndex === null) return;

        const updatedTitle = editingSubtaskValue.trim();
        if (!updatedTitle) {
            toast.error("Subtask title cannot be empty");
            return;
        }

        setSubtasks(
            subtasks.map((subtask, index) =>
                index === editingSubtaskIndex ? { ...subtask, title: updatedTitle } : subtask
            )
        );
        resetEditingSubtask();
    };

    const handleRefineWithAI = async () => {
        if (!roughInput.trim()) {
            toast.error("Please describe the task briefly before refining");
            return;
        }

        setIsRefining(true);
        try {
            const res = await fetch("/api/ai/refine-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectOverview: projectOverview || "",
                    taskInput: roughInput.trim(),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "AI request failed");
            }

            const data: AiRefinedTask = await res.json();

            // Populate all fields
            setTitle(data.title);
            setDescription(data.description);
            setSubtasks(data.subtasks.map((s) => ({ title: s, completed: false })));
            setEstimatedHours(String(data.estimated_hours));
            setDifficultyScore(String(data.difficulty_score));
            setTaskType(data.task_type);
            // Map AI priority (Low/Medium/High) → system priority (low/medium/high/urgent)
            setPriority(data.priority.toLowerCase());

            toast.success("✨ Task refined by AI — review and edit before saving");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            toast.error(`AI refinement failed: ${message}`);
        } finally {
            setIsRefining(false);
        }
    };

    const handleCopyContext = () => {
        if (!roughInput.trim()) {
            toast.error("Please describe the task briefly before copying context");
            return;
        }

        const prompt = `You are an AI Task Structuring Assistant for an HRMS platform.

Your job is to convert a raw task input into a fully structured task object.

PROJECT CONTEXT:
${projectOverview || "Software project."}

SYSTEM RULES:
- Tasks are for a professional development team.
- Output must be actionable and implementation-ready.
- Break complex tasks into clear subtasks.
- Keep language simple and direct.

USER INPUT TASK:
"${roughInput.trim()}"

OUTPUT FORMAT (STRICT JSON):

{
  "title": "",
  "description": "",
  "priority": "Low | Medium | High",
  "status": "To Do",
  "estimated_hours": number,
  "difficulty": 1-5,
  "task_type": "Development | Design | Bug | Research | Other",
  "subtasks": [
    {
      "title": "",
      "description": ""
    }
  ]
}

RULES:
- Do NOT add extra fields
- ONLY return JSON
- No explanations`;

        navigator.clipboard.writeText(prompt);
        toast.success("Prompt copied! Paste into ChatGPT or Claude.");
    };

    const handleSmartPaste = () => {
        if (!pasteValue.trim()) {
            toast.error("Please paste the AI response first");
            return;
        }

        try {
            const jsonMatch = pasteValue.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in pasted text");
            
            const data = JSON.parse(jsonMatch[0]);

            // Map and Fill fields
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            
            if (data.priority) {
                const p = String(data.priority).toLowerCase();
                if (["low", "medium", "high", "urgent"].includes(p)) {
                    setPriority(p);
                } else if (p === "to do") {
                    setPriority("medium"); // Catch common mixups
                }
            }

            if (data.estimated_hours) setEstimatedHours(String(data.estimated_hours));
            
            const diff = data.difficulty || data.difficulty_score;
            if (diff) setDifficultyScore(String(Math.min(5, Math.max(1, Number(diff)))));

            if (data.task_type) {
                const t = String(data.task_type);
                // Try to map to existing select values if possible
                if (["Feature", "Bug Fix", "Improvement", "Refactor"].includes(t)) {
                    setTaskType(t);
                } else if (t === "Development") {
                    setTaskType("Feature");
                } else if (t === "Bug") {
                    setTaskType("Bug Fix");
                } else if (t === "Design" || t === "Research" || t === "Other") {
                    setTaskType("Improvement"); // Fallback
                }
            }

            if (Array.isArray(data.subtasks)) {
                const mappedSubtasks = data.subtasks.map((s: any) => {
                    if (typeof s === "string") return { title: s, completed: false };
                    if (typeof s === "object" && s.title) return { title: s.title, completed: false };
                    return null;
                }).filter(Boolean);
                
                if (mappedSubtasks.length > 0) {
                    setSubtasks(mappedSubtasks);
                } else {
                    toast.warning("No valid subtasks found in JSON");
                }
            }

            toast.success("✨ Form auto-filled from pasted context!");
            setIsPasting(false);
            setPasteValue("");
        } catch (err) {
            toast.error("Invalid AI response — check JSON format");
            console.error(err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setPendingFiles((prev) => [...prev, ...files]);
        }
    };

    const removePendingFile = (index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDeleteAttachment = async (id: string) => {
        if (!confirm("Are you sure you want to delete this attachment?")) return;

        try {
            const res = await fetch("/api/tasks/attachments/delete", {
                method: "DELETE",
                body: JSON.stringify({ attachmentId: id }),
            });
            if (!res.ok) throw new Error("Delete failed");
            setAttachments((prev) => prev.filter((a) => a.id !== id));
            toast.success("Attachment deleted");
        } catch (err) {
            toast.error("Failed to delete attachment");
        }
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

        const parsedHours = estimatedHours ? parseFloat(estimatedHours) : undefined;
        const parsedScore = difficultyScore ? parseInt(difficultyScore, 10) : undefined;

        let result;
        if (initialData) {
            result = await updateAdminTaskAction({
                id: initialData.id,
                userId: isMarketplace ? null : selectedEmployee,
                title: title.trim(),
                description: description.trim(),
                priority,
                status: status as "todo" | "in_progress" | "review" | "done",
                dueDate: dueDate || undefined,
                isOpenAssignment: isMarketplace,
                subtasks: subtasks,
                estimatedHours: parsedHours,
                difficultyScore: parsedScore,
                taskType: taskType || undefined,
            });
        } else {
            result = await createAdminTaskAction({
                userId: isMarketplace ? "" : selectedEmployee,
                title: title.trim(),
                description: description.trim(),
                priority,
                status: status as "todo" | "in_progress" | "review" | "done",
                dueDate: dueDate || undefined,
                projectId: projectId,
                isOpenAssignment: isMarketplace,
                subtasks: subtasks,
                estimatedHours: parsedHours,
                difficultyScore: parsedScore,
                taskType: taskType || undefined,
            });
        }

        if (result.ok) {
            const taskId = initialData?.id || (result as any).task?.id;
            
            // Handle pending file uploads
            if (taskId && pendingFiles.length > 0) {
                setIsUploading(true);
                const uploadPromises = pendingFiles.map(async (file) => {
                    const formData = new FormData();
                    formData.append("taskId", taskId);
                    formData.append("file", file);
                    
                    const res = await fetch("/api/tasks/attachments/upload", {
                        method: "POST",
                        body: formData,
                    });
                    
                    if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
                    return res.json();
                });

                try {
                    await Promise.all(uploadPromises);
                    toast.success(pendingFiles.length === 1 ? "Image uploaded" : "Images uploaded");
                    setPendingFiles([]);
                } catch (err) {
                    toast.error("Some images failed to upload. You can retry from the edit form.");
                } finally {
                    setIsUploading(false);
                }
            }

            toast.success(initialData ? "Task updated successfully" : "Task created and assigned successfully");
            if (!initialData) {
                setTitle("");
                setDescription("");
                setPriority("medium");
                setStatus("todo");
                setDueDate("");
                setSelectedEmployee(isMarketplaceDefault ? "marketplace" : "");
                setSubtasks([]);
                setEstimatedHours("");
                setDifficultyScore("");
                setTaskType("");
                setRoughInput("");
                setAttachments([]);
            }
            setSubtaskInput("");
            resetEditingSubtask();
            setIsOpen(false);
            onSuccess?.();
        } else {
            toast.error(result.message || "Failed to save task");
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    setSubtaskInput("");
                    resetEditingSubtask();
                }
            }}
        >
            {trigger ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg rounded-2xl px-6 font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95"
                >
                    <PlusCircle className="h-5 w-5" />
                    Add Project Task
                </Button>
            )}

            <DialogContent className="sm:max-w-[780px] rounded-[2.5rem] p-0 border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                <Zap className="h-3.5 w-3.5 fill-current" />
                                Task Management
                            </div>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white italic">
                                {initialData ? "Edit Task" : "Assign Task"}
                            </DialogTitle>
                            <DialogDescription className="font-medium text-zinc-500 mt-2">
                                {initialData ? "Update the task details and assignment." : "Define the objective and assign it to a team member or the marketplace."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">

                        {/* ── AI Refine Section ─────────────────────────────── */}
                        {!readonly && (
                            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-100 dark:border-violet-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-violet-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">AI Task Refinement</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyContext}
                                            className="h-7 px-2 text-[10px] font-bold text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 gap-1.5 rounded-lg"
                                        >
                                            <Copy className="h-3 w-3" />
                                            Copy Context
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsPasting(!isPasting)}
                                            className={`h-7 px-2 text-[10px] font-bold gap-1.5 rounded-lg ${isPasting ? "bg-violet-600 text-white hover:bg-violet-700" : "text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40"}`}
                                        >
                                            <Clipboard className="h-3 w-3" />
                                            Smart Paste
                                        </Button>
                                    </div>
                                </div>
                                
                                {!isPasting ? (
                                    <>
                                        <div className="flex gap-2">
                                            <Textarea
                                                placeholder='Briefly describe the task, e.g. "fix cart quantity issue" or "add user profile page"'
                                                value={roughInput}
                                                onChange={(e) => setRoughInput(e.target.value)}
                                                className="min-h-[72px] rounded-xl border-violet-100 dark:border-violet-800/40 bg-white/80 dark:bg-zinc-900/60 font-medium text-sm resize-none"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleRefineWithAI}
                                            disabled={isRefining || !roughInput.trim()}
                                            className="w-full h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-lg shadow-violet-500/20 transition-all active:scale-95 disabled:opacity-60"
                                        >
                                            {isRefining ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Refining with AI...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    ✨ Refine with AI
                                                </>
                                            )}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                        <Textarea
                                            placeholder="Paste the JSON response from ChatGPT/Claude here..."
                                            value={pasteValue}
                                            onChange={(e) => setPasteValue(e.target.value)}
                                            className="min-h-[120px] rounded-xl border-violet-200 dark:border-violet-800 bg-white dark:bg-zinc-900 font-mono text-xs"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                onClick={handleSmartPaste}
                                                className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl shadow-lg shadow-violet-500/20 transition-all active:scale-95"
                                            >
                                                Process AI Response
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => {
                                                    setIsPasting(false);
                                                    setPasteValue("");
                                                }}
                                                className="h-10 px-4 font-bold text-zinc-500 rounded-xl"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-violet-400 font-medium">
                                    AI will generate title, description, subtasks, estimated hours, difficulty &amp; type. You can edit all fields after.
                                </p>
                            </div>
                        )}

                        {/* ── Main Fields ──────────────────────────────────── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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
                                        placeholder="e.g., Fix Checkout Quantity Bug"
                                        required
                                        disabled={readonly}
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
                                        disabled={readonly}
                                        className="min-h-[120px] rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Assignment Strategy */}
                                <div className="space-y-2">
                                    <Label htmlFor="employee" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        Deployment Strategy
                                    </Label>
                                    <Select 
                                        value={selectedEmployee} 
                                        onValueChange={setSelectedEmployee}
                                        disabled={readonly}
                                    >
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
                                            {displayEmployees.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id} className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Users className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{emp.full_name}</span>
                                                            <span className="text-[10px] text-zinc-400 uppercase font-black">
                                                                {emp.id === projectManagerId ? 'Project Manager' : (emp.department || 'Staff')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Priority */}
                                    <div className="space-y-2">
                                        <Label htmlFor="priority" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            Priority
                                        </Label>
                                        <Select value={priority} onValueChange={setPriority} disabled={readonly}>
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
                                    {/* Status */}
                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            Status
                                        </Label>
                                        <Select value={status} onValueChange={setStatus} disabled={readonly}>
                                            <SelectTrigger id="status" className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="todo">To Do</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="review">Under Review</SelectItem>
                                                <SelectItem value="done">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="dueDate" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        Due Date
                                    </Label>
                                    <Input
                                        id="dueDate"
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        disabled={readonly}
                                        className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── AI Meta Fields ───────────────────────────────── */}
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            {/* Estimated Hours */}
                            <div className="space-y-2">
                                <Label htmlFor="estimatedHours" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" /> Est. Hours
                                </Label>
                                <Input
                                    id="estimatedHours"
                                    type="number"
                                    min="0.5"
                                    max="200"
                                    step="0.5"
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                    placeholder="e.g. 4"
                                    disabled={readonly}
                                    className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold"
                                />
                            </div>

                            {/* Difficulty */}
                            <div className="space-y-2">
                                <Label htmlFor="difficulty" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3" /> Difficulty
                                </Label>
                                <Select value={difficultyScore} onValueChange={setDifficultyScore} disabled={readonly}>
                                    <SelectTrigger id="difficulty" className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <SelectItem key={val} value={String(val)}>{DIFFICULTY_LABELS[val]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Task Type */}
                            <div className="space-y-2">
                                <Label htmlFor="taskType" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                    <Tag className="h-3 w-3" /> Type
                                </Label>
                                <Select value={taskType} onValueChange={setTaskType} disabled={readonly}>
                                    <SelectTrigger id="taskType" className="rounded-xl border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 font-bold">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Feature">Feature</SelectItem>
                                        <SelectItem value="Bug Fix">Bug Fix</SelectItem>
                                        <SelectItem value="Improvement">Improvement</SelectItem>
                                        <SelectItem value="Refactor">Refactor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* ── Subtasks ─────────────────────────────────────── */}
                        <div className="space-y-4 pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-8">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                    Action Items (Subtasks) 
                                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-zinc-100 text-zinc-500 border-none">{subtasks.length}</Badge>
                                </Label>
                                {!readonly && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={subtaskInput}
                                            onChange={(e) => setSubtaskInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                                            placeholder="Add subtask..."
                                            className="h-8 w-48 text-xs rounded-lg border-zinc-200"
                                        />
                                        <Button
                                            type="button"
                                            onClick={addSubtask}
                                            className="h-8 px-3 rounded-lg bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-wider"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar min-h-[50px]">
                                {subtasks.map((st, i) => (
                                    <div key={i} className="group relative flex items-center gap-3 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/60 hover:border-primary/20 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={st.completed}
                                            onChange={() => {
                                                if (readonly) return;
                                                setSubtasks(subtasks.map((s, idx) => idx === i ? { ...s, completed: !s.completed } : s));
                                            }}
                                            disabled={readonly}
                                            className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                                        />
                                        
                                        {editingSubtaskIndex === i ? (
                                            <Input
                                                autoFocus
                                                value={editingSubtaskValue}
                                                onChange={(e) => setEditingSubtaskValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        saveEditingSubtask();
                                                    }
                                                    if (e.key === "Escape") {
                                                        e.preventDefault();
                                                        resetEditingSubtask();
                                                    }
                                                }}
                                                className="h-9 flex-1 rounded-lg border-zinc-200 bg-white text-sm font-medium"
                                            />
                                        ) : (
                                            <span className={`text-sm font-bold flex-1 ${st.completed ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                                                {st.title}
                                            </span>
                                        )}

                                        {!readonly && (
                                            <div className="flex items-center gap-1">
                                                {editingSubtaskIndex === i ? (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-[11px] font-bold text-primary"
                                                            onClick={saveEditingSubtask}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-[11px] font-bold text-zinc-500"
                                                            onClick={resetEditingSubtask}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-primary"
                                                            onClick={() => startEditingSubtask(i)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                                                            onClick={() => removeSubtask(i)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {subtasks.length === 0 && (
                                    <div className="text-center py-8 rounded-2xl border-2 border-dashed border-zinc-100/50">
                                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">No breakdown provided</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Attachments ──────────────────────────────────── */}
                        <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-6 pb-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                    <ImageIcon className="h-3 w-3" /> Image Attachments
                                </Label>
                                {!readonly && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg border-zinc-200"
                                    >
                                        <PlusCircle className="h-3 w-3" />
                                        Upload Images
                                    </Button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2 min-h-[50px]">
                                {/* Saved Attachments */}
                                {attachments.map((att) => (
                                    <div key={att.id} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group bg-zinc-100">
                                        <img
                                            src={att.image_url}
                                            alt="Attachment"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImageUrl(att.image_url)}
                                                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                                            >
                                                <Eye className="h-4 w-4 text-white" />
                                            </button>
                                            {userRole === "admin" && !readonly && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                    className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4 text-white" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Pending Uploads */}
                                {pendingFiles.map((file, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 border-dashed group bg-zinc-50 flex items-center justify-center">
                                        <div className="text-[8px] font-bold text-zinc-400 uppercase text-center px-1 break-all">
                                            {file.name}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImageUrl(URL.createObjectURL(file))}
                                                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                                            >
                                                <Eye className="h-4 w-4 text-white" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removePendingFile(i)}
                                                className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-colors"
                                            >
                                                <X className="h-4 w-4 text-white" />
                                            </button>
                                        </div>
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {attachments.length === 0 && pendingFiles.length === 0 && (
                                    <div 
                                        onClick={() => !readonly && fileInputRef.current?.click()}
                                        className={`col-span-full py-8 rounded-2xl border-2 border-dashed border-zinc-100/50 flex flex-col items-center justify-center gap-2 ${readonly ? "" : "cursor-pointer hover:bg-zinc-50 transition-colors"}`}
                                    >
                                        <ImageIcon className="h-6 w-6 text-zinc-200" />
                                        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-center">
                                            No images attached<br />
                                            {!readonly && <span className="text-blue-500/50 lowercase font-medium">click to upload screenshots or references</span>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {!readonly && (
                        <div className="p-8 pt-4 bg-zinc-50/50 dark:bg-zinc-100/5 border-t border-zinc-100 dark:border-zinc-800">
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
                                            {initialData ? "Updating..." : "Creating..."}
                                        </>
                                    ) : (
                                        initialData ? "Update Task" : "Create Task"
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </form>

                {/* Full-screen Image Preview Overlay (FIT TO SCREEN) */}
                {previewImageUrl && (
                    <div 
                        className="fixed inset-0 z-[100] bg-black/90 animate-in fade-in duration-200 flex items-center justify-center p-4 md:p-10"
                        onClick={() => setPreviewImageUrl(null)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all z-[110]"
                            title="Close Preview"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <img
                            src={previewImageUrl}
                            alt="Full screen preview"
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
