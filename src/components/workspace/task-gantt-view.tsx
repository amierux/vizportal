"use client";

import { useRef } from "react";

type Task = {
  id: string;
  name: string;
  status_id: string;
  start_date: string | null;
  target_end_date: string | null;
};

type Status = {
  id: string;
  name: string;
  color: string;
};

type TaskGanttViewProps = {
  tasks: Task[];
  statuses: Status[];
};

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function floorToMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function ceilToMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function TaskGanttView({ tasks, statuses }: TaskGanttViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  // Compute overall date range
  const allDates: Date[] = [today];
  for (const task of tasks) {
    const s = parseDate(task.start_date);
    const e = parseDate(task.target_end_date);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
  }

  const minDate = floorToMonth(new Date(Math.min(...allDates.map((d) => d.getTime()))));
  const maxDateRaw = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const maxDate = ceilToMonth(addDays(maxDateRaw, 7));

  const totalDays = daysBetween(minDate, maxDate);

  // Build month headers
  const months: { label: string; days: number }[] = [];
  let cursor = new Date(minDate);
  while (cursor < maxDate) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const clampedStart = cursor < minDate ? minDate : cursor;
    const clampedEnd = monthEnd > maxDate ? maxDate : monthEnd;
    const days = daysBetween(clampedStart, clampedEnd);
    months.push({ label: formatMonthLabel(monthStart), days });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  // Today offset
  const todayOffset = daysBetween(minDate, today);
  const todayPct = totalDays > 0 ? (todayOffset / totalDays) * 100 : 0;

  const ROW_H = 36;
  const LABEL_W = 200;
  const TIMELINE_MIN_W = 600;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="flex">
        {/* Left: task name column */}
        <div
          className="shrink-0 border-r bg-muted/30"
          style={{ width: LABEL_W }}
        >
          {/* Month header spacer */}
          <div className="h-8 border-b flex items-center px-3 text-xs font-medium text-muted-foreground">
            Task
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center px-3 border-b text-sm truncate"
              style={{ height: ROW_H }}
              title={task.name}
            >
              {task.name}
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="flex items-center px-3 py-4 text-sm text-muted-foreground italic">
              No tasks
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ minWidth: TIMELINE_MIN_W }}>
            {/* Month headers row */}
            <div className="flex h-8 border-b">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="border-r last:border-r-0 flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0"
                  style={{ width: `${(m.days / totalDays) * 100}%`, minWidth: 40 }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Task rows */}
            <div className="relative">
              {/* Today line */}
              {todayPct >= 0 && todayPct <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                  style={{ left: `${todayPct}%` }}
                />
              )}

              {tasks.map((task) => {
                const start = parseDate(task.start_date);
                const end = parseDate(task.target_end_date);
                const status = statusMap.get(task.status_id);
                const color = status?.color ?? "#94a3b8";

                let leftPct: number;
                let widthPct: number;

                if (start && end && totalDays > 0) {
                  const startOff = Math.max(0, daysBetween(minDate, start));
                  const endOff = Math.min(totalDays, daysBetween(minDate, end) + 1);
                  leftPct = (startOff / totalDays) * 100;
                  widthPct = Math.max(0.5, ((endOff - startOff) / totalDays) * 100);
                } else if ((start || end) && totalDays > 0) {
                  // Only one date — show a dot
                  const date = start ?? end!;
                  const off = daysBetween(minDate, date);
                  leftPct = (off / totalDays) * 100;
                  widthPct = 0.5;
                } else {
                  // No dates — show at today as a dot
                  leftPct = todayPct;
                  widthPct = 0.5;
                }

                return (
                  <div
                    key={task.id}
                    className="relative border-b flex items-center"
                    style={{ height: ROW_H }}
                  >
                    {/* Background day lines */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg, transparent, transparent calc(100% / var(--cols) - 1px), hsl(var(--border)) calc(100% / var(--cols) - 1px), hsl(var(--border)) calc(100% / var(--cols)))",
                      }}
                    />

                    {/* Bar */}
                    <div
                      className="absolute top-2 bottom-2 rounded-md flex items-center px-2 text-xs font-medium text-white overflow-hidden"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color,
                        minWidth: widthPct < 1 ? 8 : undefined,
                      }}
                      title={`${task.name}${start ? ` | ${task.start_date}` : ""}${end ? ` → ${task.target_end_date}` : ""}`}
                    >
                      {widthPct > 3 && <span className="truncate">{task.name}</span>}
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground italic">
                  No tasks to display
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      {statuses.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 py-2 border-t bg-muted/20 text-xs">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
