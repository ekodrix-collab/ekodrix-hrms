"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Task, TaskStatus, useTaskStore } from "@/store/task-store";

export function useTasks() {
  const { tasks, setTasks, upsertTask, moveTask, isLoading, setLoading } =
    useTaskStore();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const init = async () => {
      setLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (data) {
        setTasks(
          data.map(
            (t): Task => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
              is_today_focus: t.is_today_focus,
              position: t.position ?? 0
            })
          )
        );
      }

      const channel = supabase
        .channel("tasks-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const t = payload.new as unknown as Task;
              upsertTask({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                due_date: t.due_date,
                is_today_focus: t.is_today_focus,
                position: t.position ?? 0
              });
            }
          }
        )
        .subscribe();

      setLoading(false);

      return () => {
        void supabase.removeChannel(channel);
      };
    };

    void init();
  }, [moveTask, setLoading, setTasks, upsertTask]);

  return {
    tasks,
    isLoading,
    moveTaskOptimistic: (id: string, status: TaskStatus, position: number) => {
      moveTask(id, status, position);
    }
  };
}

