"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function punchInAction(formData: FormData) {
  const blockers = String(formData.get("blockers") ?? "") || null;
  const workMode = String(formData.get("workMode") ?? "office");
  const focusTaskIdsRaw = String(formData.get("focusTaskIds") ?? "");
  const focusTaskIds =
    focusTaskIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean) || [];

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: "Not authenticated" };
  }

  const now = new Date();
  const istDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  // Check if there's already an open session (even from yesterday)
  const { data: openSession } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", user.id)
    .is("punch_out", null)
    .maybeSingle();

  if (openSession) {
    return { ok: false, message: "You are already punched in. Please punch out first." };
  }

  const { data, error } = await supabase.from("attendance").upsert(
    {
      user_id: user.id,
      date: istDate,
      punch_in: now.toISOString(),
      punch_out: null,
      status: "present",
      work_mode: workMode
    },
    { onConflict: "user_id,date" }
  ).select().single();

  if (error) return { ok: false, message: error.message };

  const { error: standupError } = await supabase.from("daily_standups").upsert(
    {
      user_id: user.id,
      date: istDate,
      blockers,
      focus_task_ids: focusTaskIds
    },
    { onConflict: "user_id,date" }
  );
  if (standupError) return { ok: false, message: standupError.message };

  // Log activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: `punched in (${workMode})`,
    entity_type: "attendance",
    entity_id: data.id,
    metadata: { method: "web", work_mode: workMode }
  });

  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/attendance");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/attendance");
  return { ok: true, data };
}

export async function punchOutAction() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const now = new Date();

  // Find the latest open session for this user (handles night shifts)
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .is("punch_out", null)
    .order("punch_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "No active session found to punch out from." };

  const punchIn = new Date(data.punch_in);
  const totalHours = (now.getTime() - punchIn.getTime()) / 1000 / 60 / 60;

  const { error: updateError } = await supabase
    .from("attendance")
    .update({
      punch_out: now.toISOString(),
      total_hours: Math.max(0, Math.round(totalHours * 100) / 100)
    })
    .eq("id", data.id);

  if (updateError) return { ok: false, message: updateError.message };

  const { data: updatedData } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", data.id)
    .single();

  // Log activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "punched out",
    entity_type: "attendance",
    entity_id: data.id,
    metadata: { total_hours: Math.max(0, Math.round(totalHours * 100) / 100) }
  });

  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/attendance");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/attendance");
  return { ok: true, data: updatedData };
}

export async function autoPunchOutAction(attendanceId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Fetch the attendance record
  const { data: record, error: fetchError } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", attendanceId)
    .eq("user_id", user.id)
    .is("punch_out", null)
    .single();

  if (fetchError || !record) {
    return { ok: false, message: "No open attendance record found." };
  }

  // Set punch_out to 23:55:00 IST on the record's date
  // record.date is 'YYYY-MM-DD', so we build a timestamp in IST
  const punchOutIST = new Date(`${record.date}T23:55:00+05:30`);
  const punchIn = new Date(record.punch_in);
  const totalHours = (punchOutIST.getTime() - punchIn.getTime()) / 1000 / 60 / 60;

  const { error: updateError } = await supabase
    .from("attendance")
    .update({
      punch_out: punchOutIST.toISOString(),
      total_hours: Math.max(0, Math.round(totalHours * 100) / 100),
      notes: ((record.notes as string) || "") + " [System: Auto Punch-out]"
    })
    .eq("id", attendanceId);

  if (updateError) return { ok: false, message: updateError.message };

  // Close any open breaks too
  await supabase
    .from("attendance_breaks")
    .update({ end_time: punchOutIST.toISOString() })
    .eq("attendance_id", attendanceId)
    .is("end_time", null);

  // Log activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "auto punched out (forgotten session)",
    entity_type: "attendance",
    entity_id: attendanceId,
    metadata: { total_hours: Math.max(0, Math.round(totalHours * 100) / 100), auto: true }
  });

  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/attendance");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/attendance");
  return { ok: true };
}

export async function getTodayAttendance() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // First check for any open session (active right now)
  const { data: openSession, error: openError } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .is("punch_out", null)
    .maybeSingle();

  if (openError) return { ok: false, message: openError.message };
  if (openSession) return { ok: true, data: openSession };

  // If no open session, look for a completed session for today
  const istDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", istDate)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

export async function getAttendanceHistory() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", sevenDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

export async function startBreakAction() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Find the current open session (punch_out IS NULL) — works across timezones & night shifts
  const { data: attendance, error: attError } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", user.id)
    .is("punch_out", null)
    .order("punch_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attError || !attendance) return { ok: false, message: "No active punch-in found. Please punch in first." };

  // Check if there's already an active break
  const { data: existingBreak } = await supabase
    .from("attendance_breaks")
    .select("id")
    .eq("attendance_id", attendance.id)
    .is("end_time", null)
    .maybeSingle();

  if (existingBreak) return { ok: false, message: "You are already on a break." };

  const { error } = await supabase.from("attendance_breaks").insert({
    attendance_id: attendance.id,
    start_time: new Date().toISOString()
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/employee/attendance");
  revalidatePath("/employee/dashboard");
  return { ok: true };
}

export async function resumeWorkAction() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Find the current open session (punch_out IS NULL) — works across timezones & night shifts
  const { data: attendance, error: attError } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", user.id)
    .is("punch_out", null)
    .order("punch_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attError || !attendance) return { ok: false, message: "No active punch-in found." };

  // Find the last break that hasn't ended
  const { data: activeBreak, error: breakError } = await supabase
    .from("attendance_breaks")
    .select("id")
    .eq("attendance_id", attendance.id)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (breakError) return { ok: false, message: breakError.message };
  if (!activeBreak) return { ok: true }; // Already resumed or no break found

  const { error } = await supabase
    .from("attendance_breaks")
    .update({ end_time: new Date().toISOString() })
    .eq("id", activeBreak.id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/employee/attendance");
  revalidatePath("/employee/dashboard");
  return { ok: true };
}

export async function getAttendanceStatusAction() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const now = new Date();
  const istDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  // 1. Check for OPEN session (ignoring date to catch night shifts/previous days)
  const { data: openSession } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .is("punch_out", null)
    .order("punch_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openSession) {
    // Check if it's a stale session that needs auto-closing
    // Logic: If session date is < today (IST) AND it's past 11:55 PM? 
    // Actually, simple logic: if date < today, it's stale (assuming we don't support >24h shifts without punch out)
    // The previous client logic was: if session.date < todayIST -> autoClose.
    // Let's replicate that safety check.

    if (openSession.date < istDate) {
      // It's from a previous day. Auto close it.
      await autoPunchOutAction(openSession.id);

      // Now fetch TODAY's record to see if they punched in for today already (unlikely if they had open session, but possible)
      // Actually if we just closed the old one, they are now "offline" or "completed" depending on if they punched in today.
      // Let's just return offline/completed for today.

      const { data: todayRecord } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", istDate)
        .maybeSingle();

      if (todayRecord && todayRecord.punch_out) {
        return {
          ok: true,
          status: "completed",
          punchIn: todayRecord.punch_in,
          punchOut: todayRecord.punch_out
        };
      }
      return { ok: true, status: "offline" };
    }

    // Session is valid (today). Check for active break.
    const { data: activeBreak } = await supabase
      .from("attendance_breaks")
      .select("start_time")
      .eq("attendance_id", openSession.id)
      .is("end_time", null)
      .limit(1)
      .maybeSingle();

    if (activeBreak) {
      return {
        ok: true,
        status: "on_break",
        punchIn: openSession.punch_in,
        lastBreakStartTime: activeBreak.start_time
      };
    } else {
      return {
        ok: true,
        status: "working",
        punchIn: openSession.punch_in
      };
    }
  }

  // 2. No open session. Check for COMPLETED session for today.
  const { data: todayRecord } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", istDate)
    .maybeSingle();

  if (todayRecord && todayRecord.punch_out) {
    return {
      ok: true,
      status: "completed",
      punchIn: todayRecord.punch_in,
      punchOut: todayRecord.punch_out
    };
  }

  return { ok: true, status: "offline" };
}
