"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllTasks } from "@/actions/dashboard";
import type { Task } from "@/types/dashboard";
import { getAllEmployees } from "@/actions/employees";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Kanban, List, LayoutGrid, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminTaskForm } from "@/components/tasks/admin-task-form";
import { DueDateBadge } from "@/components/tasks/due-date-badge";

export default function AdminTasksPage() {
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-tasks"],
    queryFn: () => getAllTasks(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => getAllEmployees(),
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'medium': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default: return 'bg-zinc-500/10 text-zinc-600 border-zinc-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done': return <Badge className="bg-green-500 text-white border-none font-black text-[10px] uppercase tracking-widest">Completed</Badge>;
      case 'review': return <Badge className="bg-purple-500 text-white border-none font-black text-[10px] uppercase tracking-widest">In Review</Badge>;
      case 'in_progress': return <Badge className="bg-amber-500 text-white border-none font-black text-[10px] uppercase tracking-widest">Working</Badge>;
      default: return <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest">Todo</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
            <Kanban className="h-3 w-3" />
            Task Management
          </div>
          <h1 className="text-3xl font-black">Organization Tasks</h1>
          <p className="text-muted-foreground font-medium text-sm">Assign and oversee all employee tasks.</p>
        </div>
        <AdminTaskForm employees={employees} onSuccess={() => refetch()} />
      </header>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-zinc-100/50 dark:bg-zinc-800/50 p-1">
          <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> List View</TabsTrigger>
          <TabsTrigger value="board" className="gap-2"><LayoutGrid className="h-4 w-4" /> Board View</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4">Task</th>
                      <th className="px-6 py-4">Assignee</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4 text-right">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                        </td>
                      </tr>
                    ) : tasks && tasks.length > 0 ? (
                      tasks.map((task: Task, index: number) => (
                        <motion.tr
                          key={task.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all"
                        >
                          <td className="px-6 py-4 max-w-[300px]">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors uppercase">{task.title}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{task.description || 'No description provided.'}</p>
                                {task.assigned_by && (
                                  <Badge variant="secondary" className="text-[9px] mt-1 font-black">
                                    ADMIN ASSIGNED
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <AvatarImage src={task.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] font-black bg-muted">
                                  {task.profiles?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-bold">{task.profiles?.full_name?.split(' ')[0] || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(task.status)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`font-black text-[9px] uppercase ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-black">
                                <DueDateBadge dueDate={task.due_date} />
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center opacity-40">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-bold">No tasks assigned yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Board content omitted for brevity or added in next turn if needed */}
      </Tabs>
    </div>
  );
}
