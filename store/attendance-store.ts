"use client";

import { create } from "zustand";

type Status = "offline" | "working" | "on_break" | "completed";

interface AttendanceState {
  status: Status;
  punchInAt?: string;
  punchOutAt?: string;
  blockers?: string;
  focusTaskIds: string[];
  setStatus: (status: Status) => void;
  setPunchIn: (iso: string) => void;
  setPunchOut: (iso: string) => void;
  setBreak: (isOnBreak: boolean) => void;
  setPlan: (params: { blockers?: string; focusTaskIds: string[] }) => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  status: "offline",
  focusTaskIds: [],
  setStatus: (status) =>
    set((state) => (state.status === status ? state : { status })),
  setPunchIn: (iso) =>
    set((state) =>
      state.punchInAt === iso && state.status === "working"
        ? state
        : { punchInAt: iso, status: "working" }
    ),
  setPunchOut: (iso) =>
    set((state) =>
      state.punchOutAt === iso && state.status === "completed"
        ? state
        : { punchOutAt: iso, status: "completed" }
    ),
  setBreak: (isOnBreak) =>
    set((state) => {
      const nextStatus = isOnBreak ? "on_break" : "working";
      return state.status === nextStatus ? state : { status: nextStatus };
    }),
  setPlan: ({ blockers, focusTaskIds }) => set({ blockers, focusTaskIds })
}));

