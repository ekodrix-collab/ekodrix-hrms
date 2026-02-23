export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
    id: string;
    name: string;
    total_days: number;
    color: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LeaveRequest {
    id: string;
    user_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    status: LeaveStatus;
    manager_id?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    // Join fields
    user?: {
        full_name: string;
        avatar_url?: string;
        department?: string;
    };
    leave_type?: {
        name: string;
        color: string;
    };
}

export interface LeaveBalance {
    id: string;
    user_id: string;
    leave_type_id: string;
    year: number;
    entitlement: number;
    used: number;
    created_at: string;
    updated_at: string;
    leave_type?: {
        name: string;
        color: string;
    };
}

export interface ApplyLeaveForm {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason: string;
}
