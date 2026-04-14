"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getContributionTables(type: string, year: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ph_contribution_tables")
    .select("*")
    .eq("type", type)
    .eq("effective_year", year)
    .order("salary_from");
  return data ?? [];
}

export async function getTaxBrackets(frequency: string, year: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ph_tax_brackets")
    .select("*")
    .eq("frequency", frequency)
    .eq("effective_year", year)
    .order("compensation_from");
  return data ?? [];
}

export async function updateContributionRow(id: string, employeeShare: number, employerShare: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ph_contribution_tables")
    .update({ employee_share: employeeShare, employer_share: employerShare })
    .eq("id", id);
  if (error) return { error: "Failed to update" };
  revalidatePath("/settings/payroll");
  return { success: true };
}

export async function updateTaxBracketRow(id: string, taxRate: number, baseTax: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ph_tax_brackets")
    .update({ tax_rate: taxRate, base_tax: baseTax })
    .eq("id", id);
  if (error) return { error: "Failed to update" };
  revalidatePath("/settings/payroll");
  return { success: true };
}
