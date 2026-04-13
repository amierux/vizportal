"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { departmentSchema } from "@/lib/validations/company";

export async function getDepartments() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data } = await supabase
    .from("departments")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("name");

  return data ?? [];
}

export async function createDepartment(formData: FormData) {
  const supabase = await createClient();

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    manager_id: formData.get("manager_id") || null,
    team_leader_id: formData.get("team_leader_id") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

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

  const { error } = await supabase.from("departments").insert({
    company_id: profile.company_id,
    ...parsed.data,
  });

  if (error) {
    if (error.code === "23505") return { error: "Department name already exists" };
    return { error: "Failed to create department" };
  }

  revalidatePath("/company");
  return { success: true };
}

export async function updateDepartment(id: string, formData: FormData) {
  const supabase = await createClient();

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    manager_id: formData.get("manager_id") || null,
    team_leader_id: formData.get("team_leader_id") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("departments")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: "Failed to update department" };

  revalidatePath("/company");
  return { success: true };
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) return { error: "Failed to delete department. It may have employees assigned." };

  revalidatePath("/company");
  return { success: true };
}
