"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createApprovalRequest } from "@/lib/actions/approvals";
import { scheduleSchema, manualClockSchema } from "@/lib/validations/attendance";
import {
  calculateTotalHours,
  checkLateness,
  checkEarlyOut,
  getWorkDate,
} from "@/lib/utils/attendance";
import { SGT_TIMEZONE } from "@/lib/constants";

/**
 * Get all clock entries for a specific profile + date (in/out events).
 */
export async function getClockEntriesByDate(profileId: string, date: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clock_entries")
    .select("id, type, timestamp, selfie_url, latitude, longitude, is_manual, manual_remarks, attachment_url")
    .eq("profile_id", profileId)
    .eq("date", date)
    .order("timestamp", { ascending: true });
  return data ?? [];
}

/**
 * Clock in or out. Called from the clock button component.
 */
export async function clockAction(params: {
  type: "clock_in" | "clock_out";
  selfieUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  const timestamp = new Date().toISOString();
  const workDate = getWorkDate(timestamp);

  const { error } = await supabase.from("clock_entries").insert({
    company_id: profile.company_id,
    profile_id: user.id,
    type: params.type,
    timestamp,
    selfie_url: params.selfieUrl,
    latitude: params.latitude,
    longitude: params.longitude,
    date: workDate,
  });

  if (error) return { error: "Failed to record clock entry" };

  // Recalculate daily summary
  await recalculateDailySummary(user.id, profile.company_id, workDate);

  revalidatePath("/attendance");
  return { success: true };
}

/**
 * Submit a manual clock entry request (requires approval).
 */
export async function submitManualClock(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rawData = {
    date: formData.get("date") as string,
    type: formData.get("type") as string,
    time: formData.get("time") as string,
    reason: formData.get("reason") as string,
  };

  const parsed = manualClockSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  // Build timestamp from date + time (SGT +08:00)
  const timestamp = new Date(`${parsed.data.date}T${parsed.data.time}:00+08:00`).toISOString();
  const workDate = parsed.data.date;

  // Handle optional attachment upload
  let attachmentUrl: string | null = null;
  const attachmentFile = formData.get("attachment") as File | null;
  if (attachmentFile && attachmentFile.size > 0) {
    const ext = attachmentFile.name.split(".").pop();
    const fileId = crypto.randomUUID();
    const path = `${profile.company_id}/attendance/${user.id}/manual/${fileId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("vizportal-storage")
      .upload(path, attachmentFile);
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("vizportal-storage")
        .getPublicUrl(path);
      attachmentUrl = urlData.publicUrl;
    }
  }

  // Create clock entry with is_manual = true
  const { data: entry, error: insertError } = await supabase
    .from("clock_entries")
    .insert({
      company_id: profile.company_id,
      profile_id: user.id,
      type: parsed.data.type as "clock_in" | "clock_out",
      timestamp,
      is_manual: true,
      date: workDate,
      attachment_url: attachmentUrl,
    })
    .select("id")
    .single();

  if (insertError || !entry) return { error: "Failed to create manual entry" };

  // Create approval request
  const approvalResult = await createApprovalRequest({
    companyId: profile.company_id,
    type: "manual_clock",
    referenceId: entry.id,
    requesterId: user.id,
    details: `<p><strong>Type:</strong> ${parsed.data.type === "clock_in" ? "Clock In" : "Clock Out"}</p>
      <p><strong>Date:</strong> ${parsed.data.date}</p>
      <p><strong>Time:</strong> ${parsed.data.time}</p>
      <p><strong>Reason:</strong> ${parsed.data.reason}</p>`,
  });

  if ("error" in approvalResult) return { error: approvalResult.error };

  revalidatePath("/attendance");
  return { success: true };
}

/**
 * Recalculate the daily attendance summary for a given profile and date.
 */
export async function recalculateDailySummary(
  profileId: string,
  companyId: string,
  date: string
) {
  const supabase = await createClient();

  const [{ data: entries }, { data: schedule }, { data: empDetail }] = await Promise.all([
    supabase
      .from("clock_entries")
      .select("id, type, timestamp")
      .eq("profile_id", profileId)
      .eq("date", date)
      .order("timestamp", { ascending: true }),
    supabase
      .from("employee_schedules")
      .select("start_time, end_time, work_days")
      .eq("profile_id", profileId)
      .single(),
    supabase
      .from("employee_details")
      .select("break_enabled, break_start_time, break_end_time")
      .eq("profile_id", profileId)
      .single(),
  ]);

  if (!schedule) return;

  // Calculate required hours from schedule, minus break window if enabled
  const [startH, startM] = schedule.start_time.split(":").map(Number);
  const [endH, endM] = schedule.end_time.split(":").map(Number);
  let requiredHours = (endH + endM / 60) - (startH + startM / 60);

  let breakHours = 0;
  if (empDetail?.break_enabled && empDetail.break_start_time && empDetail.break_end_time) {
    const [bsH, bsM] = empDetail.break_start_time.split(":").map(Number);
    const [beH, beM] = empDetail.break_end_time.split(":").map(Number);
    breakHours = (beH + beM / 60) - (bsH + bsM / 60);
    if (breakHours > 0) requiredHours -= breakHours;
  }

  const clockEntries = entries ?? [];
  const totalHours = calculateTotalHours(clockEntries, {
    enabled: !!empDetail?.break_enabled,
    startTime: empDetail?.break_start_time,
    endTime: empDetail?.break_end_time,
  });

  // Check lateness
  const clockIns = clockEntries.filter((e) => e.type === "clock_in");
  const clockOuts = clockEntries.filter((e) => e.type === "clock_out");

  let isLate = false;
  let lateMinutes = 0;
  if (clockIns.length > 0) {
    const result = checkLateness(
      clockIns[0].timestamp,
      schedule.start_time,
      date,
      schedule.timezone
    );
    isLate = result.isLate;
    lateMinutes = result.lateMinutes;
  }

  // Check early out
  let isEarlyOut = false;
  let earlyOutMinutes = 0;
  if (clockOuts.length > 0) {
    const result = checkEarlyOut(
      clockOuts[clockOuts.length - 1].timestamp,
      schedule.end_time,
      schedule.timezone
    );
    isEarlyOut = result.isEarlyOut;
    earlyOutMinutes = result.earlyOutMinutes;
  }

  // Calculate undertime/overtime
  const diffMinutes = Math.round((totalHours - requiredHours) * 60);
  const isUndertime = diffMinutes < 0;
  const undertimeMinutes = isUndertime ? Math.abs(diffMinutes) : 0;
  const overtimeMinutes = diffMinutes > 0 ? diffMinutes : 0;

  // Check for missing entries (odd count)
  const hasMissingEntry = clockEntries.length % 2 !== 0;

  // Determine status
  let status: "present" | "late" | "absent" | "half_day" | "on_leave" = "absent";
  if (clockEntries.length === 0) {
    // Check if on leave
    const { data: leaveReq } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("profile_id", profileId)
      .eq("status", "approved")
      .lte("start_date", date)
      .gte("end_date", date)
      .limit(1)
      .single();

    status = leaveReq ? "on_leave" : "absent";
  } else if (totalHours < requiredHours * 0.5) {
    status = "half_day";
  } else if (isLate) {
    status = "late";
  } else {
    status = "present";
  }

  // Upsert daily summary
  const { data: existing } = await supabase
    .from("daily_attendance_summary")
    .select("id")
    .eq("profile_id", profileId)
    .eq("date", date)
    .single();

  const updatePayload = {
    total_hours: totalHours,
    required_hours: requiredHours,
    is_late: isLate,
    late_minutes: lateMinutes,
    is_early_out: isEarlyOut,
    early_out_minutes: earlyOutMinutes,
    is_undertime: isUndertime,
    undertime_minutes: undertimeMinutes,
    overtime_minutes: overtimeMinutes,
    has_missing_entry: hasMissingEntry,
    status,
  };

  if (existing) {
    await supabase
      .from("daily_attendance_summary")
      .update(updatePayload)
      .eq("id", existing.id);
  } else {
    await supabase.from("daily_attendance_summary").insert({
      profile_id: profileId,
      company_id: companyId,
      date,
      ...updatePayload,
    });
  }
}

/**
 * Get today's clock status for the current user.
 */
export async function getTodayClockStatus() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: SGT_TIMEZONE });

  const { data: entries } = await supabase
    .from("clock_entries")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", today)
    .order("timestamp", { ascending: true });

  const { data: schedule } = await supabase
    .from("employee_schedules")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const { data: summary } = await supabase
    .from("daily_attendance_summary")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", today)
    .single();

  // Determine if currently clocked in (last entry is a clock_in)
  const lastEntry = entries && entries.length > 0 ? entries[entries.length - 1] : null;
  const isClockedIn = lastEntry?.type === "clock_in";

  return {
    entries: entries ?? [],
    schedule,
    summary,
    isClockedIn,
    lastEntry,
  };
}

/**
 * Get clock entries for a specific profile and date.
 */
export async function getClockEntries(profileId: string, date: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("clock_entries")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", date)
    .order("timestamp", { ascending: true });

  return data ?? [];
}

/**
 * Get attendance summaries with filters (for admin/HR views).
 */
export async function getAttendanceSummaries(filters: {
  date?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  perPage?: number;
}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("daily_attendance_summary")
    .select(
      `
      *,
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(name))
      )
    `,
      { count: "exact" }
    )
    .range(from, to)
    .order("date", { ascending: false });

  if (filters.date) {
    query = query.eq("date", filters.date);
  }

  if (filters.startDate && filters.endDate) {
    query = query.gte("date", filters.startDate).lte("date", filters.endDate);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count } = await query;

  // Client-side filter by department (Supabase can't filter nested joins easily)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filtered: any[] = data ?? [];
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((row: any) => {
      const dept = row.profiles?.employee_details?.department_id;
      return dept === filters.departmentId;
    });
  }

  return { data: filtered, count: count ?? 0 };
}

/**
 * Get team attendance for today (for TL/DM views).
 */
export async function getTeamAttendanceToday() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toLocaleDateString("en-CA", { timeZone: SGT_TIMEZONE });

  const { data } = await supabase
    .from("daily_attendance_summary")
    .select(
      `
      *,
      profiles:profile_id(id, first_name, last_name, email)
    `
    )
    .eq("date", today)
    .order("status");

  return data ?? [];
}

/**
 * Save employee schedule (HR/Admin only).
 */
export async function saveEmployeeSchedule(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient();

  const profileId = formData.get("_profileId") as string;

  const rawData = {
    work_type: formData.get("work_type") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    work_days: formData.getAll("work_days") as string[],
    timezone: (formData.get("timezone") as string) || "Asia/Singapore",
  };

  const parsed = scheduleSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Employee not found" };

  // Upsert schedule
  const { data: existing } = await supabase
    .from("employee_schedules")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("employee_schedules")
      .update(parsed.data)
      .eq("id", existing.id);

    if (error) return { error: "Failed to update schedule" };
  } else {
    const { error } = await supabase
      .from("employee_schedules")
      .insert({
        ...parsed.data,
        profile_id: profileId,
        company_id: profile.company_id,
      });

    if (error) return { error: "Failed to create schedule" };
  }

  revalidatePath("/attendance");
  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}

/**
 * Get employee schedule.
 */
export async function getEmployeeSchedule(profileId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("employee_schedules")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  return data;
}

/**
 * Get monthly attendance summary for reports.
 */
export async function getMonthlyAttendanceReport(filters: {
  year: number;
  month: number;
  departmentId?: string;
}) {
  const supabase = await createClient();

  const startDate = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
  const endDate = new Date(filters.year, filters.month, 0).toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_attendance_summary")
    .select(
      `
      *,
      profiles:profile_id(id, first_name, last_name,
        employee_details(department_id, departments(name))
      )
    `
    )
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filtered: any[] = data ?? [];
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered = filtered.filter((row: any) => {
      return row.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return filtered;
}
