"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formSettingsSchema } from "@/lib/validations/forms";

// ─── Sections ─────────────────────────────────────────────────────────────────

/**
 * Add a new section to a form at the next position.
 */
export async function addSection(formId: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get next position
  const { data: existing } = await supabase
    .from("form_sections")
    .select("position")
    .eq("form_id", formId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const { data: section, error } = await supabase
    .from("form_sections")
    .insert({
      form_id: formId,
      name,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error || !section) return { error: "Failed to add section" };

  revalidatePath(`/forms/builder/${formId}`);
  return { success: true, sectionId: section.id };
}

/**
 * Update a section's name, description, and/or condition.
 * condition is expected as a JSON string in formData.
 */
export async function updateSection(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const sectionId = formData.get("section_id") as string;
  if (!sectionId) return { error: "Section ID required" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Section name is required" };

  const description = (formData.get("description") as string) || null;
  const conditionRaw = formData.get("condition") as string | null;

  let condition = null;
  if (conditionRaw) {
    try {
      condition = JSON.parse(conditionRaw);
    } catch {
      return { error: "Invalid condition JSON" };
    }
  }

  const { error } = await supabase
    .from("form_sections")
    .update({ name, description, condition })
    .eq("id", sectionId);

  if (error) return { error: "Failed to update section" };

  // Revalidate builder — need form_id for path
  const { data: section } = await supabase
    .from("form_sections")
    .select("form_id")
    .eq("id", sectionId)
    .single();

  if (section?.form_id) {
    revalidatePath(`/forms/builder/${section.form_id}`);
  }

  return { success: true };
}

/**
 * Delete a section and all its fields (cascade handled by DB).
 */
export async function deleteSection(sectionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get form_id before deleting for path revalidation
  const { data: section } = await supabase
    .from("form_sections")
    .select("form_id")
    .eq("id", sectionId)
    .single();

  const { error } = await supabase.from("form_sections").delete().eq("id", sectionId);

  if (error) return { error: "Failed to delete section" };

  if (section?.form_id) {
    revalidatePath(`/forms/builder/${section.form_id}`);
  }

  return { success: true };
}

/**
 * Reorder sections by updating their positions in bulk.
 */
export async function reorderSections(formId: string, sectionIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updates = sectionIds.map((id, index) =>
    supabase
      .from("form_sections")
      .update({ position: index })
      .eq("id", id)
      .eq("form_id", formId)
  );

  await Promise.all(updates);

  revalidatePath(`/forms/builder/${formId}`);
  return { success: true };
}

// ─── Fields ───────────────────────────────────────────────────────────────────

type FieldType =
  | "text"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio"
  | "file"
  | "signature"
  | "email"
  | "phone"
  | "calculated";

/**
 * Add a new field to a section at the next position.
 * name defaults to label, is_required defaults to false.
 */
export async function addField(
  sectionId: string,
  formId: string,
  type: string,
  label: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get next position within this section
  const { data: existing } = await supabase
    .from("form_fields")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 0;

  const fieldType = type as FieldType;

  const { data: field, error } = await supabase
    .from("form_fields")
    .insert({
      section_id: sectionId,
      form_id: formId,
      name: label,
      label,
      type: fieldType,
      position: nextPosition,
      is_required: false,
    })
    .select("id")
    .single();

  if (error || !field) return { error: "Failed to add field" };

  revalidatePath(`/forms/builder/${formId}`);
  return { success: true, fieldId: field.id };
}

/**
 * Update any field property.
 * Accepts JSON strings for options, validation_rules, and conditional_logic.
 */
export async function updateField(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const fieldId = formData.get("field_id") as string;
  if (!fieldId) return { error: "Field ID required" };

  const label = formData.get("label") as string;
  if (!label?.trim()) return { error: "Label is required" };

  const name = (formData.get("name") as string) || label;
  const type = formData.get("type") as string;
  const is_required = formData.get("is_required") === "true";
  const placeholder = (formData.get("placeholder") as string) || null;
  const help_text = (formData.get("help_text") as string) || null;
  const default_value = (formData.get("default_value") as string) || null;

  // Parse JSON fields
  const optionsRaw = formData.get("options") as string | null;
  const validationRaw = formData.get("validation_rules") as string | null;
  const conditionalRaw = formData.get("conditional_logic") as string | null;

  let options = undefined;
  let validation_rules = undefined;
  let conditional_logic = undefined;

  if (optionsRaw) {
    try {
      options = JSON.parse(optionsRaw);
    } catch {
      return { error: "Invalid options JSON" };
    }
  }

  if (validationRaw) {
    try {
      validation_rules = JSON.parse(validationRaw);
    } catch {
      return { error: "Invalid validation_rules JSON" };
    }
  }

  if (conditionalRaw) {
    try {
      conditional_logic = JSON.parse(conditionalRaw);
    } catch {
      return { error: "Invalid conditional_logic JSON" };
    }
  }

  const updatePayload: Record<string, unknown> = {
    name,
    label,
    is_required,
    placeholder,
    help_text,
    default_value,
  };

  if (type) updatePayload.type = type;
  if (options !== undefined) updatePayload.options = options;
  if (validation_rules !== undefined) updatePayload.validation_rules = validation_rules;
  if (conditional_logic !== undefined) updatePayload.conditional_logic = conditional_logic;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("form_fields").update(updatePayload).eq("id", fieldId);

  if (error) return { error: "Failed to update field" };

  // Get form_id for path revalidation
  const { data: field } = await supabase
    .from("form_fields")
    .select("form_id")
    .eq("id", fieldId)
    .single();

  if (field?.form_id) {
    revalidatePath(`/forms/builder/${field.form_id}`);
  }

  return { success: true };
}

/**
 * Delete a field.
 */
export async function deleteField(fieldId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get form_id before deleting
  const { data: field } = await supabase
    .from("form_fields")
    .select("form_id")
    .eq("id", fieldId)
    .single();

  const { error } = await supabase.from("form_fields").delete().eq("id", fieldId);

  if (error) return { error: "Failed to delete field" };

  if (field?.form_id) {
    revalidatePath(`/forms/builder/${field.form_id}`);
  }

  return { success: true };
}

/**
 * Reorder fields within a section by updating their positions in bulk.
 */
export async function reorderFields(sectionId: string, fieldIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updates = fieldIds.map((id, index) =>
    supabase
      .from("form_fields")
      .update({ position: index })
      .eq("id", id)
      .eq("section_id", sectionId)
  );

  await Promise.all(updates);

  // Get form_id for path revalidation
  const { data: section } = await supabase
    .from("form_sections")
    .select("form_id")
    .eq("id", sectionId)
    .single();

  if (section?.form_id) {
    revalidatePath(`/forms/builder/${section.form_id}`);
  }

  return { success: true };
}

// ─── Form Settings ────────────────────────────────────────────────────────────

/**
 * Update all form-level settings including approval config.
 *
 * Approval config keys (new v2):
 *   approval_enabled       "true" | "false"
 *   approval_mode          "hierarchical" | "any_one"
 *   approval_approver_ids  JSON string — array of profile UUIDs in step order
 */
export async function updateFormSettings(_prevState: unknown, formData: FormData) {
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
    approval_enabled: formData.get("approval_enabled") === "true",
    save_to_list_enabled: formData.get("save_to_list_enabled") === "true",
    target_list_id: (formData.get("target_list_id") as string) || null,
    is_public: formData.get("is_public") === "true",
    schedule_enabled: formData.get("schedule_enabled") === "true",
    schedule_cron: (formData.get("schedule_cron") as string) || undefined,
    schedule_target:
      (formData.get("schedule_target") as "all_employees" | "department" | "specific") ||
      undefined,
    schedule_target_ids: (() => {
      const raw = formData.get("schedule_target_ids") as string | null;
      if (!raw) return [];
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    })(),
  };

  const parsed = formSettingsSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error: updateError } = await supabase
    .from("forms")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      approval_enabled: parsed.data.approval_enabled,
      save_to_list_enabled: parsed.data.save_to_list_enabled,
      target_list_id: parsed.data.target_list_id ?? null,
      is_public: parsed.data.is_public,
      schedule_enabled: parsed.data.schedule_enabled,
      schedule_cron: parsed.data.schedule_cron ?? null,
      schedule_target: parsed.data.schedule_target ?? null,
      schedule_target_ids: parsed.data.schedule_target_ids,
    })
    .eq("id", formId);

  if (updateError) return { error: "Failed to update form settings" };

  if (parsed.data.approval_enabled) {
    // Parse new v2 approval fields
    const approvalMode =
      (formData.get("approval_mode") as "hierarchical" | "any_one" | "any_order") ?? "hierarchical";
    const approversJson = formData.get("approvers") as string | null;
    let approversList: Array<{ type: string; profile_id?: string; email?: string; name?: string }> = [];

    try {
      approversList = JSON.parse(approversJson || "[]");
    } catch { /* empty */ }

    // Upsert approval config
    const { data: existingConfig } = await supabase
      .from("form_approval_configs")
      .select("id")
      .eq("form_id", formId)
      .single();

    let configId: string;

    if (existingConfig) {
      configId = existingConfig.id;
      // Update approval_mode on existing config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("form_approval_configs")
        .update({ approval_mode: approvalMode })
        .eq("id", configId);
      // Delete old approvers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("form_approvers")
        .delete()
        .eq("form_approval_config_id", configId);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newConfig, error: configError } = await (supabase as any)
        .from("form_approval_configs")
        .insert({ form_id: formId, approval_mode: approvalMode })
        .select("id")
        .single();

      if (configError || !newConfig) return { error: "Failed to create approval config" };
      configId = newConfig.id;
    }

    // Insert approvers (both internal and external)
    for (let i = 0; i < approversList.length; i++) {
      const a = approversList[i];
      if (a.type === "user" && a.profile_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("form_approvers").insert({
          form_approval_config_id: configId,
          profile_id: a.profile_id,
          step_order: i + 1,
        });
      } else if (a.type === "external" && a.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("form_approvers").insert({
          form_approval_config_id: configId,
          profile_id: null,
          approver_email: a.email,
          approver_name: a.name ?? null,
          step_order: i + 1,
        });
      }
    }
  } else {
    // Remove approval config if disabled
    await supabase.from("form_approval_configs").delete().eq("form_id", formId);
  }

  revalidatePath(`/forms/builder/${formId}`);
  revalidatePath("/forms");
  return { success: true };
}
