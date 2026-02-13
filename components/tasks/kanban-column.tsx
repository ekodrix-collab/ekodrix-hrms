"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/store/task-store";
import { TaskCard } from "@/components/tasks/task-card";

interface Props {
  status: TaskStatus;
  title: string;
  tasks: Task[];
}

export function KanbanColumn({ title, tasks }: Props) {
  return (
    <div className="flex min-h-[200px] flex-1 flex-col rounded-lg border bg-muted/30 p-3">
      <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase text-muted-foreground">
        <span>{title}</span>
        <span>{tasks.length}</span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

