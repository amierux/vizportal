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
  phone_number: z.string().nullish(),
  gender: z.enum(["male", "female"]).nullish(),
  date_of_birth: z.string().nullish(),
  address_line: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  zip_code: z.string().nullish(),
  country: z.string().nullish(),
  tin_number: z.string().nullish(),
  sss_number: z.string().nullish(),
  philhealth_number: z.string().nullish(),
  pagibig_number: z.string().nullish(),
  emergency_contact_name: z.string().nullish(),
  emergency_contact_phone: z.string().nullish(),
  emergency_contact_relationship: z.string().nullish(),
  department_id: z.string().uuid().nullish(),
  job_level_id: z.string().uuid().nullish(),
  job_position: z.string().nullish(),
  weekly_required_hours: z.number().min(0).max(168).optional(),
  salary: z.number().min(0).nullish(),
  salary_frequency: z.enum(["monthly", "semi_monthly", "weekly"]).nullish(),
  date_hired: z.string().nullish(),
  date_regularized: z.string().nullish(),
  employment_status: z.enum(["probationary", "regular", "resigned", "terminated"]).optional(),
  break_enabled: z.boolean().optional(),
  break_start_time: z.string().nullish(),
  break_end_time: z.string().nullish(),
});

export type EmployeeDetailInput = z.infer<typeof employeeDetailSchema>;

export const memberSelfEditSchema = z.object({
  phone_number: z.string().nullish(),
  address_line: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  zip_code: z.string().nullish(),
  country: z.string().nullish(),
  emergency_contact_name: z.string().nullish(),
  emergency_contact_phone: z.string().nullish(),
  emergency_contact_relationship: z.string().nullish(),
});

export type MemberSelfEditInput = z.infer<typeof memberSelfEditSchema>;
