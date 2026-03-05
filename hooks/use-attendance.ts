"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAttendanceStore } from "@/store/attendance-store";
import { autoPunchOutAction, getAttendanceStatusAction } from "@/actions/attendance";
import { toast } from "sonner";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAttendance() {
  const store = useAttendanceStore();

  const { data: attendanceStatus, isLoading } = useQuery({
    queryKey: ["attendance-status"],
    queryFn: async () => {
      const res = await getAttendanceStatusAction();
      return res.ok ? res : null;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Synchronize store with query data
  useEffect(() => {
    if (!attendanceStatus) return;

    const snapshot = useAttendanceStore.getState();

    if (attendanceStatus.status === "on_break") {
      const { punchIn } = attendanceStatus;
      if (punchIn && snapshot.punchInAt !== punchIn) {
        snapshot.setPunchIn(punchIn);
      }
      if (useAttendanceStore.getState().status !== "on_break") {
        useAttendanceStore.getState().setStatus("on_break");
      }
      return;
    }

    if (attendanceStatus.status === "working") {
      const { punchIn } = attendanceStatus;
      if (punchIn) {
        if (snapshot.punchInAt !== punchIn || snapshot.status !== "working") {
          snapshot.setPunchIn(punchIn);
        }
      } else if (snapshot.status !== "working") {
        snapshot.setStatus("working");
      }
      return;
    }

    if (attendanceStatus.status === "completed") {
      const { punchIn, punchOut } = attendanceStatus;
      if (punchIn && (snapshot.punchInAt !== punchIn || snapshot.status !== "working")) {
        snapshot.setPunchIn(punchIn);
      }
      if (punchOut && (useAttendanceStore.getState().punchOutAt !== punchOut || useAttendanceStore.getState().status !== "completed")) {
        useAttendanceStore.getState().setPunchOut(punchOut);
      } else if (!punchOut && useAttendanceStore.getState().status !== "completed") {
        useAttendanceStore.getState().setStatus("completed");
      }
      return;
    }

    if (snapshot.status !== "offline") {
      snapshot.setStatus("offline");
    }
  }, [attendanceStatus]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    // Periodic midnight check: every 60s
    const midnightInterval = setInterval(async () => {
      if (!mounted) return;

      const now = new Date();
      const istHour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          hour12: false
        }).format(now)
      );
      const istMinute = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          minute: "numeric"
        }).format(now)
      );

      if (istHour === 23 && istMinute >= 55) {
        const currentStatus = useAttendanceStore.getState().status;
        if (currentStatus === "working" || currentStatus === "on_break") {
          const {
            data: { user }
          } = await supabase.auth.getUser();
          if (!user) return;

          const { data: openSession } = await supabase
            .from("attendance")
            .select("id, date, punch_in")
            .eq("user_id", user.id)
            .is("punch_out", null)
            .order("punch_in", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (openSession) {
            const res = await autoPunchOutAction(openSession.id);
            if (res.ok) {
              useAttendanceStore.getState().setStatus("completed");
              queryClient.invalidateQueries({ queryKey: ["attendance-status"] });
              toast.info("Auto punch-out at 11:55 PM. Good night! 🌙", {
                duration: 8000
              });
            }
          }
        }
      }
    }, 60_000);

    return () => {
      mounted = false;
      clearInterval(midnightInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...store, isLoading };
}
