"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeSGT, calculateTotalHours } from "@/lib/utils/attendance";
import { Clock, ArrowRight } from "lucide-react";
import type { ClockEntry } from "@/types";

type TodaySessionsProps = {
  entries: ClockEntry[];
  requiredHours: number | null;
};

export function TodaySessions({ entries, requiredHours }: TodaySessionsProps) {
  const totalHours = calculateTotalHours(entries);

  // Pair entries into sessions
  const sessions: { clockIn: ClockEntry; clockOut: ClockEntry | null }[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].type === "clock_in") {
      const clockOut = entries[i + 1]?.type === "clock_out" ? entries[i + 1] : null;
      sessions.push({ clockIn: entries[i], clockOut });
      if (clockOut) i++;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Sessions</CardTitle>
          <div className="text-sm text-muted-foreground">
            {totalHours.toFixed(1)}h{requiredHours ? ` / ${requiredHours}h` : ""}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions today</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, idx) => {
              const duration = session.clockOut
                ? (
                    (new Date(session.clockOut.timestamp).getTime() -
                      new Date(session.clockIn.timestamp).getTime()) /
                    (1000 * 60 * 60)
                  ).toFixed(1)
                : "Active";

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatTimeSGT(session.clockIn.timestamp)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {session.clockOut ? formatTimeSGT(session.clockOut.timestamp) : "—"}
                    </span>
                  </div>
                  <Badge variant={session.clockOut ? "secondary" : "default"}>
                    {duration}{session.clockOut ? "h" : ""}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
