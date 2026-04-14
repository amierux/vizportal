import { z } from "zod";

export const leaveTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  default_days: z.number().min(0, "Days must be 0 or greater"),
  is_paid: z.boolean().default(true),
  applicable_gender: z.enum(["all", "male", "female"]).default("all"),
  requires_attachment: z.boolean().default(false),
  is_carry_over: z.boolean().default(false),
  max_carry_over_days: z.number().min(0).default(0),
});

export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;

export const leaveSettingsSchema = z.object({
  reset_month: z.number().int().min(1).max(12),
  reset_day: z.number().int().min(1).max(31),
});

export type LeaveSettingsInput = z.infer<typeof leaveSettingsSchema>;

export const leaveRequestSchema = z.object({
  leave_type_id: z.string().uuid("Please select a leave type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
});

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const balanceAdjustmentSchema = z.object({
  total_days: z.number().min(0, "Days must be 0 or greater"),
  used_days: z.number().min(0, "Used days must be 0 or greater"),
});

export type BalanceAdjustmentInput = z.infer<typeof balanceAdjustmentSchema>;
