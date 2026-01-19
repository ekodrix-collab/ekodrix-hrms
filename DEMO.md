# Ekodrix HRMS - Demo Access

## 🎨 View the UI Demo (No Setup Required)

**Visit: http://localhost:3000/demo**

This demo page showcases the entire HRMS UI with dummy data. You can see:
- Dashboard with stats
- Employee directory
- Attendance tracking widget
- Task management Kanban board
- Financial dashboard

## 📋 Dummy Data Included

**Employees:**
- John Doe (john@ekodrix.com)
- Jane Smith (jane@ekodrix.com)
- Mike Johnson (mike@ekodrix.com)

**Tasks:**
- Design new landing page (To Do)
- Fix dashboard bugs (In Progress)
- Update documentation (Done)

**Transactions:**
- Income: ₹50,000 (Client Payment)
- Expenses: ₹18,500 (Rent + Software)

**Attendance:**
- Sample: 09:15 AM - 06:30 PM (8.5 hours)

---

## 🔐 For Full Authentication Flow (After Supabase Setup)

Once you configure Supabase, you can test the real authentication:

**Test Credentials (You'll create these):**
1. Visit `/signup`
2. Create an account with any email/password
3. Create your organization
4. Start using the full application

---

## ⚙️ Supabase Setup (When Ready)

1. **Create Supabase Project**: https://supabase.com
2. **Get Credentials**: Copy your project URL and anon key
3. **Update `.env.local`**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. **Run Database Migration**: Execute `supabase/schema.sql` in Supabase SQL Editor
5. **Restart Dev Server**: `npm run dev`
6. **Visit**: http://localhost:3000/login

---

## 🚀 Quick Links

- **Demo UI**: http://localhost:3000/demo
- **Login** (after setup): http://localhost:3000/login
- **Signup** (after setup): http://localhost:3000/signup
