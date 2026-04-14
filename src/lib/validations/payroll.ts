import { z } from "zod";

export const payrollSettingsSchema = z.object({
  schedule_type: z.enum(["monthly", "semi_monthly", "weekly"]),
  pay_day_1: z.number().int().min(1).max(31),
  pay_day_2: z.number().int().min(1).max(31).optional().nullable(),
  cutoff_days_before: z.number().int().min(0).max(15),
  is_enabled: z.boolean(),
  enable_late_deduction: z.boolean(),
  enable_undertime_deduction: z.boolean(),
  enable_absent_deduction: z.boolean(),
  ot_regular_multiplier: z.number().min(1).max(5),
  ot_rest_day_multiplier: z.number().min(1).max(5),
  ot_holiday_multiplier: z.number().min(1).max(5),
});

export type PayrollSettingsInput = z.infer<typeof payrollSettingsSchema>;

export const payrollPeriodSchema = z.object({
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  pay_date: z.string().min(1, "Pay date is required"),
});

export type PayrollPeriodInput = z.infer<typeof payrollPeriodSchema>;

export const customDeductionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["deduction", "adjustment"]),
  amount: z.number().min(0, "Amount must be positive"),
  notes: z.string().optional(),
});

export type CustomDeductionInput = z.infer<typeof customDeductionSchema>;
