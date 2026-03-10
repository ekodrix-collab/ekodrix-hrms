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
    projects: { name: string } | null;
    assignment_status?: string;
    is_open_assignment?: boolean;
    profiles: {
        id: string;
        full_name: string;
        avatar_url: string | null;
        role: string;
    } | null;
    subtasks?: { title: string; completed: boolean }[];
    user_id?: string;
    assignee?: { id: string; avatar_url: string | null; full_name: string; } | null;
    rejected_user_ids?: string[];
    claimants?: { id: string; name: string }[];
    claimed_by_others?: string[];
    has_my_claim?: boolean;
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

export interface AttendanceLog extends AttendanceRecord {
    profiles: {
        full_name: string;
        avatar_url: string | null;
        department: string | null;
    };
}

export interface AbsentEmployee {
    id: string;
    full_name: string;
    avatar_url: string | null;
    department: string | null;
    role: string;
}

export interface Expense {
    id: string;
    description: string;
    category?: string | null;
    expense_date: string;
    amount: string | number;
    payment_method: string;
    project_id?: string | null;
    profiles: {
        avatar_url: string | null;
        full_name: string;
    };
    expense_categories?: {
        color: string;
        name: string;
    };
}

export interface RevenueLog {
    id: string;
    amount: number;
    source: string;
    description: string | null;
    received_date: string;
    project_id: string | null;
}

export interface FinanceVerdict {
    id: string;
    project_id: string;
    content: string;
    created_at: string;
    created_by: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
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

export interface Employee {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    department?: string | null;
    role: string;
    tasks?: Task[];
}

export interface Project {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    priority: string;
    deadline?: string | null;
    contract_amount?: number | null;
    project_manager_id?: string | null;
    project_manager?: {
        id: string;
        full_name: string | null;
        email?: string | null;
        avatar_url?: string | null;
    } | null;
    members?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
        role: string;
    }[];
    can_manage_project?: boolean;
    is_project_manager?: boolean;
    tasks?: Task[];
}
