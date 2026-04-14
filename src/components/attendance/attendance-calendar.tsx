"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyAttendanceSummary } from "@/types";

type AttendanceCalendarProps = {
  summaries: DailyAttendanceSummary[];
  workDays?: string[];
};

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500",
  late: "bg-yellow-500",
  absent: "bg-red-500",
  half_day: "bg-orange-400",
  on_leave: "bg-blue-500",
};

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

export function AttendanceCalendar({ summaries, workDays }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const summaryMap = new Map(summaries.map((s) => [s.date, s]));

  const firstDay = new Date(currentMonth.year, currentMonth.month, 1);
  const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  function prevMonth() {
    setCurrentMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base">{monthLabel}</CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-1 font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            if (!day) return <div key={idx} />;

            const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const summary = summaryMap.get(dateStr);
            const dayOfWeek = new Date(currentMonth.year, currentMonth.month, day).getDay();
            const isWorkDay = workDays ? workDays.includes(DAY_MAP[dayOfWeek]) : dayOfWeek > 0 && dayOfWeek < 6;

            let dotColor = "";
            if (summary) {
              dotColor = STATUS_COLORS[summary.status] ?? "";
            } else if (!isWorkDay) {
              dotColor = "bg-gray-300";
            }

            return (
              <div
                key={idx}
                className={`relative flex h-8 items-center justify-center rounded text-sm ${
                  !isWorkDay ? "text-muted-foreground" : ""
                }`}
              >
                {day}
                {dotColor && (
                  <span className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${color}`} />
              <span className="capitalize">{status.replace("_", " ")}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span>Non-work</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
