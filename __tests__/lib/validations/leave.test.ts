import { describe, it, expect } from "vitest";
import {
  leaveTypeSchema,
  leaveRequestSchema,
  leaveSettingsSchema,
  balanceAdjustmentSchema,
} from "@/lib/validations/leave";

describe("leaveTypeSchema", () => {
  it("accepts valid leave type", () => {
    const result = leaveTypeSchema.safeParse({
      name: "Vacation Leave",
      code: "VL",
      default_days: 5,
      is_paid: true,
      applicable_gender: "all",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = leaveTypeSchema.safeParse({
      name: "Test",
      code: "",
      default_days: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative days", () => {
    const result = leaveTypeSchema.safeParse({
      name: "Test",
      code: "T",
      default_days: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("leaveRequestSchema", () => {
  it("accepts valid leave request", () => {
    const result = leaveRequestSchema.safeParse({
      leave_type_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      start_date: "2026-04-14",
      end_date: "2026-04-16",
      reason: "Family vacation",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing start_date", () => {
    const result = leaveRequestSchema.safeParse({
      leave_type_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      start_date: "",
      end_date: "2026-04-16",
    });
    expect(result.success).toBe(false);
  });
});

describe("leaveSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = leaveSettingsSchema.safeParse({ reset_month: 1, reset_day: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects month > 12", () => {
    const result = leaveSettingsSchema.safeParse({ reset_month: 13, reset_day: 1 });
    expect(result.success).toBe(false);
  });
});

describe("balanceAdjustmentSchema", () => {
  it("accepts valid adjustment", () => {
    const result = balanceAdjustmentSchema.safeParse({ total_days: 10, used_days: 3 });
    expect(result.success).toBe(true);
  });

  it("rejects negative used_days", () => {
    const result = balanceAdjustmentSchema.safeParse({ total_days: 10, used_days: -1 });
    expect(result.success).toBe(false);
  });
});
