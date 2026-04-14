import { describe, it, expect } from "vitest";
import {
  calculateTotalHours,
  countWorkDays,
  checkLateness,
} from "@/lib/utils/attendance";
import type { ClockEntry } from "@/types";

const makeEntry = (type: "clock_in" | "clock_out", timestamp: string): ClockEntry => ({
  id: "test",
  company_id: "test",
  profile_id: "test",
  type,
  timestamp,
  selfie_url: null,
  latitude: null,
  longitude: null,
  is_manual: false,
  manual_remarks: null,
  date: "2026-04-13",
  created_at: timestamp,
});

describe("calculateTotalHours", () => {
  it("calculates single session correctly", () => {
    const entries = [
      makeEntry("clock_in", "2026-04-13T08:00:00+08:00"),
      makeEntry("clock_out", "2026-04-13T17:00:00+08:00"),
    ];
    expect(calculateTotalHours(entries)).toBe(9);
  });

  it("calculates multiple sessions correctly", () => {
    const entries = [
      makeEntry("clock_in", "2026-04-13T08:00:00+08:00"),
      makeEntry("clock_out", "2026-04-13T12:00:00+08:00"),
      makeEntry("clock_in", "2026-04-13T13:00:00+08:00"),
      makeEntry("clock_out", "2026-04-13T17:00:00+08:00"),
    ];
    expect(calculateTotalHours(entries)).toBe(8);
  });

  it("handles unpaired clock-in (missing clock-out)", () => {
    const entries = [
      makeEntry("clock_in", "2026-04-13T08:00:00+08:00"),
    ];
    expect(calculateTotalHours(entries)).toBe(0);
  });
});

describe("countWorkDays", () => {
  it("counts Mon-Fri correctly for one week", () => {
    const result = countWorkDays("2026-04-13", "2026-04-17", ["mon", "tue", "wed", "thu", "fri"]);
    expect(result).toBe(5);
  });

  it("excludes weekends", () => {
    const result = countWorkDays("2026-04-13", "2026-04-19", ["mon", "tue", "wed", "thu", "fri"]);
    expect(result).toBe(5);
  });

  it("counts only specified days", () => {
    const result = countWorkDays("2026-04-13", "2026-04-19", ["mon", "wed", "fri"]);
    expect(result).toBe(3);
  });

  it("single day returns 1 if work day", () => {
    const result = countWorkDays("2026-04-14", "2026-04-14", ["mon", "tue"]);
    expect(result).toBe(1);
  });
});

describe("checkLateness", () => {
  it("detects lateness correctly", () => {
    const result = checkLateness(
      "2026-04-13T08:15:00+08:00",
      "08:00",
      "2026-04-13",
      "Asia/Singapore"
    );
    expect(result.isLate).toBe(true);
    expect(result.lateMinutes).toBe(15);
  });

  it("allows on-time with grace period", () => {
    const result = checkLateness(
      "2026-04-13T08:01:00+08:00",
      "08:00",
      "2026-04-13",
      "Asia/Singapore"
    );
    expect(result.isLate).toBe(false);
  });
});
