"use client";

import { useState } from "react";
import {
    Mail,
    RotateCcw,
    Trash2,
    User,
    Clock,
    CheckCircle2,
    XCircle,
    Building2,
    Shield
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    resendInvitation,
    cancelInvitation,
    getInvitationLink,
    getOrganizationEmployees,
    Employee
} from "@/actions/invitations";
import { Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";


interface EmployeeListProps {
    employees: Employee[];
}

export function EmployeeList({ employees: initialEmployees }: EmployeeListProps) {
    const queryClient = useQueryClient();
    const [loadingIds, setLoadingIds] = useState<string[]>([]);

    const { data } = useQuery({
        queryKey: ["admin-employees"],
        queryFn: async () => {
            const res = await getOrganizationEmployees();
            return res.employees as Employee[];
        },
        initialData: initialEmployees,
        refetchInterval: 30000,
    });

    const employees = data || [];

    const handleResend = async (userId: string) => {
        setLoadingIds(prev => [...prev, userId]);
        try {
            const result = await resendInvitation(userId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.message);
                if (result.manualLink) {
                    // If rate limit hit, prompt to copy
                    await navigator.clipboard.writeText(result.manualLink);
                    toast.info("Link copied to clipboard! (Email limit reached)", {
                        description: "You can send this link manually to the employee.",
                        duration: 6000
                    });
                }
            }
        } catch {
            toast.error("Failed to resend invitation");
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== userId));
        }
    };

    const handleCopyLink = async (userId: string) => {
        try {
            const result = await getInvitationLink(userId);
            if (result.error) {
                toast.error(result.error);
            } else if (result.manualLink) {
                await navigator.clipboard.writeText(result.manualLink);
                toast.success("Invitation link copied to clipboard!");
            }
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const handleCancel = async (userId: string) => {
        if (!confirm("Are you sure you want to cancel this invitation? This will delete the user account.")) {
            return;
        }

        setLoadingIds(prev => [...prev, userId]);
        try {
            const result = await cancelInvitation(userId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.message);
                queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
            }
        } catch {
            toast.error("Failed to cancel invitation");
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== userId));
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700 border-green-200";
            case "invited":
                return "bg-primary/10 text-primary border-primary/20";
            case "inactive":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active":
                return <CheckCircle2 className="mr-1 h-3 w-3" />;
            case "invited":
                return <Clock className="mr-1 h-3 w-3" />;
            case "inactive":
                return <XCircle className="mr-1 h-3 w-3" />;
            default:
                return null;
        }
    };

    if (employees.length === 0) {
        return (
            <div className="rounded-xl border border-dashed p-12 text-center bg-muted/20">
                <User className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold">No employees found</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                    Your team is currently empty. Invite your first employee to start managing your organization.
                </p>
                <Button variant="outline" className="mt-6" asChild>
                    <a href="/admin/employees/invite">Invite Now</a>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-1">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 transition-colors">
                                <th className="h-12 px-6 text-left font-semibold text-muted-foreground">Employee</th>
                                <th className="h-12 px-6 text-left font-semibold text-muted-foreground">Dept / Role</th>
                                <th className="h-12 px-6 text-left font-semibold text-muted-foreground">Status</th>
                                <th className="h-12 px-6 text-right font-semibold text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {employees.map((employee) => (
                                <tr key={employee.id} className="transition-colors hover:bg-muted/20">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary uppercase font-bold text-xs">
                                                {employee.full_name?.charAt(0) || "U"}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{employee.full_name}</span>
                                                <span className="text-xs text-muted-foreground flex items-center mt-0.5">
                                                    <Mail className="mr-1 h-3 w-3" />
                                                    {employee.email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center text-muted-foreground uppercase font-medium">
                                                <Building2 className="mr-1.5 h-3 w-3 shrink-0" />
                                                <span className="truncate max-w-[120px]">
                                                    {employee.department || "General"}
                                                </span>
                                            </div>
                                            <div className="flex items-center font-medium text-foreground/80">
                                                <Shield className="mr-1.5 h-3 w-3 shrink-0" />
                                                <span className="uppercase tracking-wider text-[10px]">
                                                    {employee.role}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(employee.status)}`}>
                                            {getStatusIcon(employee.status)}
                                            {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-primary hover:text-primary/90 hover:bg-primary/10"
                                            asChild
                                        >
                                            <a href={`/admin/employees/${employee.id}`} title="View Details">
                                                <User className="h-4 w-4" />
                                                <span className="ml-2 hidden lg:inline">Details</span>
                                            </a>
                                        </Button>
                                        {employee.status === "invited" && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => handleCopyLink(employee.id)}
                                                    title="Copy Invitation Link"
                                                >
                                                    <LinkIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5"
                                                    disabled={loadingIds.includes(employee.id)}
                                                    onClick={() => handleResend(employee.id)}
                                                >
                                                    <RotateCcw className={`h-3 w-3 ${loadingIds.includes(employee.id) ? 'animate-spin' : ''}`} />
                                                    Resend
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    disabled={loadingIds.includes(employee.id)}
                                                    onClick={() => handleCancel(employee.id)}
                                                    title="Cancel Invitation"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
