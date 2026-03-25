-- Migration: Add Project Profit Distribution and Employee Share
-- Date: 2026-03-11

CREATE TABLE IF NOT EXISTS project_profit_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    net_profit_pool NUMERIC DEFAULT 0,
    broker_percentage NUMERIC DEFAULT 10,
    company_percentage NUMERIC DEFAULT 30,
    employee_percentage NUMERIC DEFAULT 60,
    broker_amount NUMERIC DEFAULT 0,
    company_amount NUMERIC DEFAULT 0,
    employee_pool_amount NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS project_employee_share (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_score_total NUMERIC DEFAULT 0,
    score_percentage NUMERIC DEFAULT 0,
    share_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);

-- RLS Policies
ALTER TABLE project_profit_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_employee_share ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage project_profit_distribution
CREATE POLICY "Admins can manage project_profit_distribution" 
ON project_profit_distribution
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to manage project_employee_share
CREATE POLICY "Admins can manage project_employee_share" 
ON project_employee_share
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow employees to view their own shares
CREATE POLICY "Employees can view their own shares" 
ON project_employee_share
FOR SELECT
USING (employee_id = auth.uid());
