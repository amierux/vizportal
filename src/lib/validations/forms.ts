import { z } from "zod";

export const formSchema = z.object({
  name: z.string().min(1, "Form name is required"),
  description: z.string().optional(),
});
export type FormInput = z.infer<typeof formSchema>;

export const sectionSchema = z.object({
  name: z.string().min(1, "Section name is required"),
  description: z.string().optional(),
});
export type SectionInput = z.infer<typeof sectionSchema>;

export const fieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  label: z.string().min(1, "Label is required"),
  type: z.enum([
    "text",
    "number",
    "date",
    "textarea",
    "select",
    "multi_select",
    "checkbox",
    "radio",
    "file",
    "signature",
    "email",
    "phone",
    "calculated",
  ]),
  is_required: z.boolean().default(false),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
});
export type FieldInput = z.infer<typeof fieldSchema>;

export const formSettingsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  approval_enabled: z.boolean().default(false),
  save_to_list_enabled: z.boolean().default(false),
  target_list_id: z.string().uuid().optional().nullable(),
  is_public: z.boolean().default(false),
  schedule_enabled: z.boolean().default(false),
  schedule_cron: z.string().optional(),
  schedule_target: z.enum(["all_employees", "department", "specific"]).optional(),
  schedule_target_ids: z.array(z.string().uuid()).default([]),
});
export type FormSettingsInput = z.infer<typeof formSettingsSchema>;
