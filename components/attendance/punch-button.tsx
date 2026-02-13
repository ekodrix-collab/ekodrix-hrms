"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAttendanceStore } from "@/store/attendance-store";
import { punchOutAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";

export function PunchButton() {
  const { status, setPunchOut } = useAttendanceStore();
  const [isPending, setIsPending] = React.useState(false);

  if (status === "offline") {
    return (
      <Button disabled className="w-full">
        Punch in from the morning modal
      </Button>
    );
  }

  const isWorking = status === "working";

  const handlePunchOut = () => {
    setIsPending(true);
    void punchOutAction()
      .then((res) => {
        if (!res.ok) {
          toast.error(res.message ?? "Failed to punch out");
          return;
        }
        setPunchOut(new Date().toISOString());
        toast.success("Punched out");
      })
      .finally(() => setIsPending(false));
  };

  return (
    <motion.div
      animate={
        isWorking
          ? {
              boxShadow: [
                "0 0 0 0 rgba(34, 197, 94, 0.4)",
                "0 0 0 20px rgba(34, 197, 94, 0)"
              ]
            }
          : { boxShadow: "none" }
      }
      transition={
        isWorking
          ? { duration: 2, repeat: Infinity }
          : { duration: 0.3 }
      }
      className="rounded-full"
    >
      <Button
        className="w-full"
        disabled={isPending || status === "completed"}
        onClick={handlePunchOut}
      >
        {status === "completed"
          ? "Day completed"
          : isPending
          ? "Punching out..."
          : "Punch out"}
      </Button>
    </motion.div>
  );
}

