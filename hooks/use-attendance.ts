"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAttendanceStore } from "@/store/attendance-store";
import { autoPunchOutAction, getAttendanceStatusAction } from "@/actions/attendance";
import { toast } from "sonner";

/**
 * Get today's date string in IST (YYYY-MM-DD)
 */
function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAttendance() {
  const store = useAttendanceStore();
  const autoClosedRef = useRef(false);

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
    if (attendanceStatus) {
      if (attendanceStatus.status === "on_break") {
        const { punchIn } = attendanceStatus;
        store.setStatus("on_break");
        if (punchIn) store.setPunchIn(punchIn);
      } else if (attendanceStatus.status === "working") {
        const { punchIn } = attendanceStatus;
        store.setStatus("working");
        if (punchIn) store.setPunchIn(punchIn);
      } else if (attendanceStatus.status === "completed") {
        const { punchIn, punchOut } = attendanceStatus;
        store.setStatus("completed");
        if (punchIn) store.setPunchIn(punchIn);
        if (punchOut) store.setPunchOut(punchOut);
      } else {
        store.setStatus("offline");
      }
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
