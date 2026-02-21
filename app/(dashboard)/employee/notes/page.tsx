"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  MoreVertical,
  Clock,
  Calendar,
  Lock,
  Pencil,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getEmployeeNotes, createNoteAction, updateNoteAction, deleteNoteAction } from "@/actions/employee-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function EmployeeNotesPage() {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["employee-notes"],
    queryFn: async () => {
      const res = await getEmployeeNotes();
      return res.ok ? (res.data || []) as Note[] : [];
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  async function handleNoteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const res = editingNote
      ? await updateNoteAction(editingNote.id, formData)
      : await createNoteAction(formData);

    if (res.ok) {
      toast.success(editingNote ? "Note updated successfully!" : "Note created successfully!");
      setIsNoteModalOpen(false);
      setEditingNote(null);
      queryClient.invalidateQueries({ queryKey: ["employee-notes"] });
    } else {
      toast.error(res.message || `Failed to ${editingNote ? "update" : "create"} note`);
    }
    setIsSubmitting(false);
  }

  async function handleDeleteConfirm() {
    if (!noteToDelete) return;
    setIsSubmitting(true);
    const res = await deleteNoteAction(noteToDelete);
    if (res.ok) {
      toast.success("Note deleted successfully!");
      setIsDeleteModalOpen(false);
      setNoteToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["employee-notes"] });
    } else {
      toast.error(res.message || "Failed to delete note");
    }
    setIsSubmitting(false);
  }

  const filteredNotes = notes.filter(n =>
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && notes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-yellow-600 rounded-lg text-white shadow-lg shadow-yellow-500/20">
                <StickyNote className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-yellow-600">Digital Workspace</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Quick Notes</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              Keep track of your thoughts, ideas, and reminders. These notes are private to you.
            </p>
          </motion.div>

          <Dialog open={isNoteModalOpen} onOpenChange={(val) => {
            setIsNoteModalOpen(val);
            if (!val) setEditingNote(null);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingNote(null)} className="h-12 px-6 gap-2 shadow-xl shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all duration-300 bg-yellow-600 hover:bg-yellow-700 font-bold border-none text-white">
                <Plus className="h-5 w-5" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <form onSubmit={handleNoteSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingNote ? "Edit Note" : "Create New Note"}</DialogTitle>
                  <DialogDescription>{editingNote ? "Make changes to your note." : "Quickly jot down your ideas."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Title</label>
                    <Input name="title" defaultValue={editingNote?.title} placeholder="Note title..." required className="border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Content</label>
                    <Textarea name="content" defaultValue={editingNote?.content} placeholder="Write your thoughts..." required className="min-h-[150px] border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase gap-1 p-1">
                      <Lock className="h-2.5 w-2.5" />
                      Private note
                    </Badge>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => { setIsNoteModalOpen(false); setEditingNote(null); }}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-yellow-600 hover:bg-yellow-700">
                    {isSubmitting ? "Saving..." : editingNote ? "Update Note" : "Save Note"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <DialogTitle className="text-center">Are you absolutely sure?</DialogTitle>
                <DialogDescription className="text-center">
                  This action cannot be undone. This will permanently delete your note.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-center gap-2">
                <Button variant="outline" onClick={() => { setIsDeleteModalOpen(false); setNoteToDelete(null); }}>Cancel</Button>
                <Button
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white border-none"
                >
                  {isSubmitting ? "Deleting..." : "Delete Note"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-yellow-500"
              placeholder="Search notes..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="font-bold">Pinned</Button>
            <Button variant="outline" size="sm" className="font-bold">Recent</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full text-center py-20 text-zinc-400">
              <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">No notes found</p>
              <p className="text-sm">Create your first note to stay organized!</p>
            </div>
          ) : (
            filteredNotes.map((note: Note, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-xl transition-all group h-full flex flex-col">
                  <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(note.created_at), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pin className="h-3.5 w-3.5" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer font-bold text-xs"
                                onClick={() => {
                                  setEditingNote(note);
                                  setIsNoteModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 text-blue-600" />
                                Edit Note
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer font-bold text-xs text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setNoteToDelete(note.id);
                                  setIsDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardTitle className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100">{note.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent
                    className="p-4 flex-1 cursor-pointer"
                    onClick={() => {
                      setEditingNote(note);
                      setIsNoteModalOpen(true);
                    }}
                  >
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 whitespace-pre-wrap line-clamp-6">
                      {note.content}
                    </p>
                  </CardContent>
                  <div className="p-4 pt-0 mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {format(new Date(note.created_at), "hh:mm a")}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] font-black uppercase text-zinc-500 hover:text-yellow-600"
                      onClick={() => {
                        setEditingNote(note);
                        setIsNoteModalOpen(true);
                      }}
                    >
                      View Note
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
