"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Building2, Shield, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { useQuery } from "@tanstack/react-query";
import { getEmployeeById } from "@/actions/employees";

import { Profile } from "@/types/auth";

interface EmployeeDetailsHeaderProps {
    profile: Profile;
}

export function EmployeeDetailsHeader({ profile: initialProfile }: EmployeeDetailsHeaderProps) {
    const { data: profile } = useQuery({
        queryKey: ["employee-profile", initialProfile.id],
        queryFn: async () => {
            const res = await getEmployeeById(initialProfile.id);
            return res.profile;
        },
        initialData: initialProfile,
        refetchInterval: 30000,
    });
    const getStatusStyle = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700 border-green-200";
            case "invited":
                return "bg-primary/10 text-primary border-primary/20";
            case "inactive":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
                <Link href="/admin/employees">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Employees
                </Link>
            </Button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 border-2 border-white shadow-sm ring-1 ring-zinc-200">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                            {profile.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{profile.full_name}</h1>
                            <Badge className={`uppercase text-[10px] font-bold tracking-widest ${getStatusStyle(profile.status)}`}>
                                {profile.status}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-medium">
                            <div className="flex items-center">
                                <Mail className="mr-1.5 h-3.5 w-3.5" />
                                {profile.email}
                            </div>
                            <div className="flex items-center">
                                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                                {profile.department || "General"}
                            </div>
                            <div className="flex items-center">
                                <Shield className="mr-1.5 h-3.5 w-3.5" />
                                {profile.role}
                            </div>
                            <div className="flex items-center">
                                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                Joined {profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
