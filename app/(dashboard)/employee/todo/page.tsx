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
    useDroppable,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListTodo, Plus, GripVertical, Clock, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTasksAction, moveTaskAction } from "@/actions/tasks";
import { toast } from "sonner";

type TodoStatus = "todo" | "in_progress" | "done";

interface TodoItem {
    id: string;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    due_date?: string;
    status: TodoStatus;
    position: number;
}

// Sortable Todo Card Component
function SortableTodoCard({ todo }: { todo: TodoItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });

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
        <div ref={setNodeRef} style={style} {...attributes} className="mb-3">
            <Card className={`cursor-grab active:cursor-grabbing border hover:shadow-lg transition-all duration-200 ${isDragging ? 'shadow-xl scale-105' : ''}`}>
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div {...listeners} className="mt-1 cursor-grab">
                            <GripVertical className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">{todo.title}</h4>
                            {todo.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{todo.description}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] uppercase font-bold ${priorityColors[todo.priority]}`}>
                                    <Flag className="h-3 w-3 mr-1" />
                                    {todo.priority}
                                </Badge>
                                {todo.due_date && (
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {new Date(todo.due_date).toLocaleDateString()}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Droppable Column Component
function TodoColumn({
    title,
    todos,
    color,
    status,
}: {
    title: string;
    todos: TodoItem[];
    color: string;
    status: TodoStatus;
}) {
    const { setNodeRef } = useDroppable({
        id: status,
    });

    return (
        <div ref={setNodeRef}>
            <Card className="border-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-col h-full min-h-[500px]">
                <CardHeader className={`border-b-2 ${color}`}>
                    <CardTitle className="text-lg font-bold flex items-center justify-between">
                        <span>{title}</span>
                        <Badge variant="secondary" className="text-xs">
                            {todos.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
                    <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                        {todos.length === 0 ? (
                            <div className="text-center py-8 text-zinc-400">
                                <p className="text-sm font-medium">No tasks yet</p>
                            </div>
                        ) : (
                            todos.map((todo) => <SortableTodoCard key={todo.id} todo={todo} />)
                        )}
                    </SortableContext>
                </CardContent>
            </Card>
        </div>
    );
}

export default function EmployeeTodoPage() {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getTasksAction().then(res => {
            if (res.ok) setTodos(res.data || []);
            setIsLoading(false);
        });
    }, []);

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

        const activeIndex = todos.findIndex((t) => t.id === activeId);
        const overIndex = todos.findIndex((t) => t.id === overId);

        let newTodos = [...todos];
        let newStatus: TodoStatus = todos[activeIndex].status;
        let newPosition = todos[activeIndex].position;

        // Check if we're dropping on a column (status change)
        const isOverColumn = ["todo", "in_progress", "done"].includes(overId);

        if (isOverColumn) {
            newStatus = overId as TodoStatus;
            newTodos = todos.map((todo) =>
                todo.id === activeId ? { ...todo, status: newStatus } : todo
            );
        } else if (activeIndex !== overIndex) {
            const overTodo = todos[overIndex];
            newStatus = overTodo.status;
            newTodos = arrayMove(todos, activeIndex, overIndex).map((todo, index) => ({
                ...todo,
                status: todo.id === activeId ? newStatus : todo.status,
                position: index
            }));
            newPosition = overIndex;
        } else {
            setActiveId(null);
            return;
        }

        setTodos(newTodos);
        setActiveId(null);

        // Persist change
        const res = await moveTaskAction({
            id: activeId,
            status: newStatus,
            position: newPosition
        });

        if (!res.ok) {
            toast.error("Failed to update task status");
            // Optionally revert state
        }
    };

    const todoTodos = todos.filter((t) => t.status === "todo");
    const inProgressTodos = todos.filter((t) => t.status === "in_progress");
    const doneTodos = todos.filter((t) => t.status === "done");

    const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative space-y-6 px-4 md:px-8 max-w-[1800px] mx-auto animate-in fade-in duration-700 pb-8">
                {/* Header */}
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-purple-600 rounded-lg text-white shadow-lg shadow-purple-500/20">
                                <ListTodo className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">Personal Tasks</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">My Todo</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
                            Organize your tasks with drag-and-drop kanban board.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Button className="h-12 px-6 gap-2 shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 bg-purple-600 hover:bg-purple-700 font-bold">
                            <Plus className="h-5 w-5" />
                            Add Task
                        </Button>
                    </motion.div>
                </header>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardContent className="p-4">
                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{todos.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardContent className="p-4">
                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">In Progress</p>
                            <p className="text-3xl font-black text-blue-600">{inProgressTodos.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                        <CardContent className="p-4">
                            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Completed</p>
                            <p className="text-3xl font-black text-green-600">{doneTodos.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Kanban Board */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <TodoColumn
                                title="To Do"
                                status="todo"
                                todos={todoTodos}
                                color="border-zinc-200 dark:border-zinc-700"
                            />
                        </div>

                        <div>
                            <TodoColumn
                                title="In Progress"
                                status="in_progress"
                                todos={inProgressTodos}
                                color="border-blue-200 dark:border-blue-800"
                            />
                        </div>

                        <div>
                            <TodoColumn
                                title="Done"
                                status="done"
                                todos={doneTodos}
                                color="border-green-200 dark:border-green-800"
                            />
                        </div>
                    </div>

                    <DragOverlay>
                        {activeTodo ? (
                            <Card className="cursor-grabbing border-2 border-purple-500 shadow-2xl scale-105 rotate-2">
                                <CardContent className="p-4">
                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{activeTodo.title}</h4>
                                </CardContent>
                            </Card>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
