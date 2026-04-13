import { describe, it, expect } from "vitest";
import { jobLevelSchema, invitationSchema } from "@/lib/validations/settings";

describe("jobLevelSchema", () => {
  it("accepts valid job level", () => {
    const result = jobLevelSchema.safeParse({
      code: "A1",
      name: "Entry Level",
      rank: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = jobLevelSchema.safeParse({ name: "Entry Level", rank: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects negative rank", () => {
    const result = jobLevelSchema.safeParse({
      code: "A1",
      name: "Entry Level",
      rank: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("invitationSchema", () => {
  it("accepts valid invitation", () => {
    const result = invitationSchema.safeParse({
      email: "new@vizserve.com",
      department_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      job_level_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      job_position: "Developer",
      role_ids: ["c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty role_ids", () => {
    const result = invitationSchema.safeParse({
      email: "new@vizserve.com",
      role_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = invitationSchema.safeParse({
      email: "not-email",
      role_ids: ["c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"],
    });
    expect(result.success).toBe(false);
  });
});
