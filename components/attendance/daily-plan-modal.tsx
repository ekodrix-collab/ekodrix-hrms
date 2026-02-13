"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { punchInAction } from "@/actions/attendance";
import { useAttendanceStore } from "@/store/attendance-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DailyPlanModal() {
  const { status, setPunchIn, setPlan } = useAttendanceStore();
  const [isOpen, setIsOpen] = React.useState(status === "offline");
  const [blockers, setBlockers] = React.useState("");

  React.useEffect(() => {
    if (status === "offline") setIsOpen(true);
  }, [status]);

  const onSubmit = () => {
    const fd = new FormData();
    fd.set("blockers", blockers);
    fd.set("focusTaskIds", "");

    void punchInAction(fd).then((res) => {
      if (!res.ok) {
        toast.error(res.message ?? "Failed to punch in");
        return;
      }
      const nowIso = new Date().toISOString();
      setPlan({ blockers, focusTaskIds: [] });
      setPunchIn(nowIso);
      setIsOpen(false);
      toast.success("Day started");
    });
  };

  if (!isOpen || status !== "offline") return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Good morning 👋</CardTitle>
            <CardDescription>
              Set your focus and share blockers before punching in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blockers">Any blockers today? (optional)</Label>
              <Input
                id="blockers"
                placeholder="Waiting on designs from UI team…"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Skip for now
              </Button>
              <Button onClick={onSubmit}>Punch in &amp; start day</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

