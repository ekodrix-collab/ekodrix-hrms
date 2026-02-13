"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { durations, easings } from "@/lib/animations";

const schema = z.object({
  email: z.string().email("Enter a valid email")
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onChange"
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      const res = await requestPasswordReset(fd);
      if (res.ok) toast.success("Password reset email sent (if the account exists).");
      else toast.error(res.message ?? "Failed to send reset email");
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
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>
            We’ll email you a secure reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
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
            </div>

            <Button type="submit" className="w-full" disabled={isPending || !form.formState.isValid}>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

