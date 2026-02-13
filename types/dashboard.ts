export interface Blocker {
    id: string;
    userName: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}

export interface Activity {
    id: string;
    user: {
        name: string;
        avatar: string | null;
    };
    action: string;
    type: string;
    time: string;
}

export interface UnpaidAccrual {
    id: string;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    month_year: string;
    status: string;
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string | null;
        role: string;
        department: string | null;
    } | null;
}

export interface Task {
    id: string;
    title: string;
    description: string | null;
    assigned_by: string | null;
    priority: string;
    status: string;
    due_date: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

export interface AttendanceRecord {
    id: string;
    user_id: string;
    date: string;
    punch_in: string;
    punch_out: string | null;
    status: string;
    work_mode: string;
    total_hours: number | null;
    notes?: string | null;
    created_at: string;
}

export interface Standup {
    id: string;
    user_id: string;
    date: string;
    tasks_completed: string;
    tasks_planned: string;
    blockers: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string | null;
}
