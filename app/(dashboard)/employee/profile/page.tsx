"use client";

import { motion } from "framer-motion";
import {
  User,
  Mail,
  Building2,
  Phone,
  Settings,
  ShieldCheck,
  Award,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEmployeeProfile } from "@/actions/employee-actions";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function EmployeeProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["employee-profile"],
    queryFn: async () => {
      const res = await getEmployeeProfile();
      return res.ok ? res.data : null;
    }
  });

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <User className="h-16 w-16 text-zinc-300" />
        <h2 className="text-xl font-bold">Profile not found</h2>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] dark:bg-black/95 transition-colors duration-500 min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative space-y-6 px-4 md:px-8 max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-8">
        <header className="flex justify-between items-start pt-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary rounded-lg text-white shadow-lg shadow-primary/20">
                <User className="h-4 w-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">My Account</span>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Profile</h1>
          </motion.div>
          <Button variant="outline"><Settings className="h-4 w-4 mr-2" /> Edit Profile</Button>
        </header>

        {/* Profile Header */}
        <Card className="border-2 border-primary/10 dark:border-primary/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-start gap-6 flex-col md:flex-row">
              <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-800 shadow-xl">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-600 text-white text-2xl font-bold">
                  {profile.full_name?.substring(0, 2).toUpperCase() || "JD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{profile.full_name}</h2>
                  {profile.role === 'admin' && <Badge className="bg-blue-600">ADMIN</Badge>}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">{profile.designation || "Not specified"}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{profile.email || "No email"}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{profile.department || "No Department"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: "Phone", value: profile.phone || "Not provided" },
                { label: "Department", value: profile.department || "Not assigned" },
                { label: "Designation", value: profile.designation || "Not assigned" },
                { label: "Joining Date", value: profile.joining_date ? format(new Date(profile.joining_date), "MMMM dd, yyyy") : "Not available" },
                { label: "Address", value: profile.address || "Not provided" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 px-2 rounded-lg transition-colors">
                  <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{item.label}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  Role & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                  <span className="text-sm font-bold">Standard Account</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">ACTIVE</Badge>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                  Your account permissions are managed by the HR and IT departments. Contact support if you need access to additional modules.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-primary to-emerald-600 text-white shadow-xl shadow-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">Employee Spotlight</h3>
                    <p className="text-xs text-primary-foreground/80">Recognition for outstanding performance this month!</p>
                  </div>
                </div>
                <Button variant="secondary" className="w-full font-bold">View Achievements</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
