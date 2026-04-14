import { z } from "zod";

export const timesheetSettingsSchema = z.object({
  reminder_email_addresses: z.array(z.string().email()).default([]),
  submission_deadline_day: z.string().default("monday"),
  is_approval_enabled: z.boolean().default(true),
});
export type TimesheetSettingsInput = z.infer<typeof timesheetSettingsSchema>;

export const timeEntrySchema = z.object({
  task_id: z.string().uuid(),
  date: z.string().min(1),
  duration: z.number().min(1),
  unit: z.enum(["minutes", "hours", "days"]),
  description: z.string().optional(),
  is_billable: z.boolean().default(false),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
