// src/app/(dashboard)/admin/employees/invite/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { inviteEmployee } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, UserPlus, CheckCircle, Copy, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

const schema = z.object({
    email: z.string().email("Enter a valid email"),
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    department: z.string().optional(),
    designation: z.string().optional(),
    role: z.enum(["admin", "employee"]),
});

type FormValues = z.infer<typeof schema>;

const departments = [
    { value: "engineering", label: "Engineering" },
    { value: "design", label: "Design" },
    { value: "marketing", label: "Marketing" },
    { value: "sales", label: "Sales" },
    { value: "hr", label: "Human Resources" },
    { value: "finance", label: "Finance" },
    { value: "operations", label: "Operations" },
];

export default function InviteEmployeePage() {
    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);
    const [invitedEmail, setInvitedEmail] = useState("");
    const [manualLink, setManualLink] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: "",
            fullName: "",
            department: "",
            designation: "",
            role: "employee",
        },
    });

    const onSubmit = (values: FormValues) => {
        startTransition(async () => {
            const result = await inviteEmployee({
                email: values.email,
                fullName: values.fullName,
                department: values.department,
                designation: values.designation,
                role: values.role,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            setInvitedEmail(values.email);
            setManualLink(result.manualLink || null);
            setSuccess(true);
            toast.success(result.message);
            form.reset();
        });
    };

    return (
        <div className="container max-w-2xl py-8">
            <div className="mb-6">
                <Link
                    href="/admin/employees"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Employees
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <UserPlus className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Invite Team Member</CardTitle>
                                <CardDescription>
                                    Send an invitation email to join your organization
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-4 text-center py-6"
                            >
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-green-800">
                                        Invitation Sent!
                                    </h3>
                                    <p className="mt-2 text-muted-foreground">
                                        An invitation email has been sent to{" "}
                                        <strong>{invitedEmail}</strong>
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        They will receive a link to set their password and join.
                                    </p>

                                    {manualLink && (
                                        <div className="mt-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-left">
                                            <div className="flex items-center gap-2 text-yellow-800 font-semibold text-sm mb-2">
                                                <LinkIcon className="h-4 w-4" />
                                                Manual Invitation Link
                                            </div>
                                            <p className="text-xs text-yellow-700 mb-3">
                                                The email limit was reached, but the invitation was created.
                                                Please copy and send this link to the employee directly.
                                            </p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-white border rounded px-3 py-2 text-xs font-mono truncate">
                                                    {manualLink}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="shrink-0"
                                                    onClick={async () => {
                                                        await navigator.clipboard.writeText(manualLink);
                                                        toast.success("Link copied!");
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3 mr-1" />
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setSuccess(false)}
                                >
                                    Invite Another
                                </Button>
                            </motion.div>
                        ) : (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">
                                            Email Address <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="colleague@company.com"
                                            {...form.register("email")}
                                        />
                                        {form.formState.errors.email && (
                                            <p className="text-sm text-destructive">
                                                {form.formState.errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">
                                            Full Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="fullName"
                                            placeholder="John Doe"
                                            {...form.register("fullName")}
                                        />
                                        {form.formState.errors.fullName && (
                                            <p className="text-sm text-destructive">
                                                {form.formState.errors.fullName.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select
                                            value={form.watch("department") || undefined}
                                            onValueChange={(v) => form.setValue("department", v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((d) => (
                                                    <SelectItem key={d.value} value={d.value}>
                                                        {d.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="designation">Designation</Label>
                                        <Input
                                            id="designation"
                                            placeholder="Software Engineer"
                                            {...form.register("designation")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select
                                        value={form.watch("role")}
                                        onValueChange={(v: "admin" | "employee") =>
                                            form.setValue("role", v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="employee">Employee</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Admins can manage employees and settings
                                    </p>
                                </div>

                                <Button type="submit" className="w-full" disabled={isPending}>
                                    {isPending ? (
                                        "Sending Invitation..."
                                    ) : (
                                        <>
                                            <Mail className="mr-2 h-4 w-4" />
                                            Send Invitation
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}