"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formSchema } from "@/lib/validations/forms";

// ─── Form CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a new form with a default "Section 1".
 * Returns the new form ID on success.
 */
export async function createForm(_prevState: unknown, formData: FormData) {
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
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = formSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: form, error: formError } = await supabase
    .from("forms")
    .insert({
      company_id: profile.company_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (formError || !form) return { error: "Failed to create form" };

  // Add default first section
  await supabase.from("form_sections").insert({
    form_id: form.id,
    name: "Section 1",
    position: 0,
  });

  revalidatePath("/forms");
  return { success: true, formId: form.id };
}

/**
 * Get all forms for the current user's company (admin view).
 */
export async function getForms() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("forms")
    .select(
      `
      *,
      form_submissions(count)
    `
    )
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get a single form with sections (ordered by position) and fields (ordered by position).
 */
export async function getForm(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("forms")
    .select(
      `
      *,
      form_sections(
        *,
        form_fields(*)
      )
    `
    )
    .eq("id", formId)
    .single();

  if (!data) return null;

  // Sort sections and fields by position
  if (Array.isArray(data.form_sections)) {
    data.form_sections.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
    for (const section of data.form_sections) {
      if (Array.isArray(section.form_fields)) {
        section.form_fields.sort(
          (a: { position: number }, b: { position: number }) => a.position - b.position
        );
      }
    }
  }

  return data;
}

/**
 * Update a form's name and description.
 */
export async function updateForm(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const formId = formData.get("form_id") as string;
  if (!formId) return { error: "Form ID required" };

  const rawData = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = formSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("forms")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq("id", formId);

  if (error) return { error: "Failed to update form" };

  revalidatePath("/forms");
  revalidatePath(`/forms/builder/${formId}`);
  return { success: true };
}

/**
 * Publish a form (set status to published).
 */
export async function publishForm(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("forms")
    .update({ status: "published" })
    .eq("id", formId);

  if (error) return { error: "Failed to publish form" };

  revalidatePath("/forms");
  revalidatePath(`/forms/builder/${formId}`);
  return { success: true };
}

/**
 * Archive a form (set status to archived).
 */
export async function archiveForm(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("forms")
    .update({ status: "archived" })
    .eq("id", formId);

  if (error) return { error: "Failed to archive form" };

  revalidatePath("/forms");
  return { success: true };
}

/**
 * Delete a form permanently.
 */
export async function deleteForm(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("forms").delete().eq("id", formId);

  if (error) return { error: "Failed to delete form" };

  revalidatePath("/forms");
  return { success: true };
}

/**
 * Assign a form to one or more profiles.
 * Creates form_assignments records for each profile.
 */
export async function assignForm(formId: string, profileIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!profileIds.length) return { error: "No profiles specified" };

  const inserts = profileIds.map((profileId) => ({
    form_id: formId,
    profile_id: profileId,
    completed: false,
  }));

  const { error } = await supabase.from("form_assignments").insert(inserts);

  if (error) return { error: "Failed to assign form" };

  revalidatePath(`/forms/${formId}/submissions`);
  return { success: true };
}

/**
 * Get all assignments for a form with profile data.
 */
export async function getFormAssignments(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_assignments")
    .select(
      `
      *,
      profiles:profile_id(id, first_name, last_name, email, avatar_url)
    `
    )
    .eq("form_id", formId)
    .order("assigned_at", { ascending: false });

  return data ?? [];
}

/**
 * Fetch a form by its public_token — no auth check, used for public form page.
 */
export async function getFormByPublicToken(token: string) {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("forms")
    .select(
      `
      *,
      form_sections(
        *,
        form_fields(*)
      )
    `
    )
    .eq("public_token", token)
    .eq("is_public", true)
    .eq("status", "published")
    .single();

  if (!data) return null;

  // Sort sections and fields by position
  if (Array.isArray(data.form_sections)) {
    data.form_sections.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
    for (const section of data.form_sections) {
      if (Array.isArray(section.form_fields)) {
        section.form_fields.sort(
          (a: { position: number }, b: { position: number }) => a.position - b.position
        );
      }
    }
  }

  return data;
}

/**
 * Get the current user's pending form assignments.
 */
export async function getMyAssignedForms() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("form_assignments")
    .select(
      `
      *,
      forms:form_id(id, name, description, status)
    `
    )
    .eq("profile_id", user.id)
    .eq("completed", false)
    .order("assigned_at", { ascending: false });

  return data ?? [];
}
