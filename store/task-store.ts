"use client";

import { create } from "zustand";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "urgent" | "high" | "medium" | "low";
  due_date: string | null;
  is_today_focus: boolean;
  position: number;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  setTasks: (tasks: Task[]) => void;
  upsertTask: (task: Task) => void;
  moveTask: (id: string, status: TaskStatus, position: number) => void;
  setLoading: (val: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  isLoading: false,
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => ({
      tasks: state.tasks.some((t) => t.id === task.id)
        ? state.tasks.map((t) => (t.id === task.id ? task : t))
        : [...state.tasks, task]
    })),
  moveTask: (id, status, position) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status, position } : t
      )
    })),
  setLoading: (val) => set({ isLoading: val })
}));

