"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leaveTypeSchema } from "@/lib/validations/leave";

/**
 * Get all leave types for the user's company.
 */
export async function getLeaveTypes() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leave_types")
    .select("*")
    .order("name");

  return data ?? [];
}

/**
 * Create a new leave type (admin only).
 */
export async function createLeaveType(_prevState: unknown, formData: FormData) {
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

  const rawData = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    default_days: Number(formData.get("default_days")),
    is_paid: formData.get("is_paid") === "true",
    applicable_gender: (formData.get("applicable_gender") as string) || "all",
    requires_attachment: formData.get("requires_attachment") === "true",
    is_carry_over: formData.get("is_carry_over") === "true",
    max_carry_over_days: Number(formData.get("max_carry_over_days") || 0),
  };

  const parsed = leaveTypeSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("leave_types").insert({
    ...parsed.data,
    company_id: profile.company_id,
  });

  if (error) {
    if (error.code === "23505") return { error: "A leave type with this code already exists" };
    return { error: "Failed to create leave type" };
  }

  revalidatePath("/leave/settings");
  return { success: true };
}

/**
 * Update a leave type (admin only).
 */
export async function updateLeaveType(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("_id") as string;

  const rawData = {
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    default_days: Number(formData.get("default_days")),
    is_paid: formData.get("is_paid") === "true",
    applicable_gender: (formData.get("applicable_gender") as string) || "all",
    requires_attachment: formData.get("requires_attachment") === "true",
    is_carry_over: formData.get("is_carry_over") === "true",
    max_carry_over_days: Number(formData.get("max_carry_over_days") || 0),
  };

  const parsed = leaveTypeSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("leave_types")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: "Failed to update leave type" };

  revalidatePath("/leave/settings");
  return { success: true };
}

/**
 * Toggle active status of a leave type.
 */
export async function toggleLeaveTypeActive(id: string, isActive: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("leave_types")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: "Failed to update leave type" };

  revalidatePath("/leave/settings");
  return { success: true };
}
