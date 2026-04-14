import { z } from "zod";

export const overtimeRequestSchema = z.object({
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  reason: z.string().min(1, "Reason is required"),
});

export type OvertimeRequestInput = z.infer<typeof overtimeRequestSchema>;
