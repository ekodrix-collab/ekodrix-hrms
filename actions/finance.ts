"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { normalizeExpenseCategory } from "@/lib/finance-categories";
import { getOrgContext } from "@/lib/auth-utils";
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";

type ProjectRelation = { name: string } | { name: string }[] | null;
type ProjectBreakdownItem = { id: string; name: string; revenue: number; expenses: number; net: number };
const COMPANY_FINANCE_VIEW_ROLES = new Set(["admin", "founder"]);

function canViewCompanyFinance(role: string | null | undefined) {
    return Boolean(role && COMPANY_FINANCE_VIEW_ROLES.has(role));
}

function emptyCompanyFinancials() {
    return {
        totalLiability: 0,
        totalPaid: 0,
        totalSalaryPaid: 0,
        totalBusinessExpenses: 0,
        totalRevenue: 0,
        netBalance: 0,
        projectBreakdown: [] as ProjectBreakdownItem[]
    };
}

function emptyCompanyFinanceDashboard(fromKey: string, toKey: string) {
    return {
        dateRange: {
            from: fromKey,
            to: toKey
        },
        summary: {
            openingBalance: 0,
            periodRevenue: 0,
            periodExpenses: 0,
            netChange: 0,
            closingBalance: 0,
            cashRevenue: 0,
            approvedClaimRevenue: 0,
            reimbursedClaimExpense: 0,
            directExpenses: 0,
            salaryExpenses: 0,
            totalTransactions: 0,
            salaryLiability: 0,
            pendingClaims: { count: 0, amount: 0 },
            approvedClaims: { count: 0, amount: 0 },
            reimbursedClaims: { count: 0, amount: 0 },
            rejectedClaims: { count: 0, amount: 0 }
        },
        monthly: [],
        ledger: [],
        claims: [],
        contributors: [],
        categoryBreakdown: []
    };
}

function getProjectName(projects: ProjectRelation, fallback = "Unknown") {
    if (Array.isArray(projects)) {
        return projects[0]?.name || fallback;
    }
    return projects?.name || fallback;
}

type FinanceDateRangeInput = {
    from?: string;
    to?: string;
};

type FinanceProfile = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    department?: string | null;
    organization_id: string | null;
};

type FinanceRevenueRow = {
    id: string;
    amount: number | string;
    source: string;
    description: string | null;
    received_date: string;
    created_at: string;
    project_id?: string | null;
    projects?: ProjectRelation;
};

type FinanceExpenseRow = {
    id: string;
    amount: number | string;
    description: string;
    category: string | null;
    payment_method: string;
    reimbursement_method: string | null;
    expense_date: string;
    created_at: string;
    updated_at: string;
    approved_at: string | null;
    reimbursed_at: string | null;
    status: "pending" | "approved" | "partially_paid" | "rejected" | "paid" | string;
    project_id?: string | null;
    projects?: ProjectRelation;
    profiles: FinanceProfile[] | FinanceProfile | null;
};

type FinancialHistoryExpenseRow = {
    id: string;
    amount: number | string;
    category: string | null;
    description: string;
    expense_date: string;
    payment_method: string;
    created_at: string;
    project_id: string | null;
    projects: ProjectRelation;
    employee_profile: { full_name: string | null } | { full_name: string | null }[] | null;
};

type FinancialHistoryItem = {
    id: string;
    type: "revenue" | "expense";
    amount: number | string;
    title: string;
    subtitle: string;
    date: string;
    created_at: string;
    category: string;
    method: string;
    project_id: string | null;
    project_name: string;
    person?: string | null;
};

type FinanceReimbursementRow = {
    id: string;
    expense_id: string;
    amount: number | string;
    payment_method: string;
    paid_at: string;
    note: string | null;
    created_at: string;
};

type FinanceLedgerEvent = {
    id: string;
    date: string;
    createdAt: string;
    amount: number;
    type: "revenue" | "expense";
    sourceType: "cash_revenue" | "claim_approval" | "claim_reimbursement" | "business_expense" | "salary_payment";
    title: string;
    description: string;
    category: string;
    method: string;
    person: string | null;
};

type ContributorSummary = {
    employeeId: string;
    name: string;
    avatar: string | null;
    department: string | null;
    submittedAmount: number;
    approvedAmount: number;
    reimbursedAmount: number;
    outstandingApprovedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    claimsCount: number;
    latestExpenseDate: string;
};

function normalizeJoinedProfile<T>(profile: T[] | T | null | undefined): T | null {
    if (Array.isArray(profile)) return profile[0] ?? null;
    return profile ?? null;
}

function toIsoDate(value: Date | string | null | undefined) {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, "yyyy-MM-dd");
}

function normalizeRange(range?: FinanceDateRangeInput) {
    const fallbackFrom = startOfMonth(subMonths(new Date(), 11));
    const fallbackTo = endOfMonth(new Date());
    const parsedFrom = range?.from ? new Date(range.from) : fallbackFrom;
    const parsedTo = range?.to ? new Date(range.to) : fallbackTo;
    const safeFrom = Number.isNaN(parsedFrom.getTime()) ? fallbackFrom : parsedFrom;
    const safeTo = Number.isNaN(parsedTo.getTime()) ? fallbackTo : parsedTo;
    const from = safeFrom <= safeTo ? safeFrom : safeTo;
    const to = safeFrom <= safeTo ? safeTo : safeFrom;

    return {
        from,
        to,
        fromKey: format(from, "yyyy-MM-dd"),
        toKey: format(to, "yyyy-MM-dd")
    };
}

export async function generateMonthlyAccruals(date: Date) {
    const supabase = createSupabaseServerClient();
    const { organizationId, role } = await getOrgContext();

    if (!organizationId || role !== "admin") {
        return { error: "Admin organization context missing" };
    }

    // Get all active employees with a salary > 0
    const { data: employees, error: fetchError } = await supabase
        .from("profiles")
        .select("id, monthly_salary")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .gt("monthly_salary", 0);

    if (fetchError) return { error: fetchError.message };

    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];

    const accruals = employees.map(emp => ({
        user_id: emp.id,
        amount: emp.monthly_salary,
        month_year: firstOfMonth,
        status: 'unpaid'
    }));

    const { error: insertError } = await supabase
        .from("salary_accruals")
        .upsert(accruals, { onConflict: 'user_id, month_year' });

    if (insertError) return { error: insertError.message };

    revalidatePath("/admin/finance");
    return { success: true, count: accruals.length };
}

export async function postRevenue(amount: number, source: string, description?: string, projectId?: string) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();

    if (!user || !organizationId || role !== "admin") {
        return { error: "Admin organization context missing" };
    }

    const { data, error } = await supabase
        .from("revenue_logs")
        .insert({
            amount,
            source,
            description,
            project_id: projectId || null,
            created_by: user?.id
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath("/admin/finance");
    if (projectId) {
        revalidatePath(`/admin/projects/${projectId}`);
        revalidatePath(`/admin/projects/${projectId}/finance`);
        revalidatePath("/admin/projects/finance");
    }
    return { success: true, revenue: data };
}

export async function distributeRevenue(revenueId: string, distribution: { [userId: string]: number }) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // This is a simplified distribution. In a real app, we'd use a transaction or RPC.
    for (const [userId, amount] of Object.entries(distribution)) {
        if (amount <= 0) continue;

        // Find oldest unpaid accrual for this user
        const { data: accrual } = await supabase
            .from("salary_accruals")
            .select("id, amount, paid_amount, remaining_amount, month_year")
            .eq("user_id", userId)
            .neq("status", "paid")
            .order("month_year", { ascending: true })
            .limit(1)
            .single();

        if (accrual) {
            const newPaidAmount = Number(accrual.paid_amount) + amount;
            const status = newPaidAmount >= accrual.amount ? 'paid' : 'partially_paid';

            // 1. Update Accrual
            await supabase
                .from("salary_accruals")
                .update({
                    paid_amount: newPaidAmount,
                    status: status
                })
                .eq("id", accrual.id);

            // 2. Log Payout
            await supabase
                .from("payouts")
                .insert({
                    accrual_id: accrual.id,
                    revenue_id: revenueId,
                    amount_paid: amount,
                    created_by: user?.id
                });

            // 3. Record in employee_payments for the employee view
            await supabase
                .from("employee_payments")
                .insert({
                    employee_id: userId,
                    payment_type: "salary",
                    amount: amount,
                    date: new Date().toISOString().split('T')[0],
                    status: "completed",
                    notes: `Salary payout for ${accrual.month_year}`
                });
        }
    }

    revalidatePath("/admin/finance");
    revalidatePath("/dashboard/finance");
    return { success: true };
}

export async function postBusinessExpense(data: {
    amount: number;
    description: string;
    category: string;
    payment_method?: string;
    project_id?: string;
    employee_id?: string;
}) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();

    if (!user || !organizationId || role !== "admin") {
        return { error: "Admin organization context missing" };
    }

    const { error } = await supabase
        .from("expenses")
        .insert({
            amount: data.amount,
            description: data.description,
            category: normalizeExpenseCategory(data.category),
            payment_method: data.payment_method || "cash",
            project_id: data.project_id || null,
            employee_id: data.employee_id || null,
            paid_by: user.id,
            organization_id: organizationId,
            status: 'paid',
            expense_date: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: user.id
        });

    if (error) return { error: error.message };

    // If it's a salary payment or project share to an employee, record it in employee_payments
    if (data.employee_id) {
        let type: "salary" | "project_share" | "commission" | "bonus" | "reimbursement" = "project_share";

        if (data.category === "Salary Payments") {
            type = "salary";
        } else if (data.category === "Project Share") {
            type = "project_share";
        } else if (data.category === "Commision / Broker") {
            type = "commission";
        }
        await supabase
            .from("employee_payments")
            .insert({
                employee_id: data.employee_id,
                project_id: data.project_id || null,
                payment_type: type,
                amount: data.amount,
                date: new Date().toISOString().split('T')[0],
                status: "completed",
                notes: data.description
            });
    }

    revalidatePath("/admin/finance");
    if (data.project_id) {
        revalidatePath(`/admin/projects/${data.project_id}`);
        revalidatePath(`/admin/projects/${data.project_id}/finance`);
        revalidatePath("/admin/projects/finance");
    }
    return { success: true };
}

export async function getCompanyFinancials(projectId?: string) {
    const supabase = createSupabaseAdminClient();
    const { organizationId, role } = await getOrgContext();

    if (!organizationId || !canViewCompanyFinance(role)) {
        return emptyCompanyFinancials();
    }

    const accrualQuery = supabase
        .from("salary_accruals")
        .select("amount, paid_amount, remaining_amount, profiles!user_id!inner(organization_id)")
        .eq("profiles.organization_id", organizationId);

    let revenueQuery = supabase
        .from("revenue_logs")
        .select("amount, creator:profiles!created_by!inner(organization_id)")
        .eq("creator.organization_id", organizationId);

    let expenseQuery = supabase
        .from("expenses")
        .select("amount, profiles:paid_by!inner(organization_id)")
        .eq("profiles.organization_id", organizationId)
        .in("status", ["approved", "paid"]);

    if (projectId) {
        revenueQuery = revenueQuery.eq("project_id", projectId);
        expenseQuery = expenseQuery.eq("project_id", projectId);
        // Accruals are currently company-wide salary, not project-linked usually.
        // But if we want to show project-specific "net", we might skip accruals or link them.
        // For now, project financials focus on direct revenue/expenses.
    }

    const { data: accruals } = await accrualQuery;
    const { data: revenue } = await revenueQuery;
    const { data: expenses } = await expenseQuery;

    const totalLiability = projectId ? 0 : (accruals?.reduce((acc, curr) => acc + Number(curr.remaining_amount), 0) || 0);
    const totalSalaryPaid = projectId ? 0 : (accruals?.reduce((acc, curr) => acc + Number(curr.paid_amount), 0) || 0);
    const totalBusinessExpenses = expenses?.reduce((acc: number, curr) => acc + Number(curr.amount), 0) || 0;
    const totalRevenue = revenue?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    let projectBreakdown: ProjectBreakdownItem[] = [];
    if (!projectId) {
        const [{ data: projRevenue }, { data: projExpenses }] = await Promise.all([
            supabase
                .from("revenue_logs")
                .select("project_id, amount, projects(name), creator:profiles!created_by!inner(organization_id)")
                .eq("creator.organization_id", organizationId),
            supabase
                .from("expenses")
                .select("project_id, amount, projects(name), profiles:paid_by!inner(organization_id)")
                .eq("profiles.organization_id", organizationId)
                .in("status", ["approved", "paid"])
        ]);

        const breakdownMap: Record<string, { id: string; name: string; revenue: number; expenses: number; net: number }> = {};

        projRevenue?.forEach(r => {
            if (!r.project_id) return;
            const pId = r.project_id;
            const pName = getProjectName(r.projects);
            if (!breakdownMap[pId]) breakdownMap[pId] = { id: pId, name: pName, revenue: 0, expenses: 0, net: 0 };
            breakdownMap[pId].revenue += Number(r.amount);
        });

        projExpenses?.forEach(e => {
            if (!e.project_id) return;
            const pId = e.project_id;
            const pName = getProjectName(e.projects);
            if (!breakdownMap[pId]) breakdownMap[pId] = { id: pId, name: pName, revenue: 0, expenses: 0, net: 0 };
            breakdownMap[pId].expenses += Number(e.amount);
        });

        projectBreakdown = Object.values(breakdownMap).map(p => ({ ...p, net: p.revenue - p.expenses }));
    }

    return {
        totalLiability,
        totalPaid: totalSalaryPaid + totalBusinessExpenses,
        totalSalaryPaid,
        totalBusinessExpenses,
        totalRevenue,
        netBalance: totalRevenue - (totalSalaryPaid + totalBusinessExpenses),
        projectBreakdown
    };
}

export async function getCompanyFinanceDashboard(range?: FinanceDateRangeInput) {
    const supabase = createSupabaseAdminClient();
    const { organizationId, role } = await getOrgContext();
    const { from, to, fromKey, toKey } = normalizeRange(range);

    if (!organizationId || !canViewCompanyFinance(role)) {
        return emptyCompanyFinanceDashboard(fromKey, toKey);
    }

    const [revenueResult, expenseResult, reimbursementResult, accrualResult, projectFinancialsResult] = await Promise.all([
        supabase
            .from("revenue_logs")
            .select("id, amount, source, description, received_date, created_at, project_id, creator:profiles!created_by!inner(organization_id)")
            .eq("creator.organization_id", organizationId)
            .lte("received_date", toKey)
            .order("received_date", { ascending: true }),
        supabase
            .from("expenses")
            .select(`
                id,
                amount,
                description,
                category,
                payment_method,
                reimbursement_method,
                expense_date,
                created_at,
                updated_at,
                approved_at,
                reimbursed_at,
                status,
                project_id,
                profiles:paid_by!inner(id, full_name, avatar_url, role, department, organization_id)
            `)
            .eq("profiles.organization_id", organizationId)
            .lte("expense_date", toKey)
            .order("expense_date", { ascending: true }),
        supabase
            .from("expense_reimbursements")
            .select("id, expense_id, amount, payment_method, paid_at, note, created_at")
            .lte("paid_at", `${toKey}T23:59:59.999Z`)
            .order("paid_at", { ascending: true }),
        supabase
            .from("salary_accruals")
            .select("remaining_amount, profiles!user_id!inner(organization_id)")
            .eq("profiles.organization_id", organizationId),
        getCompanyFinancials() // Aggregated project final verdicts (net)
    ]);

    const revenueRows = (revenueResult.data ?? []) as FinanceRevenueRow[];
    const expenses = ((expenseResult.data ?? []) as FinanceExpenseRow[]).map((row) => ({
        ...row,
        category: normalizeExpenseCategory(row.category),
        profiles: normalizeJoinedProfile(row.profiles)
    }));
    const reimbursements = (reimbursementResult.data ?? []) as FinanceReimbursementRow[];

    const salaryLiability = (accrualResult.data ?? []).reduce((sum, row) => {
        return sum + Number((row as { remaining_amount?: number | string }).remaining_amount ?? 0);
    }, 0);

    const reimbursementsByExpense = reimbursements.reduce<Record<string, FinanceReimbursementRow[]>>((accumulator, reimbursement) => {
        if (!accumulator[reimbursement.expense_id]) accumulator[reimbursement.expense_id] = [];
        accumulator[reimbursement.expense_id].push(reimbursement);
        return accumulator;
    }, {});

    const allEvents: FinanceLedgerEvent[] = revenueRows
        .filter(row => !row.project_id) // Keep treasury cash revenue company-level only
        .map((row) => ({
            id: `revenue-${row.id}`,
            date: row.received_date,
            createdAt: row.created_at,
            amount: Number(row.amount) || 0,
            type: "revenue",
            sourceType: "cash_revenue",
            title: row.source,
            description: row.description || "Revenue recorded",
            category: "Cash Revenue",
            method: "-",
            person: null
        }));

    // Add project final verdict as virtual treasury events (not raw project income/expense lines)
    projectFinancialsResult.projectBreakdown?.forEach((project) => {
        if (project.net > 0) {
            allEvents.push({
                id: `project-profit-${project.id}`,
                date: toKey,
                createdAt: new Date().toISOString(),
                amount: project.net,
                type: "revenue",
                sourceType: "cash_revenue",
                title: `Income from ${project.name}`,
                description: `Final project verdict registered as income`,
                category: project.name, // badge shows project name
                method: "-",
                person: null
            });
        } else if (project.net < 0) {
            allEvents.push({
                id: `project-loss-${project.id}`,
                date: toKey,
                createdAt: new Date().toISOString(),
                amount: Math.abs(project.net),
                type: "expense",
                sourceType: "business_expense",
                title: `Loss from ${project.name}`,
                description: `Final project verdict registered as expense`,
                category: project.name, // badge shows project name
                method: "-",
                person: null
            });
        }
    });

    const claims = expenses.filter((expense) => expense.profiles?.role === "employee");

    expenses.forEach((expense) => {
        const amount = Number(expense.amount) || 0;
        const category = normalizeExpenseCategory(expense.category);
        const person = expense.profiles?.full_name || null;
        const isEmployeeClaim = expense.profiles?.role === "employee";
        if (isEmployeeClaim) {
            const approvedDate = toIsoDate(expense.approved_at);
            const claimPayments = reimbursementsByExpense[expense.id] || [];

            if ((expense.status === "approved" || expense.status === "partially_paid" || expense.status === "paid") && approvedDate && approvedDate <= toKey) {
                allEvents.push({
                    id: `claim-approved-${expense.id}`,
                    date: approvedDate,
                    createdAt: expense.updated_at || expense.created_at,
                    amount,
                    type: "revenue",
                    sourceType: "claim_approval",
                    title: `Approved claim: ${person || "Employee"}`,
                    description: expense.description,
                    category,
                    method: expense.payment_method,
                    person
                });
            }

            if (claimPayments.length) {
                claimPayments.forEach((payment) => {
                    const paidDate = toIsoDate(payment.paid_at);
                    if (!paidDate || paidDate > toKey) return;

                    allEvents.push({
                        id: `claim-paid-${payment.id}`,
                        date: paidDate,
                        createdAt: payment.created_at,
                        amount: Number(payment.amount) || 0,
                        type: "expense",
                        sourceType: "claim_reimbursement",
                        title: `Reimbursed claim: ${person || "Employee"}`,
                        description: payment.note || expense.description,
                        category,
                        method: payment.payment_method || expense.reimbursement_method || "bank_transfer",
                        person
                    });
                });
            } else {
                const reimbursedDate = toIsoDate(expense.reimbursed_at);
                if (expense.status === "paid" && reimbursedDate && reimbursedDate <= toKey) {
                    allEvents.push({
                        id: `claim-paid-legacy-${expense.id}`,
                        date: reimbursedDate,
                        createdAt: expense.updated_at || expense.created_at,
                        amount,
                        type: "expense",
                        sourceType: "claim_reimbursement",
                        title: `Reimbursed claim: ${person || "Employee"}`,
                        description: expense.description,
                        category,
                        method: expense.reimbursement_method || "bank_transfer",
                        person
                    });
                }
            }

            return;
        }

        if (expense.status !== "approved" && expense.status !== "paid") {
            return;
        }

        if (expense.project_id) return; // Keep direct project expenses out of treasury ledger

        const isSalaryExpense = category === "Salary Payments";
        allEvents.push({
            id: `expense-${expense.id}`,
            date: expense.expense_date,
            createdAt: expense.created_at,
            amount,
            type: "expense",
            sourceType: isSalaryExpense ? "salary_payment" : "business_expense",
            title: isSalaryExpense ? expense.description : category,
            description: expense.description,
            category,
            method: expense.payment_method,
            person
        });
    });

    const inRange = (dateValue: string) => dateValue >= fromKey && dateValue <= toKey;

    const monthStarts = eachMonthOfInterval({
        start: startOfMonth(from),
        end: startOfMonth(to)
    });

    const monthMap = new Map(monthStarts.map((month) => {
        const key = format(month, "yyyy-MM");
        return [key, {
            monthKey: key,
            monthLabel: format(month, "MMMM yyyy"),
            openingBalance: 0,
            revenue: 0,
            expense: 0,
            netChange: 0,
            closingBalance: 0,
            cashRevenue: 0,
            claimRevenue: 0,
            reimbursedClaimExpense: 0,
            directExpenses: 0,
            salaryExpenses: 0
        }];
    }));

    let openingBalance = 0;

    allEvents.forEach((event) => {
        const signedAmount = event.type === "revenue" ? event.amount : -event.amount;
        if (event.date < fromKey) {
            openingBalance += signedAmount;
            return;
        }

        if (!inRange(event.date)) return;

        const monthBucket = monthMap.get(format(new Date(event.date), "yyyy-MM"));
        if (!monthBucket) return;

        if (event.type === "revenue") {
            monthBucket.revenue += event.amount;
            if (event.sourceType === "claim_approval") monthBucket.claimRevenue += event.amount;
            else monthBucket.cashRevenue += event.amount;
        } else {
            monthBucket.expense += event.amount;
            if (event.sourceType === "claim_reimbursement") monthBucket.reimbursedClaimExpense += event.amount;
            else if (event.sourceType === "salary_payment") monthBucket.salaryExpenses += event.amount;
            else monthBucket.directExpenses += event.amount;
        }
    });

    const monthly = monthStarts.map((month) => {
        const bucket = monthMap.get(format(month, "yyyy-MM"))!;
        bucket.openingBalance = openingBalance;
        bucket.netChange = bucket.revenue - bucket.expense;
        bucket.closingBalance = bucket.openingBalance + bucket.netChange;
        openingBalance = bucket.closingBalance;
        return bucket;
    });

    const periodRevenue = allEvents.filter(e => e.type === "revenue").reduce((sum, row) => sum + row.amount, 0);
    const periodExpenses = allEvents.filter(e => e.type === "expense").reduce((sum, row) => sum + row.amount, 0);
    const periodLedger = allEvents
        .filter((event) => inRange(event.date))
        .sort((left, right) =>
            new Date(right.date).getTime() - new Date(left.date).getTime() ||
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );

    const claimRows = claims
        .map((claim) => {
            const claimPayments = reimbursementsByExpense[claim.id] || [];
            const reimbursedAmount = claimPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const totalAmount = Number(claim.amount) || 0;
            return {
                ...claim,
                reimbursed_amount: reimbursedAmount,
                outstanding_amount: Math.max(0, totalAmount - reimbursedAmount),
                payment_count: claimPayments.length,
                payments: claimPayments
            };
        })
        .filter((claim) => inRange(claim.expense_date))
        .sort((left, right) =>
            new Date(right.expense_date).getTime() - new Date(left.expense_date).getTime() ||
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );

    const contributorMap: Record<string, ContributorSummary> = {};
    const categoryMap: Record<string, number> = {};
    const claimSummary = {
        pendingClaims: { count: 0, amount: 0 },
        approvedClaims: { count: 0, amount: 0 },
        reimbursedClaims: { count: 0, amount: 0 },
        rejectedClaims: { count: 0, amount: 0 }
    };

    claimRows.forEach((claim) => {
        const employeeId = claim.profiles?.id || claim.id;
        const amount = Number(claim.amount) || 0;
        const category = normalizeExpenseCategory(claim.category);

        if (!contributorMap[employeeId]) {
            contributorMap[employeeId] = {
                employeeId,
                name: claim.profiles?.full_name || "Employee",
                avatar: claim.profiles?.avatar_url || null,
                department: claim.profiles?.department || "Unassigned",
                submittedAmount: 0,
                approvedAmount: 0,
                reimbursedAmount: 0,
                outstandingApprovedAmount: 0,
                pendingAmount: 0,
                rejectedAmount: 0,
                claimsCount: 0,
                latestExpenseDate: claim.expense_date
            };
        }

        const contributor = contributorMap[employeeId];
        contributor.submittedAmount += amount;
        contributor.claimsCount += 1;
        if (new Date(claim.expense_date).getTime() > new Date(contributor.latestExpenseDate).getTime()) {
            contributor.latestExpenseDate = claim.expense_date;
        }

        categoryMap[category] = (categoryMap[category] || 0) + amount;

        if (claim.status === "pending") {
            contributor.pendingAmount += amount;
            claimSummary.pendingClaims.count += 1;
            claimSummary.pendingClaims.amount += amount;
            return;
        }

        if (claim.status === "rejected") {
            contributor.rejectedAmount += amount;
            claimSummary.rejectedClaims.count += 1;
            claimSummary.rejectedClaims.amount += amount;
            return;
        }

        contributor.approvedAmount += amount;
        const reimbursedAmount = Number((claim as { reimbursed_amount?: number }).reimbursed_amount || 0);
        const outstandingAmount = Number((claim as { outstanding_amount?: number }).outstanding_amount || 0);

        if (reimbursedAmount > 0) {
            contributor.reimbursedAmount += reimbursedAmount;
            claimSummary.reimbursedClaims.count += 1;
            claimSummary.reimbursedClaims.amount += reimbursedAmount;
        }

        if (outstandingAmount > 0) {
            contributor.outstandingApprovedAmount += outstandingAmount;
            claimSummary.approvedClaims.count += 1;
            claimSummary.approvedClaims.amount += outstandingAmount;
        }
    });

    const contributors = Object.values(contributorMap).sort((left, right) => {
        if (right.approvedAmount !== left.approvedAmount) return right.approvedAmount - left.approvedAmount;
        return right.submittedAmount - left.submittedAmount;
    });

    const categoryBreakdown = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((left, right) => right.value - left.value);

    return {
        dateRange: {
            from: fromKey,
            to: toKey
        },
        summary: {
            openingBalance: monthly[0]?.openingBalance ?? 0,
            periodRevenue,
            periodExpenses,
            netChange: periodRevenue - periodExpenses,
            closingBalance: monthly[monthly.length - 1]?.closingBalance ?? 0,
            cashRevenue: monthly.reduce((sum, row) => sum + row.cashRevenue, 0),
            approvedClaimRevenue: monthly.reduce((sum, row) => sum + row.claimRevenue, 0),
            reimbursedClaimExpense: monthly.reduce((sum, row) => sum + row.reimbursedClaimExpense, 0),
            directExpenses: monthly.reduce((sum, row) => sum + row.directExpenses, 0),
            salaryExpenses: monthly.reduce((sum, row) => sum + row.salaryExpenses, 0),
            totalTransactions: periodLedger.length,
            salaryLiability,
            ...claimSummary
        },
        monthly,
        ledger: periodLedger,
        claims: claimRows,
        contributors,
        categoryBreakdown
    };
}

export async function getUserAccruals(userId: string) {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
        .from("salary_accruals")
        .select("*")
        .eq("user_id", userId)
        .order("month_year", { ascending: false });

    if (error) return { error: error.message, data: [] };
    return { data };
}

// Categories are hardcoded on frontend now

export async function getFinancialHistory(projectId?: string) {
    const supabase = createSupabaseAdminClient();
    const { organizationId, role } = await getOrgContext();

    if (!organizationId || !canViewCompanyFinance(role)) return [];

    let revenueQuery = supabase
        .from("revenue_logs")
        .select("id, amount, source, description, received_date, created_at, project_id, projects(name), creator:profiles!created_by!inner(organization_id)")
        .eq("creator.organization_id", organizationId)
        .order("received_date", { ascending: false });

    let expenseQuery = supabase
        .from("expenses")
        .select("id, amount, category, description, expense_date, payment_method, created_at, project_id, projects(name), paid_by_profile:profiles!paid_by!inner(organization_id), employee_profile:profiles!employee_id(full_name)")
        .eq("paid_by_profile.organization_id", organizationId)
        .in("status", ["approved", "paid"])
        .order("expense_date", { ascending: false });

    if (projectId) {
        revenueQuery = revenueQuery.eq("project_id", projectId);
        expenseQuery = expenseQuery.eq("project_id", projectId);
    } else {
        revenueQuery = revenueQuery.is("project_id", null);
        expenseQuery = expenseQuery.is("project_id", null);
    }

    const [{ data: revenue }, { data: expenses }] = await Promise.all([revenueQuery, expenseQuery]);

    // Normalize and merge
    const normalizedRevenue: FinancialHistoryItem[] = revenue?.map(r => ({
        id: r.id,
        type: 'revenue',
        amount: r.amount,
        title: r.source,
        subtitle: r.description || "Revenue",
        date: r.received_date,
        created_at: r.created_at,
        category: "Income",
        method: "-",
        project_id: r.project_id,
        project_name: getProjectName(r.projects)
    })) || [];

    const normalizedExpenses: FinancialHistoryItem[] = ((expenses || []) as FinancialHistoryExpenseRow[])?.map(e => {
        const employeeProfile = normalizeJoinedProfile(e.employee_profile);
        return {
        id: e.id,
        type: 'expense',
        amount: e.amount,
        title: e.description,
        subtitle: normalizeExpenseCategory(e.category),
        date: e.expense_date,
        created_at: e.created_at,
        category: normalizeExpenseCategory(e.category),
        method: e.payment_method,
        project_id: e.project_id,
        project_name: getProjectName(e.projects),
        person: employeeProfile?.full_name || null
    };
    }) || [];

    const history = [...normalizedRevenue, ...normalizedExpenses];

    if (!projectId) {
        const financials = await getCompanyFinancials();
        financials.projectBreakdown?.forEach(project => {
            if (project.net !== 0) {
                history.push({
                    id: `project-net-${project.id}`,
                    type: project.net > 0 ? 'revenue' : 'expense',
                    amount: Math.abs(project.net),
                    title: `Project Net ${project.net > 0 ? 'Profit' : 'Loss'}: ${project.name}`,
                    subtitle: `Aggregated project result`,
                    date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                    category: project.net > 0 ? "Project Profit" : "Project Loss",
                    method: "-",
                    project_id: project.id,
                    project_name: project.name
                });
            }
        });
    }

    return history.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function getFinanceVerdicts(projectId: string) {
    const supabase = createSupabaseAdminClient();
    const { organizationId, role } = await getOrgContext();
    if (!organizationId || !canViewCompanyFinance(role)) {
        return { ok: false, message: "Finance access required" };
    }

    const { data, error } = await supabase
        .from("finance_verdicts")
        .select(`
            *,
            profiles:created_by(full_name, avatar_url),
            org_project:projects!inner(organization_id)
        `)
        .eq("project_id", projectId)
        .eq("org_project.organization_id", organizationId)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, message: error.message };
    return { ok: true, data };
}

export async function postFinanceVerdict(projectId: string, content: string) {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();
    if (!user || !organizationId || role !== "admin") {
        return { ok: false, message: "Admin access required" };
    }

    const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("organization_id", organizationId)
        .single();

    if (projectError || !project) {
        return { ok: false, message: "Project not found for your organization" };
    }

    const { data, error } = await supabase
        .from("finance_verdicts")
        .insert({
            project_id: projectId,
            content,
            created_by: user?.id
        })
        .select()
        .single();

    if (error) return { ok: false, message: error.message };
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/finance`);
    return { ok: true, data };
}

export async function getProjectContractAmount(projectId: string) {
    const supabase = createSupabaseAdminClient();
    const { organizationId, role } = await getOrgContext();

    if (!organizationId || !canViewCompanyFinance(role)) {
        return { ok: false, message: "Finance access required", amount: 0 };
    }

    const { data, error } = await supabase
        .from("projects")
        .select("contract_amount")
        .eq("id", projectId)
        .eq("organization_id", organizationId)
        .single();

    if (error) return { ok: false, message: error.message, amount: 0 };
    return { ok: true, amount: Number(data?.contract_amount ?? 0) };
}

export async function updateProjectContractAmount(projectId: string, amount: number) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") return { ok: false, message: "Admin access required" };

    const { error } = await supabase
        .from("projects")
        .update({ contract_amount: amount, updated_at: new Date().toISOString() })
        .eq("id", projectId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/projects/finance");
    return { ok: true };
}
