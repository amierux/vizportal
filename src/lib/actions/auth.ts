"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, setPasswordSchema } from "@/lib/validations/auth";
import { completeProfileSchema } from "@/lib/validations/employee";

type ActionState = { error: string } | null;

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function setPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Failed to set password. Please try again." };
  }

  redirect("/complete-profile");
}

export async function completeProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const rawData: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    rawData[key] = value;
  });

  const parsed = completeProfileSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Update profile names
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      profile_completed: true,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: "Failed to update profile" };
  }

  // Update employee details
  const { error: detailError } = await supabase
    .from("employee_details")
    .update({
      phone_number: parsed.data.phone_number,
      gender: parsed.data.gender,
      date_of_birth: parsed.data.date_of_birth,
      address_line: parsed.data.address_line,
      city: parsed.data.city,
      province: parsed.data.province,
      zip_code: parsed.data.zip_code,
      emergency_contact_name: parsed.data.emergency_contact_name,
      emergency_contact_phone: parsed.data.emergency_contact_phone,
      emergency_contact_relationship: parsed.data.emergency_contact_relationship,
    })
    .eq("profile_id", user.id);

  if (detailError) {
    return { error: "Failed to update employee details" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
