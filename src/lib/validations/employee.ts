import { z } from "zod";

export const completeProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  gender: z.enum(["male", "female"], {
    error: "Please select a gender",
  }),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  address_line: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  zip_code: z.string().min(1, "ZIP code is required"),
  emergency_contact_name: z.string().min(1, "Emergency contact name is required"),
  emergency_contact_phone: z.string().min(1, "Emergency contact phone is required"),
  emergency_contact_relationship: z.string().min(1, "Relationship is required"),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

export const employeeDetailSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  date_of_birth: z.string().optional(),
  address_line: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  tin_number: z.string().optional(),
  sss_number: z.string().optional(),
  philhealth_number: z.string().optional(),
  pagibig_number: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  department_id: z.string().uuid().optional(),
  job_level_id: z.string().uuid().optional(),
  job_position: z.string().optional(),
  weekly_required_hours: z.number().min(0).max(168).optional(),
  salary: z.number().min(0).optional(),
  salary_frequency: z.enum(["monthly", "semi_monthly", "weekly"]).optional(),
  date_hired: z.string().optional(),
  date_regularized: z.string().optional(),
  employment_status: z.enum(["probationary", "regular", "resigned", "terminated"]).optional(),
  break_enabled: z.boolean().optional(),
  break_start_time: z.string().optional(),
  break_end_time: z.string().optional(),
});

export type EmployeeDetailInput = z.infer<typeof employeeDetailSchema>;

export const memberSelfEditSchema = z.object({
  phone_number: z.string().optional(),
  address_line: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
});

export type MemberSelfEditInput = z.infer<typeof memberSelfEditSchema>;
