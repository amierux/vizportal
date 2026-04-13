import { describe, it, expect } from "vitest";
import {
  completeProfileSchema,
  employeeDetailSchema,
  memberSelfEditSchema,
} from "@/lib/validations/employee";

describe("completeProfileSchema", () => {
  it("accepts valid profile completion data", () => {
    const result = completeProfileSchema.safeParse({
      first_name: "Amier",
      last_name: "Ordonez",
      phone_number: "+639171234567",
      gender: "male",
      date_of_birth: "1995-01-15",
      address_line: "123 Main St",
      city: "Makati",
      province: "Metro Manila",
      zip_code: "1200",
      emergency_contact_name: "Jane Doe",
      emergency_contact_phone: "+639181234567",
      emergency_contact_relationship: "Spouse",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = completeProfileSchema.safeParse({
      first_name: "Amier",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid gender value", () => {
    const result = completeProfileSchema.safeParse({
      first_name: "Amier",
      last_name: "Ordonez",
      phone_number: "+639171234567",
      gender: "other",
      date_of_birth: "1995-01-15",
      address_line: "123 Main St",
      city: "Makati",
      province: "Metro Manila",
      zip_code: "1200",
      emergency_contact_name: "Jane Doe",
      emergency_contact_phone: "+639181234567",
      emergency_contact_relationship: "Spouse",
    });
    expect(result.success).toBe(false);
  });
});

describe("employeeDetailSchema", () => {
  it("accepts valid full employee data", () => {
    const result = employeeDetailSchema.safeParse({
      first_name: "Amier",
      last_name: "Ordonez",
      phone_number: "+639171234567",
      gender: "male",
      date_of_birth: "1995-01-15",
      address_line: "123 Main St",
      city: "Makati",
      province: "Metro Manila",
      zip_code: "1200",
      country: "Philippines",
      tin_number: "123-456-789",
      sss_number: "12-3456789-0",
      philhealth_number: "12-123456789-1",
      pagibig_number: "1234-5678-9012",
      emergency_contact_name: "Jane Doe",
      emergency_contact_phone: "+639181234567",
      emergency_contact_relationship: "Spouse",
      department_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      job_level_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      job_position: "Software Developer",
      weekly_required_hours: 40,
      salary: 50000,
      salary_frequency: "monthly",
      date_hired: "2024-01-15",
      employment_status: "regular",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial data with optional fields omitted", () => {
    const result = employeeDetailSchema.safeParse({
      first_name: "Amier",
      last_name: "Ordonez",
      gender: "male",
    });
    expect(result.success).toBe(true);
  });
});

describe("memberSelfEditSchema", () => {
  it("accepts valid self-edit fields", () => {
    const result = memberSelfEditSchema.safeParse({
      phone_number: "+639171234567",
      address_line: "456 New St",
      city: "Quezon City",
      province: "Metro Manila",
      zip_code: "1100",
      country: "Philippines",
      emergency_contact_name: "Jane Doe",
      emergency_contact_phone: "+639181234567",
      emergency_contact_relationship: "Spouse",
    });
    expect(result.success).toBe(true);
  });
});
