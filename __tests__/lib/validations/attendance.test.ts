import { describe, it, expect } from "vitest";
import { scheduleSchema, manualClockSchema } from "@/lib/validations/attendance";

describe("scheduleSchema", () => {
  it("accepts valid full-time schedule", () => {
    const result = scheduleSchema.safeParse({
      work_type: "full_time",
      start_time: "08:00",
      end_time: "17:00",
      work_days: ["mon", "tue", "wed", "thu", "fri"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid part-time schedule", () => {
    const result = scheduleSchema.safeParse({
      work_type: "part_time",
      start_time: "09:00",
      end_time: "13:00",
      work_days: ["mon", "wed", "fri"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty work_days", () => {
    const result = scheduleSchema.safeParse({
      work_type: "full_time",
      start_time: "08:00",
      end_time: "17:00",
      work_days: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid work_type", () => {
    const result = scheduleSchema.safeParse({
      work_type: "contractor",
      start_time: "08:00",
      end_time: "17:00",
      work_days: ["mon"],
    });
    expect(result.success).toBe(false);
  });
});

describe("manualClockSchema", () => {
  it("accepts valid manual clock entry", () => {
    const result = manualClockSchema.safeParse({
      date: "2026-04-13",
      type: "clock_in",
      time: "08:00",
      reason: "Forgot to clock in",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reason", () => {
    const result = manualClockSchema.safeParse({
      date: "2026-04-13",
      type: "clock_in",
      time: "08:00",
      reason: "",
    });
    expect(result.success).toBe(false);
  });
});
