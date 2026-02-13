// src/app/(auth)/set-password/page.tsx
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
import { KeyRound, Check, Eye, EyeOff, Loader2 } from "lucide-react";

const schema = z
    .object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type FormValues = z.infer<typeof schema>;

export default function SetPasswordPage() {
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const hasVerifiedToken = useRef(false);

    // Initial Authentication and Session Listener
    useEffect(() => {
        const initAuth = async () => {
            const params = new URLSearchParams(window.location.search);
            const token_hash = params.get("token_hash");
            const type = (params.get("type") as "signup" | "invite" | "recovery" | "email" | null) || "invite";

            // 1. Check if we have an access_token in the hash (comes from implicit flow redirects)
            const hash = window.location.hash;
            if (hash && hash.includes("access_token=")) {
                console.log("Set password page - Detected access_token in hash, attempting manual session set...");

                try {
                    // Extract tokens from hash fragment manually
                    const hashParams = new URLSearchParams(hash.substring(1)); // remove #
                    const access_token = hashParams.get("access_token");
                    const refresh_token = hashParams.get("refresh_token");

                    if (access_token) {
                        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                            access_token,
                            refresh_token: refresh_token || "",
                        });

                        if (sessionError) {
                            console.error("Manual setSession error:", sessionError.message);
                        } else if (sessionData.user) {
                            console.log("Set password page - Manual session set successful:", sessionData.user.email);
                            setUserEmail(sessionData.user.email || null);
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing hash fragment:", e);
                }

                // If manual set failed or still processing, wait a bit for Supabase core to catch it
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // 2. If we have a direct token_hash (Manual Link), verify it
            // ONLY if we don't have an active session yet
            if (token_hash && !hasVerifiedToken.current) {
                const { data: currentSession } = await supabase.auth.getSession();

                if (!currentSession.session) {
                    hasVerifiedToken.current = true;
                    console.log("Set password page - Verifying one-time token...");
                    const { data, error } = await supabase.auth.verifyOtp({
                        token_hash,
                        type,
                    });

                    if (error) {
                        console.error("Token verification failed:", error.message);
                        toast.error("Invitation link invalid or expired.");
                        setIsLoading(false);
                        return;
                    }

                    if (data.user) {
                        setUserEmail(data.user.email || null);
                        setIsLoading(false);
                        return;
                    }
                }
            }

            // 3. Continuous check for session (catches cookies and processed fragments)
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log("Set password page - Active session found:", session.user.email);
                setUserEmail(session.user.email || null);
                setIsLoading(false);
            } else if (!token_hash && !hash.includes("access_token=")) {
                // No session AND no way to get one (no token, no hash)
                console.warn("Set password page - No authentication method found");
                setIsLoading(false);
            }
        };

        initAuth();

        // 4. Listen for ALL auth changes (catches SIGNED_IN event from fragments)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Set password page - Auth event:", event, session?.user?.email);
            if (session?.user) {
                setUserEmail(session.user.email || null);
                setIsLoading(false);
            } else if (event === 'SIGNED_OUT') {
                setUserEmail(null);
            }
        });

        // 5. Patience: Wait for potential hash processing or cookie set
        const timer = setTimeout(() => {
            setIsLoading(true); // Ensure we don't flash "invalid" if still trying
            const checkAgain = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUserEmail(session.user.email || null);
                }
                setIsLoading(false);
            };
            checkAgain();
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [supabase]);

    const onSubmit = async (values: FormValues) => {
        startTransition(async () => {
            console.log("Setting password for:", userEmail);

            // Update the user's password
            const { error: updateError } = await supabase.auth.updateUser({
                password: values.password,
            });

            if (updateError) {
                console.error("Password update error:", updateError);
                toast.error(updateError.message);
                return;
            }

            console.log("Password updated successfully");

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("Session expired. Please try again.");
                router.push("/login");
                return;
            }

            // Update profile status to active
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ status: "active" })
                .eq("id", user.id);

            if (profileError) {
                console.error("Profile update error:", profileError);
                // Continue anyway - password is set
            }

            // Get role for redirect
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            console.log("Profile after update:", profile);

            toast.success("Password set successfully! Welcome to the team!");

            // Redirect based on role
            const redirectTo = profile?.role === "admin"
                ? "/admin/dashboard"
                : "/employee/dashboard";

            console.log("Redirecting to:", redirectTo);

            // Small delay to show success message
            setTimeout(() => {
                router.push(redirectTo);
            }, 1000);
        });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-lg">
                    <CardHeader className="space-y-4 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            <KeyRound className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">
                                {userEmail ? "Welcome to the Team!" : "Account Setup"}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                {userEmail ? (
                                    <>
                                        <span className="block text-sm font-medium text-foreground mb-1">
                                            {userEmail}
                                        </span>
                                        Create a secure password to complete your account setup
                                    </>
                                ) : (
                                    <span className="text-destructive font-medium">
                                        Invitation link invalid or expired. Please contact your administrator.
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {!userEmail ? (
                            <div className="space-y-4">
                                <Button className="w-full" onClick={() => router.push("/login")}>
                                    Go to Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pr-10"
                                            {...form.register("password")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    {form.formState.errors.password && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pr-10"
                                            {...form.register("confirmPassword")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    {form.formState.errors.confirmPassword && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Password requirements:
                                    </p>
                                    <ul className="text-xs text-muted-foreground space-y-0.5">
                                        <li>• At least 8 characters</li>
                                        <li>• One uppercase letter (A-Z)</li>
                                        <li>• One lowercase letter (a-z)</li>
                                        <li>• One number (0-9)</li>
                                    </ul>
                                </div>

                                <Button type="submit" className="w-full" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Setting up your account...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Complete Setup
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