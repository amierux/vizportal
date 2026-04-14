"use server";

import { createClient } from "@/lib/supabase/server";

export type RecordScope = "personal" | "team" | "department" | "all";

/**
 * Get attendance records with scope and filters.
 */
export async function getAttendanceRecords(filters: {
  scope: RecordScope;
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
    .from("daily_attendance_summary")
    .select(`
      *,
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(id, name))
      )
    `)
    .order("date", { ascending: false });

  // Date range
  if (filters.startDate) query = query.gte("date", filters.startDate);
  if (filters.endDate) query = query.lte("date", filters.endDate);

  // Scope filter
  if (filters.scope === "personal") {
    query = query.eq("profile_id", user.id);
  }
  // For team/department/all, we fetch all and filter client-side based on scope
  // because Supabase can't easily filter by nested department relationships

  const { data } = await query;
  let results = data ?? [];

  if (filters.scope !== "personal" && filters.scope !== "all") {
    // Get user's department info for scoping
    const { data: userDetail } = await supabase
      .from("employee_details")
      .select("department_id")
      .eq("profile_id", user.id)
      .single();

    if (filters.scope === "team" || filters.scope === "department") {
      // Get department members
      const { data: deptMembers } = await supabase
        .from("employee_details")
        .select("profile_id")
        .eq("department_id", userDetail?.department_id ?? "");

      const memberIds = (deptMembers ?? []).map((m) => m.profile_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results = results.filter((r: any) => memberIds.includes(r.profile_id));
    }
  }

  // Name search (client-side filter on nested profile)
  if (filters.search) {
    const s = filters.search.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results = results.filter((r: any) => {
      const name = `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.toLowerCase();
      return name.includes(s);
    });
  }

  // Department filter
  if (filters.departmentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results = results.filter((r: any) => {
      return r.profiles?.employee_details?.department_id === filters.departmentId;
    });
  }

  return results;
}

/**
 * Get leave records with scope and filters.
 */
export async function getLeaveRecords(filters: {
  scope: RecordScope;
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
    .from("leave_requests")
    .select(`
      *,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(id, name))
      )
    `)
    .order("created_at", { ascending: false });

  // Date range (filter on leave start_date)
  if (filters.startDate) query = query.gte("start_date", filters.startDate);
  if (filters.endDate) query = query.lte("start_date", filters.endDate);

  // Scope
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
