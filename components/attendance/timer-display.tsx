"use client";

import { useEffect, useState } from "react";
import { useAttendanceStore } from "@/store/attendance-store";

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function TimerDisplay() {
  const { punchInAt, punchOutAt, status } = useAttendanceStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "working" || !punchInAt) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [status, punchInAt]);

  if (!punchInAt) {
    return <span className="text-2xl font-semibold">0h 00m</span>;
  }

  const start = new Date(punchInAt).getTime();
  const end = punchOutAt ? new Date(punchOutAt).getTime() : now;

  return <span className="text-2xl font-semibold">{formatDuration(end - start)}</span>;
}

