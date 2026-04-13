import { describe, it, expect } from "vitest";
import { loginSchema, setPasswordSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@vizserve.com",
      password: "SecurePass123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "SecurePass123!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@vizserve.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("setPasswordSchema", () => {
  it("accepts matching passwords that meet requirements", () => {
    const result = setPasswordSchema.safeParse({
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = setPasswordSchema.safeParse({
      password: "Short1!",
      confirmPassword: "Short1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = setPasswordSchema.safeParse({
      password: "SecurePass123!",
      confirmPassword: "DifferentPass123!",
    });
    expect(result.success).toBe(false);
  });
});
