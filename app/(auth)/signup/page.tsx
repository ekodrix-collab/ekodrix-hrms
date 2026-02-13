"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { signupOrganization } from "@/actions/signup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { durations, easings } from "@/lib/animations";

const schema = z.object({
    organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
    fullName: z.string().min(2, "Usage name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
    const [isPending, startTransition] = useTransition();
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { organizationName: "", fullName: "", email: "", password: "", confirmPassword: "" },
        mode: "onChange"
    });

    const onSubmit = (values: FormValues) => {
        startTransition(async () => {
            const res = await signupOrganization(values);
            if (res?.error) {
                toast.error(res.error);
            } else {
                // Success is handled by redirect in server action
            }
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: durations.slower, ease: easings.easeOut }}
                className="w-full max-w-md"
            >
                <Card className="shadow-lg">
                    <CardHeader className="space-y-2 text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: durations.slow, ease: easings.easeOut }}
                            className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20"
                        >
                            <span className="font-bold text-primary">HR</span>
                        </motion.div>
                        <CardTitle className="text-2xl">Create your workspace</CardTitle>
                        <CardDescription>Get started with WorkFlow Pro for free.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="organizationName">Organization Name</Label>
                                <Input
                                    id="organizationName"
                                    placeholder="Acme Corp"
                                    {...form.register("organizationName")}
                                />
                                {form.formState.errors.organizationName && (
                                    <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">Your Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="John Doe"
                                    {...form.register("fullName")}
                                />
                                {form.formState.errors.fullName && (
                                    <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Work Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    {...form.register("email")}
                                />
                                {form.formState.errors.email && (
                                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    {...form.register("password")}
                                />
                                {form.formState.errors.password && (
                                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    {...form.register("confirmPassword")}
                                />
                                {form.formState.errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isPending}
                            >
                                {isPending ? "Creating account..." : "Create Account"}
                            </Button>

                            <div className="pt-2 text-center text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link href="/login" className="font-medium text-primary hover:underline">
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
