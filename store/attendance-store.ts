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
  setStatus: (status) => set({ status }),
  setPunchIn: (iso) => set({ punchInAt: iso, status: "working" }),
  setPunchOut: (iso) => set({ punchOutAt: iso, status: "completed" }),
  setBreak: (isOnBreak) => set({ status: isOnBreak ? "on_break" : "working" }),
  setPlan: ({ blockers, focusTaskIds }) => set({ blockers, focusTaskIds })
}));

