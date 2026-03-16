"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/lib/auth-utils";
import { postBusinessExpense } from "./finance";

export async function calculateProjectProfit(projectId: string) {
    const supabase = createSupabaseServerClient();

    // 1. Fetch revenue for the specific project
    const { data: revenueData, error: revenueError } = await supabase
        .from("revenue_logs")
        .select("amount")
        .eq("project_id", projectId);

    if (revenueError) return { success: false, error: revenueError.message };

    const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    // 2. Fetch utility expenses for the specific project
    // Note: Salary and broker commission are excluded by category filter in real costs
    const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("amount")
        .eq("project_id", projectId)
        .in("status", ["approved", "paid"]);

    if (expenseError) return { success: false, error: expenseError.message };

    const utilityExpenses = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // 3. Calculate net_profit_pool
    const netProfitPool = totalRevenue - utilityExpenses;

    // 4. apply distribution percentages
    // Get existing percentages or use defaults
    const { data: existingDist } = await supabase
        .from("project_profit_distribution")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

    const brokerPercentage = existingDist?.broker_percentage ?? 10;
    const companyPercentage = existingDist?.company_percentage ?? 30;
    const employeePercentage = existingDist?.employee_percentage ?? 60;

    const brokerAmount = (netProfitPool * brokerPercentage) / 100;
    const companyAmount = (netProfitPool * companyPercentage) / 100;
    const employeePoolAmount = (netProfitPool * employeePercentage) / 100;

    // 5. Save results
    const { error: upsertError } = await supabase
        .from("project_profit_distribution")
        .upsert({
            project_id: projectId,
            net_profit_pool: netProfitPool,
            broker_percentage: brokerPercentage,
            company_percentage: companyPercentage,
            employee_percentage: employeePercentage,
            broker_amount: brokerAmount,
            company_amount: companyAmount,
            employee_pool_amount: employeePoolAmount,
            updated_at: new Date().toISOString()
        }, { onConflict: 'project_id' });

    if (upsertError) return { success: false, error: upsertError.message };

    // Trigger employee share recalculation
    await calculateProjectEmployeeShare(projectId, employeePoolAmount);

    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/finance");
    return { success: true };
}

export async function calculateProjectEmployeeShare(projectId: string, employeePoolAmount?: number) {
    const supabase = createSupabaseServerClient();

    // If pool amount not provided, fetch it
    let poolAmount = employeePoolAmount;
    if (poolAmount === undefined) {
        const { data: dist } = await supabase
            .from("project_profit_distribution")
            .select("employee_pool_amount")
            .eq("project_id", projectId)
            .maybeSingle();
        poolAmount = Number(dist?.employee_pool_amount || 0);
    }

    // Also fetch current shares to see if there are manual overrides
    const { data: existingShares } = await supabase
        .from("project_employee_share")
        .select("*")
        .eq("project_id", projectId);

    const manualShares = (existingShares || []).filter(s => s.is_manual_override);
    const manualTotal = manualShares.reduce((sum, s) => sum + Number(s.manual_amount || 0), 0);
    const manualUserIds = new Set(manualShares.map(s => s.employee_id));

    // 1. Fetch tasks only for the specific project
    const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("user_id, difficulty_score")
        .eq("project_id", projectId)
        .not("user_id", "is", null);

    if (tasksError) return { success: false, error: tasksError.message };

    // 2. Group tasks by employee_id and sum difficulty_score
    const employeeScores: Record<string, number> = {};
    let totalProjectScore = 0;
    let nonManualProjectScore = 0;

    tasks?.forEach(task => {
        if (task.user_id && task.difficulty_score) {
            employeeScores[task.user_id] = (employeeScores[task.user_id] || 0) + Number(task.difficulty_score);
            totalProjectScore += Number(task.difficulty_score);
            if (!manualUserIds.has(task.user_id)) {
                nonManualProjectScore += Number(task.difficulty_score);
            }
        }
    });

    if (totalProjectScore === 0) {
        // Clear existing shares if no scores
        await supabase.from("project_employee_share").delete().eq("project_id", projectId);
        return { success: true };
    }

    const availablePoolForCalculated = Math.max(0, poolAmount - manualTotal);

    // 3. Calculate and store results
    const shares: any[] = [];
    
    // Add manual shares first
    manualShares.forEach(manualShare => {
        const score = employeeScores[manualShare.employee_id] || 0;
        shares.push({
            project_id: projectId,
            employee_id: manualShare.employee_id,
            task_score_total: score,
            score_percentage: totalProjectScore > 0 ? (score / totalProjectScore) * 100 : 0,
            share_amount: Number(manualShare.manual_amount),
            is_manual_override: true,
            manual_amount: Number(manualShare.manual_amount),
            is_paid: manualShare.is_paid,
            paid_at: manualShare.paid_at,
            expense_id: manualShare.expense_id
        });
    });

    // Add calculated shares
    Object.entries(employeeScores).forEach(([employeeId, score]) => {
        if (manualUserIds.has(employeeId)) return; // Already handled

        const scorePercentage = totalProjectScore > 0 ? (score / totalProjectScore) * 100 : 0;
        
        let shareAmount = 0;
        if (nonManualProjectScore > 0) {
            shareAmount = (Number(score) / Number(nonManualProjectScore)) * availablePoolForCalculated;
        }

        // Get paid status if exists
        const existing = existingShares?.find(s => s.employee_id === employeeId);

        shares.push({
            project_id: projectId,
            employee_id: employeeId,
            task_score_total: score,
            score_percentage: scorePercentage,
            share_amount: shareAmount,
            is_manual_override: false,
            manual_amount: 0,
            is_paid: existing?.is_paid || false,
            paid_at: existing?.paid_at,
            expense_id: existing?.expense_id
        });
    });

    // Delete existing and insert new
    await supabase.from("project_employee_share").delete().eq("project_id", projectId);
    const { error: insertError } = await supabase.from("project_employee_share").insert(shares);

    if (insertError) return { success: false, error: insertError.message };

    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/finance");
    return { success: true };
}

export async function updateProfitDistribution(projectId: string, updates: {
    broker_percentage?: number;
    company_percentage?: number;
    employee_percentage?: number;
    broker_amount?: number;
    company_amount?: number;
    employee_pool_amount?: number;
}) {
    const supabase = createSupabaseServerClient();

    // Fetch current state to handle overrides correctly
    const { data: current } = await supabase
        .from("project_profit_distribution")
        .select("*")
        .eq("project_id", projectId)
        .single();

    if (!current) return { success: false, error: "Distribution not found" };

    const netProfitPool = Number(current.net_profit_pool);
    let newUpdates = { ...updates };

    // If amounts are edited, update percentages
    if (updates.broker_amount !== undefined) {
        newUpdates.broker_percentage = (updates.broker_amount / netProfitPool) * 100;
    }
    if (updates.company_amount !== undefined) {
        newUpdates.company_percentage = (updates.company_amount / netProfitPool) * 100;
    }
    if (updates.employee_pool_amount !== undefined) {
        newUpdates.employee_percentage = (updates.employee_pool_amount / netProfitPool) * 100;
    }

    // Ensure DB always correctly matches the percentages against the net profit pool
    const finalBrokerPct = newUpdates.broker_percentage ?? current.broker_percentage;
    const finalCompanyPct = newUpdates.company_percentage ?? current.company_percentage;
    const finalEmployeePct = newUpdates.employee_percentage ?? current.employee_percentage;

    newUpdates.broker_amount = (netProfitPool * finalBrokerPct) / 100;
    newUpdates.company_amount = (netProfitPool * finalCompanyPct) / 100;
    newUpdates.employee_pool_amount = (netProfitPool * finalEmployeePct) / 100;

    const { error } = await supabase
        .from("project_profit_distribution")
        .update({
            ...newUpdates,
            updated_at: new Date().toISOString()
        })
        .eq("project_id", projectId);

    if (error) return { success: false, error: error.message };

    // Recalculate employee shares if employee pool changed
    if (newUpdates.employee_pool_amount !== undefined || newUpdates.employee_percentage !== undefined) {
        const poolAmount = newUpdates.employee_pool_amount ?? (netProfitPool * (newUpdates.employee_percentage || 0) / 100);
        await calculateProjectEmployeeShare(projectId, poolAmount);
    }

    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/finance");
    return { success: true };
}

export async function updateEmployeeShare(projectId: string, employeeId: string, manualAmount: number | null) {
    const supabase = createSupabaseServerClient();
    
    // Check if the share exists
    const { data: share } = await supabase
        .from("project_employee_share")
        .select("*")
        .eq("project_id", projectId)
        .eq("employee_id", employeeId)
        .single();
        
    if (!share) return { success: false, error: "Share not found" };
    if (share.is_paid) return { success: false, error: "Cannot modify a paid share" };

    if (manualAmount === null) {
        await supabase
            .from("project_employee_share")
            .update({
                is_manual_override: false,
                manual_amount: 0
            })
            .eq("id", share.id);
    } else {
        await supabase
            .from("project_employee_share")
            .update({
                is_manual_override: true,
                manual_amount: manualAmount,
                share_amount: manualAmount
            })
            .eq("id", share.id);
            
        // Because the user specified an explicit manual override amount, we want to 
        // increase/decrease the total Employee Pool accordingly, and subtract/add from the Broker & Company pools.
        const diff = Number(manualAmount) - Number(share.share_amount);
        if (diff !== 0) {
            const { data: dist } = await supabase
                .from("project_profit_distribution")
                .select("*")
                .eq("project_id", projectId)
                .single();
                
            if (dist && Number(dist.net_profit_pool) > 0) {
                const netPool = Number(dist.net_profit_pool);
                const currentBroker = Number(dist.broker_amount);
                const currentCompany = Number(dist.company_amount);
                const currentEmployee = Number(dist.employee_pool_amount);
                
                const newEmployeePool = currentEmployee + diff;
                const newEmployeePct = (newEmployeePool / netPool) * 100;

                const otherSum = currentBroker + currentCompany;
                let newBroker, newCompany;
                
                // Proportionally subtract the 'diff' from Broker and Company
                if (otherSum > 0) {
                    newBroker = currentBroker - (currentBroker / otherSum) * diff;
                    newCompany = currentCompany - (currentCompany / otherSum) * diff;
                } else {
                    newBroker = currentBroker - (diff / 2);
                    newCompany = currentCompany - (diff / 2);
                }

                await supabase
                    .from("project_profit_distribution")
                    .update({
                        employee_pool_amount: newEmployeePool,
                        employee_percentage: newEmployeePct,
                        broker_amount: newBroker,
                        broker_percentage: (newBroker / netPool) * 100,
                        company_amount: newCompany,
                        company_percentage: (newCompany / netPool) * 100,
                        updated_at: new Date().toISOString()
                    })
                    .eq("project_id", projectId);
            }
        }
    }

    // Recalculate other shares
    await calculateProjectEmployeeShare(projectId);
    
    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/finance");
    return { success: true };
}

export async function payEmployeeShare(projectId: string, employeeId: string, paymentMethod: string = "bank_transfer") {
    const supabase = createSupabaseServerClient();
    const { user, organizationId, role } = await getOrgContext();
    
    if (!organizationId || (role !== 'admin' && role !== 'founder')) {
        return { success: false, error: "Unauthorized or organization context missing" };
    }

    // 1. Get the share details
    const { data: share, error: shareError } = await supabase
        .from("project_employee_share")
        .select("*, projects(name)")
        .eq("project_id", projectId)
        .eq("employee_id", employeeId)
        .single();
        
    if (shareError || !share) return { success: false, error: shareError?.message || "Share not found" };
    if (share.is_paid) return { success: false, error: "Share is already paid" };
    if (Number(share.share_amount) <= 0) return { success: false, error: "Share amount must be greater than 0" };

    const amount = Number(share.share_amount);

    // 2. Create the standard expense
    const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
            amount,
            description: `Project Distribution Share for ${share.projects.name}`,
            category: "Project Share",
            payment_method: paymentMethod,
            project_id: projectId,
            employee_id: employeeId,
            paid_by: user?.id,
            organization_id: organizationId,
            status: 'paid',
            expense_date: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: user?.id
        })
        .select()
        .single();
        
    if (expenseError) return { success: false, error: expenseError.message };

    // 3. Make the linked payment record
    await supabase
        .from("employee_payments")
        .insert({
            employee_id: employeeId,
            project_id: projectId,
            payment_type: "project_share",
            amount,
            date: new Date().toISOString().split('T')[0],
            status: "completed",
            notes: `Project Distribution Share for ${share.projects.name}`
        });

    // 4. Update the share status
    await supabase
        .from("project_employee_share")
        .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            expense_id: expense.id
        })
        .eq("id", share.id);

    // 5. Update profit calculation and invalidate paths
    await calculateProjectProfit(projectId);
    
    revalidatePath(`/admin/projects/${projectId}/finance`);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/employees");
    
    return { success: true };
}
