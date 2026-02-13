# EKODRIX HRMS (WorkFlow Pro) - Project Overview

Welcome to the **EKODRIX HRMS (WorkFlow Pro)** project! This document provides a comprehensive guide for new developers to understand the system's architecture, business logic, flows, and feature set.

## 1. Project Introduction
**WorkFlow Pro** is a modern Human Resource Management System (HRMS) designed to streamline employee management, attendance tracking, task management, expenses, and daily standups. It features a clean, professional UI and distinct roles for **Admins** and **Employees**.

### Tech Stack
*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) with `tailwindcss-animate`
*   **UI Components:** [Shadcn/ui](https://ui.shadcn.com/) (based on Radix UI) & [Lucide React](https://lucide.dev/) icons
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Auth)
*   **Forms:** React Hook Form + Zod
*   **Animations:** Framer Motion
*   **Charts:** Recharts
*   **Drag & Drop:** @dnd-kit

---

## 2. Database Schema & Data Model
The project uses Supabase (PostgreSQL). The core schema is defined in `supabase/schema.sql`.

### Key Entities
1.  **Profiles (`public.profiles`)**:
    *   Extends Supabase Auth users.
    *   Fields: `full_name`, `role` ('admin' | 'employee'), `department`, `designation`, `date_of_joining`.
    *   **Logic:** A trigger `on_auth_user_created` automatically creates a profile when a user signs up.
2.  **Attendance (`public.attendance`)**:
    *   Tracks daily attendance.
    *   Fields: `punch_in`, `punch_out`, `total_hours`, `status` (present, absent, etc.).
    *   **Constraint:** Unique constraint on `(user_id, date)`.
3.  **Tasks (`public.tasks`)**:
    *   Kanban-style task management.
    *   Fields: `title`, `status` (todo, in_progress, etc.), `priority`, `due_date`, `is_today_focus`.
4.  **Daily Standups (`public.daily_standups`)**:
    *   Records daily progress and blockers.
    *   Fields: `blockers`, `notes`, `focus_task_ids`.
5.  **Expenses (`public.expenses`)**:
    *   Employee expense tracking.
    *   Fields: `amount`, `category_id`, `receipt_url`, `status`.
    *   **Categories:** Managed externally in `public.expense_categories`.
6.  **Company Settings (`public.company_settings`)**:
    *   Global configuration like working hours and currency.

---

## 3. Application Architecture & Flows

### 3.1 Authentication & Routing
Authentication is handled via **Supabase Auth** and Next.js **Middleware**.

*   **Middleware (`middleware.ts`)**:
    *   Intercepts all requests (except static files).
    *   Checks for active Supabase session.
    *   **redirects:**
        *   Unauthenticated users -> `/login`
        *   Authenticated **Admin** trying to access Employee pages -> `/employee/dashboard` (Safety fallback, though admins usually have access).
        *   Authenticated **Employee** trying to access Admin pages -> `/employee/dashboard` (Strict Access Control).

### 3.2 Directory Structure (`src/app`)
*   `app/(auth)`: Public authentication pages (`/login`, `/forgot-password`).
*   `app/(dashboard)`: Protected application routes.
    *   `app/(dashboard)/admin`: Routes accessible only to Admins.
    *   `app/(dashboard)/employee`: Routes for regular Employees.

### 3.3 Business Logic (Server Actions)
Business logic is centralized in the `actions/` directory, using Next.js Server Actions for secure backend operations.

*   `actions/auth.ts`: Login, Signup, Logout mechanisms.
*   `actions/attendance.ts`: Logic for `punchIn`, `punchOut`. Calculates total hours automatically.
*   `actions/tasks.ts`: CRUD operations for tasks, drag-and-drop status updates.

---

## 4. Key Features Breakdown

### 4.1 Admin Module (`/admin`)
*   **Dashboard:** High-level overview of company stats, finding who is present/absent today.
*   **Employees:** CRUD management of employee profiles.
*   **Attendance:** View and correct attendance records for all staff.
*   **Tasks:** Assign and monitor tasks across the organization.
*   **Expenses:** Approve or review submitted expenses.
*   **Settings:** Configure company working hours, holidays, and settings.

### 4.2 Employee Module (`/employee`)
*   **Dashboard:** Personal details, quick punch-in/out widget, today's focus.
*   **Tasks:** Manage personal tasks, move them across Kanban board states.
*   **Attendance:** View personal attendance history.
*   **Team:** View team members and their availability.
*   **Notes:** Personal scratchpad for quick notes.
*   **Profile:** Manage personal details and avatar.

---

## 5. Developer Guide (Getting Started)

1.  **Environment Setup**:
    Ensure you have a `.env.local` file with:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

2.  **Database Setup**:
    Run the `supabase/schema.sql` script in your Supabase SQL Editor to create all tables, triggers, and policies.

3.  **Running Locally**:
    ```bash
    npm install
    npm run dev
    ```

4.  **Adding New Features**:
    *   **Database:** Add new tables in Supabase.
    *   **Types:** Update TypeScript interfaces to match DB schema.
    *   **Actions:** Create a new file in `actions/` for backend logic.
    *   **UI:** Create components in `components/` and pages in `app/`.

---

## 6. Common Scenarios for New Developers

### "I need to add a new field to the Employee profile."
1.  **SQL:** Alter the `profiles` table in Supabase.
2.  **Code:** Update the `Profile` type definition.
3.  **UI:** Update `app/(dashboard)/admin/employees/page.tsx` forms and `app/(dashboard)/employee/profile/page.tsx`.

### "I need to fix an issue with attendance calculation."
1.  Check `actions/attendance.ts`.
2.  Look for the `punchOut` function where `total_hours` is calculated.
3.  Ensure time zone handling is correct (using `date-fns`).

---

## 7. User Onboarding & Auth Roles

### How do users join the platform?
Currently, **there is no public signup page** for security and access control reasons.
*   **Admins:** Create other Admins or Employees directly via the Supabase Dashboard or the Admin Panel (once the feature is fully built).
*   **Employees:** Are added by Admins. They receive their credentials (email/password) securely from the organization.

### Role Management
*   **Default Role:** When a user is created in Supabase Auth, they have no role initially.
*   **Trigger Logic:** The `handle_new_user` trigger in `schema.sql` assigns the **'employee'** role by default if none is provided in `raw_user_meta_data`.
*   **Admin Access:** To make a user an Admin, you must manually update the `role` column in the `public.profiles` table to `'admin'`.

---

## 8. Demo & Development Setup

### Handling Email Verification
By default, Supabase requires email verification. For **local development** and **demos** with fake emails (like `admin@demo.com`):
1.  Go to your **Supabase Dashboard** -> **Authentication** -> **Providers** -> **Email**.
2.  **Disable** "Confirm email".
3.  Now you can create users with any email without needing to verify them.

### Landing Page Logic
The root URL (`/`) automatically redirects to `/login`.
*   This is handled in `app/page.tsx`.
*   This ensures the application is "closed" to the public and acts as a private internal tool.

---

**End of Project Overview**
