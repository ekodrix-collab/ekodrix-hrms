export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    entity_type: string | null;
    entity_id: string | null;
    is_read: boolean;
    created_at: string;
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    category: string;
    payment_method: string;
    status: 'pending' | 'approved' | 'partially_paid' | 'rejected' | 'paid';
    paid_by: string | null;
    created_by: string | null;
    expense_date: string;
    created_at: string;
    approved_at?: string | null;
    reimbursed_at?: string | null;
    reimbursement_method?: string | null;
    reimbursed_amount?: number;
    outstanding_amount?: number;
}

export interface Revenue {
    id: string;
    amount: number;
    source: string;
    description: string | null;
    received_date: string;
    created_by: string | null;
    created_at: string;
}

export interface Standup {
    id: string;
    user_id: string;
    content: string;
    date: string;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
}
