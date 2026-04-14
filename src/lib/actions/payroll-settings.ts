"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getPayrollSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("payroll_settings").select("*").single();
  return data;
}

export async function updatePayrollSettings(_prevState: unknown, formData: FormData) {
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

  const data = {
    schedule_type: formData.get("schedule_type") as string,
    pay_day_1: Number(formData.get("pay_day_1")),
    pay_day_2: formData.get("pay_day_2") ? Number(formData.get("pay_day_2")) : null,
    cutoff_days_before: Number(formData.get("cutoff_days_before") || 5),
    is_enabled: formData.get("is_enabled") === "true",
    enable_late_deduction: formData.get("enable_late_deduction") === "true",
    enable_undertime_deduction: formData.get("enable_undertime_deduction") === "true",
    enable_absent_deduction: formData.get("enable_absent_deduction") === "true",
    ot_regular_multiplier: Number(formData.get("ot_regular_multiplier") || 1.25),
    ot_rest_day_multiplier: Number(formData.get("ot_rest_day_multiplier") || 1.30),
    ot_holiday_multiplier: Number(formData.get("ot_holiday_multiplier") || 2.00),
  };

  const { data: existing } = await supabase
    .from("payroll_settings")
    .select("id")
    .eq("company_id", profile.company_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("payroll_settings")
      .update(data)
      .eq("id", existing.id);
    if (error) return { error: "Failed to update settings" };
  } else {
    const { error } = await supabase
      .from("payroll_settings")
      .insert({ ...data, company_id: profile.company_id });
    if (error) return { error: "Failed to create settings" };
  }

  revalidatePath("/settings/payroll");
  return { success: true };
}

export async function getCustomDeductionTypes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_deduction_types")
    .select("*")
    .order("name");
  return data ?? [];
}

export async function createCustomDeductionType(_prevState: unknown, formData: FormData) {
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

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  const { error } = await supabase.from("custom_deduction_types").insert({
    company_id: profile.company_id,
    name,
  });

  if (error) return { error: "Failed to create deduction type" };

  revalidatePath("/settings/payroll");
  return { success: true };
}

export async function toggleCustomDeductionType(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_deduction_types")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: "Failed to update" };
  revalidatePath("/settings/payroll");
  return { success: true };
}

export async function getRecurringDeductions(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_deductions")
    .select("*, custom_deduction_types(name)")
    .eq("profile_id", profileId)
    .order("created_at");
  return data ?? [];
}

export async function saveEmployeeSalaryDetails(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const profileId = formData.get("_profileId") as string;

  const salary = Number(formData.get("salary") || 0);
  const bankName = (formData.get("bank_name") as string) || null;
  const bankAccountNumber = (formData.get("bank_account_number") as string) || null;

  const { error } = await supabase
    .from("employee_details")
    .update({ salary, bank_name: bankName, bank_account_number: bankAccountNumber })
    .eq("profile_id", profileId);

  if (error) return { error: "Failed to save" };

  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}

export async function addRecurringDeduction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const profileId = formData.get("_profileId") as string;
  const deductionTypeId = formData.get("deduction_type_id") as string;
  const amount = Number(formData.get("amount"));
  const startDate = formData.get("start_date") as string;
  const endDate = (formData.get("end_date") as string) || null;

  if (!deductionTypeId || !amount || !startDate) return { error: "Missing required fields" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", profileId)
    .single();
  if (!profile) return { error: "Employee not found" };

  const { error } = await supabase.from("recurring_deductions").insert({
    profile_id: profileId,
    company_id: profile.company_id,
    custom_deduction_type_id: deductionTypeId,
    amount,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) return { error: "Failed to add deduction" };

  revalidatePath(`/employees/${profileId}`);
  return { success: true };
}

export async function toggleRecurringDeduction(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_deductions")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: "Failed to update" };
  return { success: true };
}
