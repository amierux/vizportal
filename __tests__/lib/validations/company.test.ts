import { describe, it, expect } from "vitest";
import { companySchema, departmentSchema } from "@/lib/validations/company";

describe("companySchema", () => {
  it("accepts valid company data", () => {
    const result = companySchema.safeParse({ name: "VizServe Inc." });
    expect(result.success).toBe(true);
  });

  it("rejects empty company name", () => {
    const result = companySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("departmentSchema", () => {
  it("accepts valid department data", () => {
    const result = departmentSchema.safeParse({
      name: "VizBytes",
      manager_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      team_leader_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    });
    expect(result.success).toBe(true);
  });

  it("accepts department without manager/TL", () => {
    const result = departmentSchema.safeParse({ name: "VizMedia" });
    expect(result.success).toBe(true);
  });
});
