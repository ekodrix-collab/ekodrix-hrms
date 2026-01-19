# Authentication & User Flow

## 🔐 Current Authentication Flow

### For Admin (Organization Creator)

1. **Signup** (`/signup`)
   - Admin creates account with email + password
   - Supabase Auth creates user account
   - Redirected to `/onboarding`

2. **Onboarding** (`/onboarding`)
   - Admin creates organization (company name + slug)
   - Profile record created with `role: 'admin'`
   - Linked to organization
   - Redirected to dashboard

3. **Dashboard Access** (`/`)
   - Full access to all modules
   - Can add employees
   - Can manage finance
   - Can view all organization data

### For Employees (Current Limitation)

**⚠️ IMPORTANT: Employee authentication needs to be implemented!**

Currently, there are two approaches:

#### Option A: Admin Creates Employee Accounts (Recommended)
1. Admin adds employee via `/employees/add`
2. Employee record created in database
3. **Missing**: Employee needs Supabase Auth account
4. **Solution needed**: Send invitation email or create auth account

#### Option B: Employee Self-Signup (Not Implemented)
1. Employee signs up with special invite code
2. Links to existing employee record
3. Gets employee role automatically

---

## 🔄 Recommended Implementation

### Step 1: Admin Creates Employee
```
Admin → /employees/add
  ├─ Creates employee record in database
  ├─ Auto-generates temporary password
  └─ Sends invitation email
```

### Step 2: Employee First Login
```
Employee → Receives email
  ├─ Clicks invitation link
  ├─ Sets own password
  └─ Linked to employee record
```

### Step 3: Employee Dashboard
```
Employee → /
  ├─ Limited dashboard (no finance, no employee management)
  ├─ Can clock in/out (attendance)
  ├─ Can manage own tasks
  └─ Can view team directory
```

---

## 🎯 Current User Roles

### Admin
- **Permissions**: Full access
- **Can Access**:
  - ✅ Dashboard (all stats)
  - ✅ Employees (add, edit, view)
  - ✅ Attendance (all employees)
  - ✅ Tasks (all tasks)
  - ✅ Finance (income/expense)
  
### Employee  
- **Permissions**: Limited access
- **Can Access**:
  - ✅ Dashboard (personal stats only)
  - ✅ Attendance (own records, clock in/out)
  - ✅ Tasks (own tasks only)
  - ⛔ Employees (view only, can't add)
  - ⛔ Finance (no access)

---

## 🚧 What Needs to be Built

### 1. Employee Invitation System
```typescript
// app/employees/add/actions.ts
export async function inviteEmployee(formData: FormData) {
  // 1. Create employee record
  // 2. Create Supabase Auth user
  // 3. Send invitation email
  // 4. Store invite token
}
```

### 2. Employee Onboarding
```typescript
// app/invite/[token]/page.tsx
export default function AcceptInvite({ params }) {
  // 1. Verify invitation token
  // 2. Let employee set password
  // 3. Link to employee record
  // 4. Redirect to dashboard
}
```

### 3. Role-Based UI
- Conditional rendering based on user role
- Hide admin-only features from employees
- Separate dashboards for admin vs employee

---

## 💡 Quick Fix (Manual Setup)

Until employee invitation is built:

1. **Admin Creates Employee Record**
   - Go to `/employees/add`
   - Add employee details
   - Note the employee email

2. **Manually Create Auth Account**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Invite User"
   - Enter employee email
   - Employee receives invitation email

3. **Link Employee to Auth**
   - After employee accepts invite
   - Update employee record: set `profile_id` to auth user ID
   - Employee can now login

---

## 📊 Database Relationship

```
auth.users (Supabase Auth)
    ↓ (id)
profiles (role, org)
    ↓ (id → profile_id)
employees (work details)
```

**Key Point**: Every user needs:
1. Auth account (in `auth.users`)
2. Profile (in `profiles` table with role)
3. Employee record (if they're an employee, not just admin)

---

## ✅ Recommendation

Implement **Option A: Admin-Invited Employees**

**Why?**
- More control for admin
- Better security (no public signup)
- Proper onboarding flow
- Common in HRMS systems

**Next Steps:**
1. Build employee invitation system
2. Create invite acceptance page
3. Add email notifications
4. Update UI for role-based access
