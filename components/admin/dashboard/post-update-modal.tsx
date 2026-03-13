"use client";

import { type ReactElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { postDashboardUpdate } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Audience = "all" | "management" | "operations";

export function PostUpdateModal({ trigger }: { trigger?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setAudience("all");
  };

  const handleSubmit = () => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      toast.error("Please add an update message");
      return;
    }

    startTransition(async () => {
      const result = await postDashboardUpdate({
        title,
        message: normalizedMessage,
        audience,
      });

      if (!result.ok) {
        toast.error(result.message || "Failed to post update");
        return;
      }

      toast.success("Update posted to activity feed");
      setOpen(false);
      resetForm();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !isPending) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Post Update
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Post Team Update</DialogTitle>
          <DialogDescription>
            Share a concise operational update. It appears in the admin dashboard activity stream.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update-title">Title (optional)</Label>
            <Input
              id="update-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sprint checkpoint, Ops note, client alert..."
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="update-message">Message</Label>
            <Textarea
              id="update-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the update for your team..."
              className="min-h-[140px]"
              maxLength={600}
            />
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(value: Audience) => setAudience(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Posting..." : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
