"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Task = {
  id: string;
  name: string;
  status_id: string;
  priority: string;
  target_end_date: string | null;
};

type TaskCalendarViewProps = {
  tasks: Task[];
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-slate-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export function TaskCalendarView({ tasks }: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build a map of date → tasks
  const tasksByDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.target_end_date) continue;
    const existing = tasksByDate.get(task.target_end_date) ?? [];
    existing.push(task);
    tasksByDate.set(task.target_end_date, existing);
  }

  const firstDay = new Date(currentMonth.year, currentMonth.month, 1);
  const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function prevMonth() {
    setSelectedDate(null);
    setCurrentMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function nextMonth() {
    setSelectedDate(null);
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

  const selectedTasks = selectedDate ? (tasksByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-4">
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
              const dayTasks = tasksByDate.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`relative flex flex-col items-center rounded-md p-1 min-h-[48px] transition-colors text-sm ${
                    isToday
                      ? "bg-primary text-primary-foreground font-bold"
                      : isSelected
                      ? "bg-muted ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>{day}</span>
                  {dayTasks.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                      {dayTasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[task.priority] ?? "bg-slate-400"}`}
                          title={task.name}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[9px] text-muted-foreground leading-none">
                          +{dayTasks.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Priority legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {Object.entries(PRIORITY_LABELS).map(([priority, label]) => (
              <div key={priority} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[priority]}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected date popup */}
      {selectedDate && selectedTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Tasks due{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedDate(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] ?? "bg-slate-400"}`}
                />
                <span className="flex-1 truncate">{task.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize shrink-0">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedDate && selectedTasks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">No tasks due on this date.</p>
      )}
    </div>
  );
}
