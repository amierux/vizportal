"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computePayrollForPeriod } from "@/lib/actions/payroll-computation";

/**
 * Create a new payroll period.
 */
export async function createPayrollPeriod(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const payDate = formData.get("pay_date") as string;

  if (!startDate || !endDate || !payDate) return { error: "All dates are required" };

  const { data: period, error } = await supabase
    .from("payroll_periods")
    .insert({
      company_id: profile.company_id,
      start_date: startDate,
      end_date: endDate,
      pay_date: payDate,
    })
    .select("id")
    .single();

  if (error || !period) return { error: "Failed to create period" };

  // Auto-compute entries for all active employees
  await computePayrollForPeriod(period.id, profile.company_id);

  revalidatePath("/payroll/process");
  return { success: true, periodId: period.id };
}

/**
 * Get all payroll periods.
 */
export async function getPayrollPeriods() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("pay_date", { ascending: false });
  return data ?? [];
}

/**
 * Get the latest draft period (for process page).
 */
export async function getLatestDraftPeriod() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

/**
 * Get all entries for a payroll period with employee data.
 */
export async function getPayrollEntries(periodId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_entries")
    .select(`
      *,
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(name), salary, bank_name, bank_account_number)
      )
    `)
    .eq("payroll_period_id", periodId)
    .order("profiles(first_name)");
  return data ?? [];
}

/**
 * Get current user's payroll entries.
 */
export async function getMyPayrollEntries() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("payroll_entries")
    .select(`
      *,
      payroll_periods(start_date, end_date, pay_date, status),
      payroll_custom_deductions(*)
    `)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Get single payroll entry with custom deductions.
 */
export async function getPayrollEntry(entryId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_entries")
    .select(`
      *,
      profiles:profile_id(id, first_name, last_name,
        employee_details(salary, bank_name, bank_account_number,
          employee_schedules:employee_schedules(start_time, end_time, work_days))
      ),
      payroll_periods(start_date, end_date, pay_date),
      payroll_custom_deductions(*)
    `)
    .eq("id", entryId)
    .single();
  return data;
}

/**
 * Update a payroll entry (manual adjustment).
 */
export async function updatePayrollEntry(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const entryId = formData.get("_entryId") as string;

  // Only fields permitted in the Update type (excludes immutable FK/rate columns)
  const updateableFields = [
    "days_worked", "days_absent", "days_late", "late_minutes_total", "undertime_minutes_total",
    "ot_regular_hours", "ot_rest_day_hours", "ot_holiday_hours",
    "paid_leave_days", "unpaid_leave_days", "holiday_pay_days",
    "basic_pay", "ot_pay", "holiday_pay",
    "late_deduction", "undertime_deduction", "absent_deduction", "unpaid_leave_deduction",
    "gross_pay", "sss_contribution", "philhealth_contribution", "pagibig_contribution",
    "withholding_tax", "custom_deductions_total", "total_deductions", "net_pay",
  ] as const;

  type UpdateableField = typeof updateableFields[number];
  const updateData: Partial<Record<UpdateableField, number>> = {};
  for (const field of updateableFields) {
    const val = formData.get(field);
    if (val !== null && val !== "") {
      updateData[field] = Number(val);
    }
  }

  const { error } = await supabase
    .from("payroll_entries")
    .update(updateData)
    .eq("id", entryId);

  if (error) return { error: "Failed to update entry" };

  revalidatePath("/payroll/process");
  return { success: true };
}

/**
 * Add a custom deduction to a payroll entry.
 */
export async function addPayrollCustomDeduction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const entryId = formData.get("_entryId") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as "deduction" | "adjustment";
  const amount = Number(formData.get("amount"));
  const notes = (formData.get("notes") as string) || null;

  if (!name || !amount) return { error: "Name and amount are required" };

  const { error } = await supabase.from("payroll_custom_deductions").insert({
    payroll_entry_id: entryId,
    name,
    type,
    amount,
    notes,
  });

  if (error) return { error: "Failed to add deduction" };

  // Recalculate custom_deductions_total on the entry
  const { data: deductions } = await supabase
    .from("payroll_custom_deductions")
    .select("type, amount")
    .eq("payroll_entry_id", entryId);

  let customTotal = 0;
  for (const d of deductions ?? []) {
    customTotal += d.type === "deduction" ? d.amount : -d.amount;
  }

  // Get current entry to recalculate totals
  const { data: entry } = await supabase
    .from("payroll_entries")
    .select("sss_contribution, philhealth_contribution, pagibig_contribution, withholding_tax, gross_pay")
    .eq("id", entryId)
    .single();

  if (entry) {
    const totalDeductions = entry.sss_contribution + entry.philhealth_contribution +
      entry.pagibig_contribution + entry.withholding_tax + customTotal;
    const netPay = entry.gross_pay - totalDeductions;

    await supabase
      .from("payroll_entries")
      .update({
        custom_deductions_total: customTotal,
        total_deductions: totalDeductions,
        net_pay: netPay,
      })
      .eq("id", entryId);
  }

  revalidatePath("/payroll/process");
  return { success: true };
}

/**
 * Remove a custom deduction.
 */
export async function removePayrollCustomDeduction(deductionId: string, entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payroll_custom_deductions")
    .delete()
    .eq("id", deductionId);
  if (error) return { error: "Failed to remove" };

  // Recalculate (same as above)
  const { data: deductions } = await supabase
    .from("payroll_custom_deductions")
    .select("type, amount")
    .eq("payroll_entry_id", entryId);

  let customTotal = 0;
  for (const d of deductions ?? []) {
    customTotal += d.type === "deduction" ? d.amount : -d.amount;
  }

  const { data: entry } = await supabase
    .from("payroll_entries")
    .select("sss_contribution, philhealth_contribution, pagibig_contribution, withholding_tax, gross_pay")
    .eq("id", entryId)
    .single();

  if (entry) {
    const totalDeductions = entry.sss_contribution + entry.philhealth_contribution +
      entry.pagibig_contribution + entry.withholding_tax + customTotal;
    const netPay = entry.gross_pay - totalDeductions;

    await supabase
      .from("payroll_entries")
      .update({ custom_deductions_total: customTotal, total_deductions: totalDeductions, net_pay: netPay })
      .eq("id", entryId);
  }

  revalidatePath("/payroll/process");
  return { success: true };
}

/**
 * Finalize payroll — mark all entries as finalized, period as completed.
 */
export async function finalizePayroll(periodId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("payroll_entries")
    .update({ status: "finalized" as const })
    .eq("payroll_period_id", periodId);

  await supabase
    .from("payroll_periods")
    .update({
      status: "completed" as const,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
    })
    .eq("id", periodId);

  revalidatePath("/payroll");
  revalidatePath("/payroll/process");
  return { success: true };
}

/**
 * Mark a payroll entry as bank credited.
 */
export async function markBankCredited(entryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("payroll_entries")
    .update({
      bank_credited: true,
      bank_credited_at: new Date().toISOString(),
      bank_credited_by: user.id,
    })
    .eq("id", entryId);

  if (error) return { error: "Failed to update" };
  revalidatePath("/payroll");
  return { success: true };
}

/**
 * Bulk mark all entries in a period as credited.
 */
export async function bulkMarkCredited(periodId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("payroll_entries")
    .update({
      bank_credited: true,
      bank_credited_at: new Date().toISOString(),
      bank_credited_by: user.id,
    })
    .eq("payroll_period_id", periodId)
    .eq("bank_credited", false);

  if (error) return { error: "Failed to update" };
  revalidatePath("/payroll");
  return { success: true };
}
