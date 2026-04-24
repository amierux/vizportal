"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import type { RoleName } from "@/types";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  half_day: "outline",
  on_leave: "outline",
  rest_day: "outline",
};

type ClockEntry = {
  id: string;
  type: string;
  timestamp: string;
  selfie_url?: string | null;
  is_manual?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  attachment_url?: string | null;
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: any;
  clockEntries: ClockEntry[];
  roles: RoleName[];
};

export function AttendanceDetailView({ summary, clockEntries }: Props) {
  const router = useRouter();
  const dept = summary.profiles?.employee_details?.departments?.name ?? "—";
  const totalHours = ((summary.total_minutes ?? 0) / 60).toFixed(1);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/attendance/manage")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Attendance
        </Button>
      </div>

      {/* Title row */}
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            Attendance: {summary.profiles?.first_name} {summary.profiles?.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(summary.date)}</p>
        </div>
        <Badge
          variant={STATUS_VARIANTS[summary.status] ?? "outline"}
          className="ml-auto text-sm px-3 py-1"
        >
          {summary.status?.replace(/_/g, " ")}
        </Badge>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Employee</p>
          <p className="mt-1 font-semibold">
            {summary.profiles?.first_name} {summary.profiles?.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{dept}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="mt-1 font-semibold">{formatDate(summary.date)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Hours</p>
          <p className="mt-1 text-3xl font-bold">{totalHours}h</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={STATUS_VARIANTS[summary.status] ?? "outline"} className="text-sm">
              {summary.status?.replace(/_/g, " ")}
            </Badge>
          </div>
          {summary.is_late && (
            <p className="text-xs text-destructive mt-1">
              Late {summary.late_minutes > 0 ? `${summary.late_minutes}m` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Time Details */}
      {(summary.first_clock_in || summary.last_clock_out) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.first_clock_in && (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">First Clock In</p>
              <p className="mt-1 font-semibold font-mono">
                {new Date(summary.first_clock_in).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
          {summary.last_clock_out && (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Last Clock Out</p>
              <p className="mt-1 font-semibold font-mono">
                {new Date(summary.last_clock_out).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Deductions / extras */}
      {(summary.undertime_minutes > 0 || summary.overtime_minutes > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.undertime_minutes > 0 && (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Undertime</p>
              <p className="mt-1 font-semibold">
                {(summary.undertime_minutes / 60).toFixed(2)}h ({summary.undertime_minutes}m)
              </p>
            </div>
          )}
          {summary.overtime_minutes > 0 && (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Overtime</p>
              <p className="mt-1 font-semibold">
                {(summary.overtime_minutes / 60).toFixed(2)}h ({summary.overtime_minutes}m)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Missing entry flag */}
      {summary.has_missing_entry && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive font-medium">Missing entry detected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clock-in or clock-out is missing for this day.
          </p>
        </div>
      )}

      {/* Clock Entries Timeline */}
      {clockEntries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Clock Entries ({clockEntries.length})
          </h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium">Time</th>
                  <th className="px-4 py-2.5 text-left font-medium">Flags</th>
                  <th className="px-4 py-2.5 text-left font-medium">Attachments</th>
                </tr>
              </thead>
              <tbody>
                {clockEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Badge variant={entry.type === "clock_in" ? "default" : "secondary"}>
                        {entry.type === "clock_in" ? "Clock In" : "Clock Out"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.is_manual && (
                        <Badge variant="outline" className="text-xs">Manual</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {entry.latitude != null && entry.longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            GPS
                          </a>
                        )}
                        {entry.selfie_url && (
                          <a
                            href={entry.selfie_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Selfie
                          </a>
                        )}
                        {entry.attachment_url && (
                          <a
                            href={entry.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            File
                          </a>
                        )}
                        {!entry.latitude && !entry.selfie_url && !entry.attachment_url && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {clockEntries.length === 0 && (
        <div className="rounded-lg border p-6 text-center text-muted-foreground text-sm">
          No clock entries recorded for this day.
        </div>
      )}
    </div>
  );
}
