"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/actions/notifications";

export async function getWeeklyTimesheet(weekStartDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { entries: [], submission: null };

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndDate = weekEnd.toISOString().split("T")[0];

  const { data: entries } = await supabase
    .from("workspace_time_entries")
    .select("*, workspace_tasks:task_id(id, name)")
    .eq("profile_id", user.id)
    .gte("date", weekStartDate)
    .lte("date", weekEndDate)
    .order("date");

  const { data: submission } = await supabase
    .from("timesheet_submissions")
    .select("*")
    .eq("profile_id", user.id)
    .eq("week_start_date", weekStartDate)
    .single();

  return { entries: entries ?? [], submission };
}

export async function submitTimesheet(weekStartDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndDate = weekEnd.toISOString().split("T")[0];

  // Sum total minutes
  const { data: entries } = await supabase
    .from("workspace_time_entries")
    .select("duration_minutes")
    .eq("profile_id", user.id)
    .gte("date", weekStartDate)
    .lte("date", weekEndDate);

  const totalMinutes = (entries ?? []).reduce((sum, e) => sum + e.duration_minutes, 0);

  // Upsert submission
  const { data: existing } = await supabase
    .from("timesheet_submissions")
    .select("id")
    .eq("profile_id", user.id)
    .eq("week_start_date", weekStartDate)
    .single();

  if (existing) {
    await supabase.from("timesheet_submissions")
      .update({ total_minutes: totalMinutes, status: "submitted" as const, submitted_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("timesheet_submissions").insert({
      profile_id: user.id,
      company_id: profile.company_id,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      total_minutes: totalMinutes,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
    });
  }

  revalidatePath("/timesheet");
  return { success: true };
}

export async function getMyTimesheetSubmissions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("timesheet_submissions")
    .select("*").eq("profile_id", user.id)
    .order("week_start_date", { ascending: false });
  return data ?? [];
}

export async function getAllTimesheetSubmissions(filters: {
  startDate?: string; endDate?: string; departmentId?: string; status?: string;
}) {
  const supabase = await createClient();

  let query = supabase.from("timesheet_submissions")
    .select("*, profiles:profile_id(id, first_name, last_name, employee_details(department_id, departments(name)))")
    .order("week_start_date", { ascending: false });

  if (filters.startDate) query = query.gte("week_start_date", filters.startDate);
  if (filters.endDate) query = query.lte("week_start_date", filters.endDate);
  if (filters.status) query = query.eq("status", filters.status as "draft" | "submitted" | "approved" | "rejected");

  const { data } = await query;
  let results = data ?? [];

  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results = results.filter((r: any) =>
      r.profiles?.employee_details?.department_id === filters.departmentId
    );
  }

  return results;
}

export async function approveTimesheet(submissionId: string, comment: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("timesheet_submissions")
    .update({ status: "approved" as const }).eq("id", submissionId);
  if (error) return { error: "Failed to approve" };

  // Get submitter for notification
  const { data: sub } = await supabase.from("timesheet_submissions")
    .select("profile_id, company_id, week_start_date").eq("id", submissionId).single();
  if (sub) {
    await sendNotification({
      companyId: sub.company_id, recipientId: sub.profile_id,
      type: "timesheet_approved", title: "Timesheet Approved",
      message: `Your timesheet for week of ${sub.week_start_date} has been approved.${comment ? ` Comment: ${comment}` : ""}`,
      link: "/timesheet",
    });
  }

  revalidatePath("/timesheet");
  return { success: true };
}

export async function rejectTimesheet(submissionId: string, comment: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("timesheet_submissions")
    .update({ status: "rejected" as const }).eq("id", submissionId);
  if (error) return { error: "Failed to reject" };

  const { data: sub } = await supabase.from("timesheet_submissions")
    .select("profile_id, company_id, week_start_date").eq("id", submissionId).single();
  if (sub) {
    await sendNotification({
      companyId: sub.company_id, recipientId: sub.profile_id,
      type: "timesheet_rejected", title: "Timesheet Rejected",
      message: `Your timesheet for week of ${sub.week_start_date} was rejected.${comment ? ` Comment: ${comment}` : ""}`,
      link: "/timesheet",
    });
  }

  revalidatePath("/timesheet");
  return { success: true };
}
