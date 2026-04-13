"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invitationSchema } from "@/lib/validations/settings";
import { INVITATION_EXPIRY_DAYS } from "@/lib/constants";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function getInvitations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return [];

  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function createInvitation(formData: FormData) {
  const supabase = await createClient();

  const roleIdsRaw = formData.get("role_ids") as string;
  const roleIds = roleIdsRaw ? roleIdsRaw.split(",") : [];

  const parsed = invitationSchema.safeParse({
    email: formData.get("email"),
    department_id: formData.get("department_id") || null,
    job_level_id: formData.get("job_level_id") || null,
    job_position: formData.get("job_position") || undefined,
    role_ids: roleIds,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  // Check for duplicate pending invitation
  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("email", parsed.data.email)
    .eq("status", "pending")
    .single();

  if (existing) return { error: "A pending invitation already exists for this email" };

  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .eq("company_id", profile.company_id)
    .single();

  if (existingProfile) return { error: "A user with this email already exists" };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  // Create the invitation record
  const { error: inviteError } = await supabase.from("invitations").insert({
    company_id: profile.company_id,
    email: parsed.data.email,
    department_id: parsed.data.department_id,
    job_level_id: parsed.data.job_level_id,
    job_position: parsed.data.job_position,
    role_ids: parsed.data.role_ids,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (inviteError) return { error: "Failed to create invitation" };

  // Create auth user + profile using service role key
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: false,
  });

  if (authError) return { error: "Failed to create user account" };

  // Create profile
  await adminClient.from("profiles").insert({
    id: authUser.user.id,
    company_id: profile.company_id,
    email: parsed.data.email,
    profile_completed: false,
  });

  // Create employee_details
  await adminClient.from("employee_details").insert({
    profile_id: authUser.user.id,
    company_id: profile.company_id,
    department_id: parsed.data.department_id,
    job_level_id: parsed.data.job_level_id,
    job_position: parsed.data.job_position,
  });

  // Assign roles
  for (const roleId of parsed.data.role_ids) {
    await adminClient.from("user_roles").insert({
      profile_id: authUser.user.id,
      role_id: roleId,
    });
  }

  // Send invite email via Supabase Auth
  await adminClient.auth.admin.inviteUserByEmail(parsed.data.email);

  revalidatePath("/settings/invitations");
  return { success: true };
}

export async function resendInvitation(id: string) {
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("email")
    .eq("id", id)
    .single();

  if (!invitation) return { error: "Invitation not found" };

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  await supabase
    .from("invitations")
    .update({ status: "pending", expires_at: expiresAt.toISOString() })
    .eq("id", id);

  await adminClient.auth.admin.inviteUserByEmail(invitation.email);

  revalidatePath("/settings/invitations");
  return { success: true };
}
