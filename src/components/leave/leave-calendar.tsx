"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type LeaveEvent = {
  id: string;
  start_date: string;
  end_date: string;
  leave_types: { name: string; code: string } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
};

type LeaveCalendarProps = {
  leaves: LeaveEvent[];
};

const TYPE_COLORS: Record<string, string> = {
  VL: "bg-blue-200 text-blue-800",
  SL: "bg-yellow-200 text-yellow-800",
  ML: "bg-pink-200 text-pink-800",
  PL: "bg-green-200 text-green-800",
  SPL: "bg-purple-200 text-purple-800",
  VAWC: "bg-red-200 text-red-800",
  SLW: "bg-orange-200 text-orange-800",
};

export function LeaveCalendar({ leaves }: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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

  // Build day cells
  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  // Get leaves for a specific date
  function getLeavesForDate(day: number) {
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return leaves.filter((l) => l.start_date <= dateStr && l.end_date >= dateStr);
  }

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

            const dayLeaves = getLeavesForDate(day);
            return (
              <div
                key={idx}
                className="min-h-[40px] rounded border p-1 text-left"
              >
                <div className="text-xs font-medium">{day}</div>
                {dayLeaves.slice(0, 2).map((l, i) => {
                  const colorClass = TYPE_COLORS[l.leave_types?.code ?? ""] ?? "bg-gray-200 text-gray-800";
                  const name = l.profiles
                    ? formatFullName(l.profiles.first_name, l.profiles.last_name)
                    : "—";
                  return (
                    <div
                      key={i}
                      className={`mt-0.5 truncate rounded px-1 text-[10px] ${colorClass}`}
                      title={`${name} - ${l.leave_types?.name}`}
                    >
                      {name.split(" ")[0]}
                    </div>
                  );
                })}
                {dayLeaves.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{dayLeaves.length - 2} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
