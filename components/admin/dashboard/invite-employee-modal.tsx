"use client";

import { type ReactElement, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle, Copy, Link as LinkIcon, Mail, PlusCircle } from "lucide-react";
import { inviteEmployee } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(["admin", "employee", "founder"]),
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

export function InviteEmployeeModal({
  triggerClassName,
  trigger,
}: {
  triggerClassName?: string;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
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

  const resetState = () => {
    setSuccess(false);
    setInvitedEmail("");
    setManualLink(null);
    form.reset({
      email: "",
      fullName: "",
      department: "",
      designation: "",
      role: "employee",
    });
  };

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className={triggerClassName}>
            <PlusCircle className="h-4 w-4" />
            Invite Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>Send an invitation email to join your organization.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-green-800">Invitation Sent</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                An invitation email has been sent to <strong>{invitedEmail}</strong>.
              </p>
            </div>

            {manualLink && (
              <div className="mt-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-left">
                <div className="flex items-center gap-2 text-yellow-800 font-semibold text-sm mb-2">
                  <LinkIcon className="h-4 w-4" />
                  Manual Invitation Link
                </div>
                <p className="text-xs text-yellow-700 mb-3">
                  Email rate limit was reached. Copy and share this link directly.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border rounded px-3 py-2 text-xs font-mono truncate">
                    {manualLink}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={async () => {
                      await navigator.clipboard.writeText(manualLink);
                      toast.success("Link copied");
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetState();
                  setOpen(false);
                }}
              >
                Close
              </Button>
              <Button type="button" onClick={() => setSuccess(false)}>
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-full-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input id="invite-full-name" placeholder="John Doe" {...form.register("fullName")} />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={form.watch("department") || undefined}
                  onValueChange={(value) => form.setValue("department", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.value} value={department.value}>
                        {department.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-designation">Designation</Label>
                <Input
                  id="invite-designation"
                  placeholder="Software Engineer"
                  {...form.register("designation")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value: "admin" | "employee" | "founder") => form.setValue("role", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="founder">Founder</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  "Sending Invitation..."
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
