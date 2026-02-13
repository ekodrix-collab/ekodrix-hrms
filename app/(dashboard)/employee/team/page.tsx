"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Mail,
  MessageSquare,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTeamMembers } from "@/actions/employee-actions";
import { useQuery } from "@tanstack/react-query";

export default function EmployeeTeamPage() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["employee-team"],
    queryFn: async () => {
      const res = await getTeamMembers();
      return res.ok ? res.data || [] : [];
    }
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-teal-600 rounded-lg text-white shadow-lg shadow-teal-500/20">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Our Community</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Team Members</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
              Connect with your colleagues and collaborate across departments.
            </p>
          </motion.div>

          <Card className="border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 font-bold">Total {members.length}</Badge>
            <Badge variant="outline" className="px-3 py-1 font-bold border-teal-200 dark:border-teal-800 text-teal-600">Active Now</Badge>
          </Card>
        </header>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-teal-500"
              placeholder="Search by name, department..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="font-bold">All Departments</Button>
            <Button variant="outline" size="sm" className="font-bold">Recent Joinees</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full text-center py-20 text-zinc-500">
              <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">No team members found</p>
            </div>
          ) : (
            filteredMembers.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                  <CardHeader className="relative pb-0 pt-6">
                    <div className="flex justify-between items-start">
                      <Avatar className="h-16 w-16 border-2 border-white dark:border-zinc-800 shadow-xl">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback className="bg-teal-50 text-teal-600 text-lg font-black uppercase">
                          {member.full_name?.substring(0, 2) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-zinc-900 dark:text-zinc-100">{member.full_name}</h3>
                        {member.role === 'admin' && <ShieldCheck className="h-3 w-3 text-blue-500" />}
                      </div>
                      <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">{member.designation || "Team Member"}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">{member.department || "No Department"}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20">Online</Badge>
                      <Badge variant="outline" className="text-[10px] h-5">Work from Home</Badge>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-teal-50 hover:text-teal-600">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-teal-50 hover:text-teal-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button variant="ghost" className="text-[10px] font-black uppercase text-zinc-500 hover:text-teal-600 h-8 px-2 gap-1.5">
                        Profile
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
