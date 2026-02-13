"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateEmployeeSalary } from "@/actions/employees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";


import { Profile } from "@/types/auth";

interface EmployeeCompensationProps {
    profile: Profile;
}

export function EmployeeCompensation({ profile }: EmployeeCompensationProps) {
    const [salary, setSalary] = useState(profile.monthly_salary?.toString() || "0");
    const [currency, setCurrency] = useState(profile.currency || "INR");
    const [isEditing, setIsEditing] = useState(false);

    const mutation = useMutation({
        mutationFn: (data: { salary: number, currency: string }) => updateEmployeeSalary(profile.id, data.salary, data.currency),
        onSuccess: (res) => {
            if (res.success) {
                toast.success("Compensation details updated");
                setIsEditing(false);
                // Invalidate queries if needed, though server action revalidates path
            } else {
                toast.error(res.error || "Failed to update compensation");
            }
        },
        onError: () => {
            toast.error("An error occurred");
        }
    });

    const handleSave = () => {
        if (!salary || isNaN(Number(salary))) {
            toast.error("Please enter a valid salary amount");
            return;
        }
        mutation.mutate({ salary: Number(salary), currency });
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Compensation Package</CardTitle>
                            <CardDescription>Manage salary and payment details for this employee.</CardDescription>
                        </div>
                        <Badge variant={isEditing ? "default" : "outline"} className="uppercase tracking-widest text-[10px] font-black">
                            {isEditing ? "Editing Mode" : "View Only"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Current Salary Display */}
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-xl shadow-primary/20">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-primary-foreground/80 text-xs font-bold uppercase tracking-widest">Monthly Base Pay</p>
                                        <h3 className="text-3xl font-black tracking-tight">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(Number(salary))}
                                        </h3>
                                    </div>
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <DollarSign className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-primary-foreground/70 text-xs font-medium">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active Payroll • Disbursed Monthly
                                </div>
                            </div>

                            {!isEditing && (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full font-bold"
                                    variant="outline"
                                >
                                    Adjust Compensation
                                </Button>
                            )}
                        </div>

                        {/* Edit Form */}
                        <div className={`space-y-4 ${!isEditing ? 'opacity-50 pointer-events-none grayscale' : ''} transition-all duration-300`}>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monthly Salary Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₹</span>
                                    <Input
                                        type="number"
                                        value={salary}
                                        onChange={(e) => setSalary(e.target.value)}
                                        className="pl-8 font-mono font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Currency</Label>
                                <Input
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="font-mono font-bold uppercase"
                                    maxLength={3}
                                />
                            </div>

                            {isEditing && (
                                <div className="pt-4 flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setSalary(profile.monthly_salary?.toString() || "0");
                                        }}
                                        className="flex-1 font-bold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={mutation.isPending}
                                        className="flex-1 bg-primary hover:bg-primary/90 font-bold text-white shadow-lg shadow-primary/20"
                                    >
                                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Update Salary
                                    </Button>
                                </div>
                            )}

                            {!isEditing && (
                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
                                        Changes to salary will be reflected in the next generated accrual cycle. Past records in the Finance Ledger will remain unchanged.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
