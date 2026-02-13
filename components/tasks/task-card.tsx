"use client";

import { motion } from "framer-motion";
import { DraggableAttributes } from "@dnd-kit/core";
import { Task } from "@/store/task-store";

interface Props {
  task: Task;
  dragAttributes?: DraggableAttributes;
}

const priorityColors: Record<Task["priority"], string> = {
  urgent: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-yellow-500/10 text-yellow-600",
  low: "bg-emerald-500/10 text-emerald-500"
};

export function TaskCard({ task }: Props) {
  return (
    <motion.div
      layout
      whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
      className="cursor-grab rounded-md border bg-card p-3 text-sm shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}
        >
          {task.priority.toUpperCase()}
        </span>
        {task.is_today_focus && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            Today&apos;s focus
          </span>
        )}
      </div>
      <div className="font-medium">{task.title}</div>
    </motion.div>
  );
}

