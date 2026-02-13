"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DueDateBadge } from "@/components/tasks/due-date-badge";
import {
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getTasksAction, createTaskAction, moveTaskAction, updateTaskAction, deleteTaskAction } from "@/actions/tasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "done";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  due_date?: string;
  status: TaskStatus;
  position: number;
  created_at: string;
}

// Sortable Task Card Component
function SortableTaskCard({
  task,
  onEdit,
  onDelete
}: {
  task: TaskItem & { assigned_by?: string };
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
    medium: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400",
    high: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 select-none">
      <Card className={`cursor-grab active:cursor-grabbing border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200 ${isDragging ? 'shadow-xl scale-105 rotate-1' : ''} group relative overflow-hidden`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-orange-500" : "bg-blue-500"}`} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-bold text-sm mb-1 truncate ${task.status === "done" ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}>{task.title}</h4>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {task.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Badge variant="outline" className={`text-[9px] uppercase font-black px-1.5 h-4 ${priorityColors[task.priority]}`}>
                  {task.priority}
                </Badge>
                {task.assigned_by && (
                  <Badge variant="secondary" className="text-[9px] uppercase font-black px-1.5 h-4">
                    ASSIGNED
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  <Calendar className="h-3 w-3" />
                  {task.created_at ? format(new Date(task.created_at), "MMM d") : "-"}
                </span>
                <DueDateBadge dueDate={task.due_date} showIcon={false} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable Column Component
function TaskColumn({
  title,
  status,
  tasks,
  color,
  icon: Icon,
  onEdit,
  onDelete
}: {
  title: string;
  status: TaskStatus;
  tasks: TaskItem[];
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <Card
      ref={setNodeRef}
      className={`border border-zinc-100 dark:border-zinc-800 transition-colors duration-200 ${isOver ? 'bg-primary/5 dark:bg-primary/10' : 'bg-white/40 dark:bg-zinc-900/40'} backdrop-blur-md flex flex-col h-full min-h-[600px] shadow-sm`}
    >
      <CardHeader className={`pb-4 border-b border-zinc-100 dark:border-zinc-800`}>
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="uppercase tracking-wider">{title}</span>
          </div>
          <Badge variant="secondary" className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 border-none">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-hide">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
              <p className="text-xs font-medium text-zinc-400">Drag tasks here</p>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export default function EmployeeTasksPage() {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["employee-tasks"],
    queryFn: async () => {
      const res = await getTasksAction();
      return res.ok ? res.data || [] : [];
    }
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    const overIndex = tasks.findIndex((t) => t.id === overId);

    let newTasks = [...tasks];
    let newStatus: TaskStatus = tasks[activeIndex].status;
    let newPosition = tasks[activeIndex].position;

    // Check if we're dropping on a column (status change)
    const isOverColumn = ["todo", "in_progress", "done"].includes(overId);

    if (isOverColumn) {
      newStatus = overId as TaskStatus;
      newTasks = tasks.map((task) =>
        task.id === activeId ? { ...task, status: newStatus } : task
      );
    } else if (activeIndex !== overIndex) {
      const overTask = tasks[overIndex];
      newStatus = overTask.status;
      newTasks = arrayMove(tasks, activeIndex, overIndex).map((task, index) => ({
        ...task,
        status: task.id === activeId ? newStatus : task.status,
        position: index
      }));
      newPosition = overIndex;
    } else {
      setActiveId(null);
      return;
    }

    setTasks(newTasks);
    setActiveId(null);

    // Persist change
    const res = await moveTaskAction({
      id: activeId,
      status: newStatus as TaskStatus,
      position: newPosition
    });

    if (!res.ok) {
      toast.error("Failed to update task status");
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    }
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdding(true);
    const formData = new FormData(e.currentTarget);
    const res = await createTaskAction(formData);
    if (res.ok) {
      toast.success("Task created successfully");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    } else {
      toast.error(res.message || "Failed to create task");
    }
    setIsAdding(false);
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    setIsEditing(true);
    const formData = new FormData(e.currentTarget);
    const title = String(formData.get("title"));
    const description = String(formData.get("description"));
    const priority = String(formData.get("priority"));

    const res = await updateTaskAction({
      id: editingTask.id,
      title,
      description,
      priority
    });

    if (res.ok) {
      toast.success("Task updated successfully");
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    } else {
      toast.error(res.message || "Failed to update task");
    }
    setIsEditing(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== id));

    const res = await deleteTaskAction(id);
    if (!res.ok) {
      toast.error("Failed to delete task");
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    } else {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    }
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative h-screen flex flex-col px-4 md:px-8 max-w-[1800px] mx-auto animate-in fade-in duration-700">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6 pb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Workspace</span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">Tasks Board</h1>
          </motion.div>

          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input className="pl-9 h-10 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" placeholder="Search tasks..." />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddTask}>
                  <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>
                      Create a new task to track your progress.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Task title"
                        required
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Task description (optional)"
                        className="col-span-3 min-h-[100px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select name="priority" defaultValue="medium">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isAdding} className="bg-primary hover:bg-primary/90 font-bold">
                      {isAdding ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 min-h-0 pb-8">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid md:grid-cols-3 gap-6 h-full">
              <TaskColumn
                title="To Do"
                status="todo"
                tasks={todoTasks}
                color="text-zinc-500"
                icon={Clock}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />

              <TaskColumn
                title="In Progress"
                status="in_progress"
                tasks={inProgressTasks}
                color="text-primary"
                icon={Calendar}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />

              <TaskColumn
                title="Done"
                status="done"
                tasks={doneTasks}
                color="text-green-500"
                icon={CheckCircle2}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>

            <DragOverlay>
              {activeTask ? (
                <Card className="border-2 border-primary shadow-2xl scale-105 rotate-2 bg-white dark:bg-zinc-900 w-[300px] select-none">
                  <CardContent className="p-4">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{activeTask.title}</h4>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleUpdateTask}>
                  <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                      Update the details of your task.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        name="title"
                        defaultValue={editingTask?.title}
                        placeholder="Task title"
                        required
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        name="description"
                        defaultValue={editingTask?.description}
                        placeholder="Task description (optional)"
                        className="col-span-3 min-h-[100px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-priority">Priority</Label>
                      <Select name="priority" defaultValue={editingTask?.priority || "medium"}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isEditing} className="bg-primary hover:bg-primary/90 font-bold">
                      {isEditing ? "Updating..." : "Update Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DndContext>
        </main>
      </div>
    </div>
  );
}
