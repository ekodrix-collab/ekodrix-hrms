"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
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
      <Card className="shadow-lg">
        <CardHeader className="space-y-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: durations.slow, ease: easings.easeOut }}
            className="flex items-center gap-2"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 ring-1 ring-primary/20" />
            <div>
              <div className="text-sm font-semibold leading-none">Ekodrix</div>
              <div className="text-xs text-muted-foreground">HRMS</div>
            </div>
          </motion.div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to continue to your workspace.</CardDescription>
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
              className="space-y-2"
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
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
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

