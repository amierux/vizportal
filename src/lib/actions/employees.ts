"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { employeeDetailSchema, memberSelfEditSchema } from "@/lib/validations/employee";

export async function getEmployees(
  page = 1,
  perPage = 25,
  filters?: { search?: string; department_id?: string; status?: string }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], count: 0 };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("profiles")
    .select(
      `
      *,
      employee_details!inner(
        department_id, job_position, employment_status,
        departments(name),
        job_levels(code, name)
      ),
      user_roles(role_id, roles(name))
    `,
      { count: "exact" }
    )
    .eq("is_active", true)
    .range(from, to)
    .order("first_name");

  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  if (filters?.department_id) {
    query = query.eq("employee_details.department_id", filters.department_id);
  }

  if (filters?.status) {
    query = query.eq("employee_details.employment_status", filters.status as "probationary" | "regular" | "resigned" | "terminated");
  }

  const { data, count } = await query;

  return { data: data ?? [], count: count ?? 0 };
}

export async function getEmployee(id: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      `
      *,
      employee_details(*,
        departments(id, name),
        job_levels(id, code, name)
      ),
      user_roles(role_id, roles(id, name))
    `
    )
    .eq("id", id)
    .single();

  return data;
}

export async function updateEmployee(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const profileId = formData.get("_profileId") as string;

  const rawData: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (key.startsWith("_")) return;
    if (value === "") rawData[key] = null;
    else if (key === "weekly_required_hours" || key === "salary")
      rawData[key] = Number(value);
    else rawData[key] = value;
  });

  const parsed = employeeDetailSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { first_name, last_name, ...employeeData } = parsed.data;

  // Update profile name
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ first_name, last_name })
    .eq("id", profileId);

  if (profileError) return { error: "Failed to update profile" };

  // Update employee details
  const { error: detailError } = await supabase
    .from("employee_details")
    .update(employeeData)
    .eq("profile_id", profileId);

  if (detailError) return { error: "Failed to update employee details" };

  revalidatePath(`/employees/${profileId}`);
  revalidatePath("/employees");
  return { success: true };
}

export async function updateOwnProfile(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rawData: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (key.startsWith("_")) return;
    if (value === "") rawData[key] = null;
    else rawData[key] = value;
  });

  const parsed = memberSelfEditSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("employee_details")
    .update(parsed.data)
    .eq("profile_id", user.id);

  if (error) return { error: "Failed to update profile" };

  revalidatePath("/profile");
  return { success: true };
}
