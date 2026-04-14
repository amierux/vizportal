"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createApprovalRequest } from "@/lib/actions/approvals";
import { overtimeRequestSchema } from "@/lib/validations/overtime";

export async function fileOvertimeRequest(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rawData = {
    date: formData.get("date") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    reason: formData.get("reason") as string,
  };

  const parsed = overtimeRequestSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  // Calculate total hours
  const [sH, sM] = parsed.data.start_time.split(":").map(Number);
  const [eH, eM] = parsed.data.end_time.split(":").map(Number);
  let totalHours = (eH + eM / 60) - (sH + sM / 60);
  if (totalHours < 0) totalHours += 24; // cross-midnight
  totalHours = Math.round(totalHours * 100) / 100;

  // Handle attachment
  const attachmentUrl = (formData.get("attachment_url") as string) || null;

  const { data: request, error: insertError } = await supabase
    .from("overtime_requests")
    .insert({
      company_id: profile.company_id,
      profile_id: user.id,
      date: parsed.data.date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      total_hours: totalHours,
      reason: parsed.data.reason,
      attachment_url: attachmentUrl,
    })
    .select("id")
    .single();

  if (insertError || !request) return { error: "Failed to create overtime request" };

  const approvalResult = await createApprovalRequest({
    companyId: profile.company_id,
    type: "overtime",
    referenceId: request.id,
    requesterId: user.id,
    details: `<p><strong>Date:</strong> ${parsed.data.date}</p>
      <p><strong>Time:</strong> ${parsed.data.start_time} — ${parsed.data.end_time}</p>
      <p><strong>Total Hours:</strong> ${totalHours}h</p>
      <p><strong>Reason:</strong> ${parsed.data.reason}</p>`,
  });

  if ("error" in approvalResult) return { error: approvalResult.error };

  revalidatePath("/overtime");
  return { success: true };
}

export async function getMyOvertimeRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("overtime_requests")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function cancelOvertimeRequest(requestId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("overtime_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .single();

  if (!request) return { error: "Request not found or cannot be cancelled" };

  await supabase
    .from("overtime_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  // Cancel associated approval request
  const { data: approvalReq } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("type", "overtime")
    .eq("reference_id", requestId)
    .eq("status", "pending")
    .single();

  if (approvalReq) {
    const { cancelApprovalRequest } = await import("@/lib/actions/approvals");
    await cancelApprovalRequest(approvalReq.id);
  }

  revalidatePath("/overtime");
  return { success: true };
}

export async function getOvertimeRecords(filters: {
  scope: "personal" | "team" | "department" | "all";
  startDate?: string;
  endDate?: string;
  search?: string;
  departmentId?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("overtime_requests")
    .select(`
      *,
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(id, name))
      )
    `)
    .order("created_at", { ascending: false });

  if (filters.startDate) query = query.gte("date", filters.startDate);
  if (filters.endDate) query = query.lte("date", filters.endDate);

  if (filters.scope === "personal") {
    query = query.eq("profile_id", user.id);
  }

  const { data } = await query;
  let results = data ?? [];

  if (filters.scope !== "personal" && filters.scope !== "all") {
    const { data: userDetail } = await supabase
      .from("employee_details")
      .select("department_id")
      .eq("profile_id", user.id)
      .single();

    if (filters.scope === "team" || filters.scope === "department") {
      const { data: deptMembers } = await supabase
        .from("employee_details")
        .select("profile_id")
        .eq("department_id", userDetail?.department_id ?? "");

      const memberIds = (deptMembers ?? []).map((m) => m.profile_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = results.filter((r: any) => memberIds.includes(r.profile_id));
    }
  }

  if (filters.search) {
    const s = filters.search.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results = results.filter((r: any) => {
      const name = `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.toLowerCase();
      return name.includes(s);
    });
  }

  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results = results.filter((r: any) => {
      return r.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return results;
}
