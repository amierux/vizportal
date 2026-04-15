import { SGT_TIMEZONE, LATE_GRACE_MINUTES, CROSS_MIDNIGHT_THRESHOLD_HOURS } from "@/lib/constants";
import type { ClockEntry } from "@/types";

/**
 * Determine the work date for a clock entry.
 * If the entry is within CROSS_MIDNIGHT_THRESHOLD_HOURS after midnight,
 * it belongs to the previous calendar day.
 */
export function getWorkDate(timestamp: string): string {
  const date = new Date(timestamp);
  const sgtDate = new Date(date.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
  const hours = sgtDate.getHours();

  if (hours < CROSS_MIDNIGHT_THRESHOLD_HOURS) {
    sgtDate.setDate(sgtDate.getDate() - 1);
  }

  return sgtDate.toISOString().split("T")[0];
}

/**
 * Calculate total worked hours from paired clock entries for a given date.
 * Returns hours as a decimal (e.g., 8.5 for 8 hours 30 minutes).
 *
 * If a `break` config is provided (enabled + start/end time in "HH:MM" format),
 * the break duration is deducted from the total — but only if the raw worked
 * span covers the whole break window (i.e. the employee was clocked in across
 * the break, implying they didn't manually clock out for lunch).
 */
export function calculateTotalHours(
  entries: ClockEntry[],
  breakConfig?: { enabled: boolean; startTime?: string | null; endTime?: string | null } | null
): number {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalMs = 0;
  let clockInTime: Date | null = null;

  for (const entry of sorted) {
    if (entry.type === "clock_in") {
      clockInTime = new Date(entry.timestamp);
    } else if (entry.type === "clock_out" && clockInTime) {
      totalMs += new Date(entry.timestamp).getTime() - clockInTime.getTime();
      clockInTime = null;
    }
  }

  // Deduct lunch/break window if enabled and fully covered by a work session.
  if (
    breakConfig?.enabled &&
    breakConfig.startTime &&
    breakConfig.endTime &&
    sorted.length >= 2
  ) {
    const [bsH, bsM] = breakConfig.startTime.split(":").map(Number);
    const [beH, beM] = breakConfig.endTime.split(":").map(Number);
    const breakMinutes = (beH + beM / 60 - (bsH + bsM / 60)) * 60;

    if (breakMinutes > 0) {
      // Check whether any work session fully covers the break window.
      let covered = false;
      let openIn: Date | null = null;
      for (const entry of sorted) {
        if (entry.type === "clock_in") {
          openIn = new Date(entry.timestamp);
        } else if (entry.type === "clock_out" && openIn) {
          const inDate = openIn;
          const outDate = new Date(entry.timestamp);
          const refSgt = new Date(inDate.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
          const breakStart = new Date(refSgt);
          breakStart.setHours(bsH, bsM, 0, 0);
          const breakEnd = new Date(refSgt);
          breakEnd.setHours(beH, beM, 0, 0);
          const inSgt = new Date(inDate.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
          const outSgt = new Date(outDate.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
          if (inSgt.getTime() <= breakStart.getTime() && outSgt.getTime() >= breakEnd.getTime()) {
            covered = true;
            break;
          }
          openIn = null;
        }
      }

      if (covered) {
        totalMs -= breakMinutes * 60 * 1000;
        if (totalMs < 0) totalMs = 0;
      }
    }
  }

  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Check if the first clock-in is late based on schedule start time.
 * Returns { isLate, lateMinutes }.
 */
export function checkLateness(
  firstClockIn: string,
  scheduleStartTime: string,
  workDate: string,
  timezone: string = SGT_TIMEZONE
): { isLate: boolean; lateMinutes: number } {
  const clockInDate = new Date(firstClockIn);
  const clockInSgt = new Date(clockInDate.toLocaleString("en-US", { timeZone: timezone }));

  const [startHour, startMin] = scheduleStartTime.split(":").map(Number);
  const scheduledStart = new Date(clockInSgt);
  scheduledStart.setHours(startHour, startMin, 0, 0);

  const diffMs = clockInSgt.getTime() - scheduledStart.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > LATE_GRACE_MINUTES) {
    return { isLate: true, lateMinutes: diffMinutes };
  }

  return { isLate: false, lateMinutes: 0 };
}

/**
 * Check if the last clock-out is before schedule end time.
 * Returns { isEarlyOut, earlyOutMinutes }.
 */
export function checkEarlyOut(
  lastClockOut: string,
  scheduleEndTime: string,
  timezone: string = SGT_TIMEZONE
): { isEarlyOut: boolean; earlyOutMinutes: number } {
  const clockOutDate = new Date(lastClockOut);
  const clockOutSgt = new Date(clockOutDate.toLocaleString("en-US", { timeZone: timezone }));

  const [endHour, endMin] = scheduleEndTime.split(":").map(Number);
  const scheduledEnd = new Date(clockOutSgt);
  scheduledEnd.setHours(endHour, endMin, 0, 0);

  const diffMs = scheduledEnd.getTime() - clockOutSgt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes > 0) {
    return { isEarlyOut: true, earlyOutMinutes: diffMinutes };
  }

  return { isEarlyOut: false, earlyOutMinutes: 0 };
}

/**
 * Calculate the number of work days between two dates based on employee's work_days schedule.
 * Used for leave day calculation.
 */
export function countWorkDays(
  startDate: string,
  endDate: string,
  workDays: string[]
): number {
  const dayMap: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
  };

  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  const current = new Date(start);
  while (current <= end) {
    const dayName = dayMap[current.getDay()];
    if (workDays.includes(dayName)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Format time for SGT display.
 */
export function formatTimeSGT(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-SG", {
    timeZone: SGT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Get current SGT date string (YYYY-MM-DD).
 */
export function getCurrentDateSGT(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SGT_TIMEZONE });
}

/**
 * Get current SGT day name (lowercase: 'mon', 'tue', etc.)
 */
export function getCurrentDaySGT(): string {
  const dayMap: Record<number, string> = {
    0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
  };
  const now = new Date();
  const sgtDay = new Date(now.toLocaleString("en-US", { timeZone: SGT_TIMEZONE }));
  return dayMap[sgtDay.getDay()];
}
