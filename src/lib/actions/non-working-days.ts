"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getNonWorkingDays() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("non_working_days")
    .select("*")
    .order("date", { ascending: false });
  return data ?? [];
}

export async function createNonWorkingDay(_prevState: unknown, formData: FormData) {
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
  const date = formData.get("date") as string;
  const isRecurring = formData.get("is_recurring") === "true";
  const country = (formData.get("country") as string) || "PH";

  if (!name || !date) return { error: "Name and date are required" };

  const { error } = await supabase.from("non_working_days").insert({
    company_id: profile.company_id,
    name,
    date,
    is_recurring: isRecurring,
    country,
  });

  if (error) return { error: "Failed to create non-working day" };

  revalidatePath("/settings/attendance");
  return { success: true };
}

export async function deleteNonWorkingDay(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("non_working_days")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete" };

  revalidatePath("/settings/attendance");
  return { success: true };
}
