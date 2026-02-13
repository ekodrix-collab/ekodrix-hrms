"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useTasks } from "@/hooks/use-tasks";
import { Task, TaskStatus, useTaskStore } from "@/store/task-store";
import { KanbanColumn } from "@/components/tasks/kanban-column";
import { moveTaskAction } from "@/actions/tasks";

const columns: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" }
];

export function KanbanBoard() {
  const sensors = useSensors(useSensor(PointerSensor));
  const { tasks } = useTasks();
  const { setTasks } = useTaskStore();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);
    if (!activeTask || !overTask) return;

    const newStatus = overTask.status as TaskStatus;
    const sameColumnTasks = tasks
      .filter((t) => t.status === newStatus)
      .sort((a, b) => a.position - b.position);

    const oldIndex = sameColumnTasks.findIndex((t) => t.id === active.id);
    const newIndex = sameColumnTasks.findIndex((t) => t.id === over.id);

    const reordered =
      oldIndex === -1 || newIndex === -1
        ? sameColumnTasks
        : arrayMove(sameColumnTasks, oldIndex, newIndex);

    const updated: Task[] = tasks.map((t) => {
      const idx = reordered.findIndex((r) => r.id === t.id);
      if (idx !== -1) {
        return { ...t, status: newStatus, position: idx };
      }
      return t.id === activeTask.id
        ? { ...t, status: newStatus, position: 0 }
        : t;
    });

    setTasks(updated);

    void moveTaskAction({
      id: activeTask.id,
      status: newStatus,
      position: 0
    }).then((res) => {
      if (!res.ok) toast.error(res.message ?? "Failed to reorder task");
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            status={col.id}
            title={col.title}
            tasks={tasks.filter((t) => t.status === col.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}


