// src/types/auth.ts

export interface SignupFormData {
    organizationName: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword?: string;
}

export interface LoginFormData {
    email: string;
    password: string;
}

export interface InviteFormData {
    email: string;
    fullName?: string;
    department?: string;
    designation?: string;
    role?: "admin" | "employee";
}

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    role: "admin" | "employee";
    department: string | null;
    designation: string | null;
    date_of_joining: string | null;
    is_active: boolean;
    organization_id: string | null;
    status: "invited" | "active" | "inactive";
    monthly_salary: number | null;
    currency: string | null;
    created_at: string;
    updated_at: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Invitation {
    id: string;
    organization_id: string;
    email: string;
    full_name: string | null;
    department: string | null;
    designation: string | null;
    role: "admin" | "employee";
    token: string;
    invited_by: string | null;
    status: "pending" | "accepted" | "expired" | "cancelled";
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
    organization?: Organization;
}

export type UserRole = "admin" | "employee";