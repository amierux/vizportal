import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  logo_url: z.string().url().optional().nullable(),
  business_manager_id: z.string().uuid().optional().nullable(),
  director_id: z.string().uuid().optional().nullable(),
});

export type CompanyInput = z.infer<typeof companySchema>;

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  manager_id: z.string().uuid().optional().nullable(),
  team_leader_id: z.string().uuid().optional().nullable(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
