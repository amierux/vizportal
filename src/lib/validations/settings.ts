import { z } from "zod";

export const jobLevelSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  rank: z.number().int().min(0, "Rank must be 0 or greater"),
});

export type JobLevelInput = z.infer<typeof jobLevelSchema>;

export const invitationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  department_id: z.string().uuid().optional().nullable(),
  job_level_id: z.string().uuid().optional().nullable(),
  job_position: z.string().optional(),
  role_ids: z.array(z.string().uuid()).min(1, "At least one role is required"),
});

export type InvitationInput = z.infer<typeof invitationSchema>;
