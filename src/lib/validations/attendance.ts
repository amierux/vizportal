import { z } from "zod";

export const scheduleSchema = z.object({
  work_type: z.enum(["full_time", "part_time"]),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  work_days: z.array(z.string()).min(1, "At least one work day is required"),
  timezone: z.string().default("Asia/Singapore"),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const manualClockSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(["clock_in", "clock_out"]),
  time: z.string().min(1, "Time is required"),
  reason: z.string().min(1, "Reason is required"),
});

export type ManualClockInput = z.infer<typeof manualClockSchema>;
