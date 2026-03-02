"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, Zap } from "lucide-react";
import { toast } from "sonner";
import { signInWithPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { durations, easings } from "@/lib/animations";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onChange"
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      fd.set("password", values.password);
      const res = await signInWithPassword(fd);
      if (res && !res.ok) toast.error(res.message ?? "Login failed");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.slower, ease: easings.easeOut }}
    >
      <Card>
        <CardHeader className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: durations.slow, ease: easings.easeOut }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground shadow-soft">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black uppercase leading-none tracking-[0.1em]">Ekodrix</div>
              <div className="text-[11px] text-muted-foreground">HRMS Workspace</div>
            </div>
          </motion.div>
          <CardTitle className="text-2xl sm:text-[1.85rem]">Welcome back</CardTitle>
          <CardDescription className="text-sm">
            Sign in to continue to your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit, (err) => {
              const first = Object.values(err)[0];
              if (first?.message) toast.error(String(first.message));
            })}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: durations.normal, ease: easings.easeOut }}
              className="space-y-2"
            >
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email?.message ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: durations.normal, ease: easings.easeOut }}
              className="relative space-y-2"
            >
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-11"
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {form.formState.errors.password?.message ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </motion.div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !form.formState.isValid}
              onClick={() => {
                if (!form.formState.isValid) toast.error("Please fix the errors above.");
              }}
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              Demo admin: <span className="font-medium">admin@demo.com</span> /{" "}
              <span className="font-medium">admin123</span>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              New organization?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Create account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

