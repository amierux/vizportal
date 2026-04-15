"use client";

import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Plus } from "lucide-react";
import { RecordsFilterBar } from "@/components/shared/records-filter-bar";
import { RequestDetailDialog } from "@/components/shared/request-detail-dialog";
import { ManualClockDialog } from "@/components/attendance/manual-clock-dialog";
import { getAttendanceRecords, type RecordScope } from "@/lib/actions/records";
import { getClockEntriesByDate } from "@/lib/actions/attendance";
import { formatDate } from "@/lib/utils/format";
import type { RoleName } from "@/types";

type Department = { id: string; name: string };

type AttendanceRecordsProps = {
  userRoles: RoleName[];
  departments: Department[];
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  half_day: "outline",
  on_leave: "secondary",
};

export function AttendanceRecords({ userRoles, departments }: AttendanceRecordsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeScope, setActiveScope] = useState<RecordScope>("personal");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewing, setViewing] = useState<any | null>(null);
  const [manualEntry, setManualEntry] = useState<{ date: string; type: "clock_in" | "clock_out" } | null>(null);

  const isTeamLeader = userRoles.includes("team_leader");
  const isDeptManager = userRoles.includes("dept_manager");
  const isAdminLevel = userRoles.some((r) =>
    ["admin", "hr", "business_manager", "director"].includes(r)
  );

  const fetchRecords = useCallback(async (
    scope: RecordScope,
    filters: { startDate: string; endDate: string; search: string; departmentId: string }
  ) => {
    setLoading(true);
    const data = await getAttendanceRecords({
      scope,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      search: filters.search || undefined,
      departmentId: filters.departmentId && filters.departmentId !== "all" ? filters.departmentId : undefined,
    });
    setRecords(data);
    setLoading(false);
  }, []);

  function handleFilter(filters: { startDate: string; endDate: string; search: string; departmentId: string }) {
    fetchRecords(activeScope, filters);
  }

  function handleTabChange(scope: string) {
    setActiveScope(scope as RecordScope);
  }

  // Auto-load current-month data on mount and on tab change
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = now.toISOString().split("T")[0];
    fetchRecords(activeScope, { startDate: start, endDate: end, search: "", departmentId: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope]);

  function exportCsv() {
    const headers = ["Employee", "Date", "Total Hours", "Status", "Late (min)", "Undertime (min)", "Overtime (min)"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r: any) => [
      `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.trim(),
      r.date,
      r.total_hours,
      r.status,
      r.late_minutes,
      r.undertime_minutes,
      r.overtime_minutes,
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-records-${activeScope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    // Build a printable HTML table and trigger print
    const headers = ["Employee", "Date", "Hours", "Status", "Late", "Undertime", "Overtime"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r: any) =>
      `<tr>
        <td>${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}</td>
        <td>${r.date}</td>
        <td>${r.total_hours}h</td>
        <td>${r.status}</td>
        <td>${r.late_minutes}m</td>
        <td>${r.undertime_minutes}m</td>
        <td>${r.overtime_minutes}m</td>
      </tr>`
    ).join("");

    const html = `<html><head><title>Attendance Records</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Attendance Records</h2>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  const showNameColumn = activeScope !== "personal";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Attendance Records</h2>
      <Tabs defaultValue="personal" onValueChange={handleTabChange}>
        <RecordsFilterBar
          departments={departments}
          onFilter={handleFilter}
          onExportCsv={exportCsv}
          onExportPdf={exportPdf}
          showDepartmentFilter={activeScope !== "personal"}
          showNameSearch={activeScope !== "personal"}
        >
          <TabsList>
            <TabsTrigger value="personal">My Records</TabsTrigger>
            {isTeamLeader && <TabsTrigger value="team">Team Records</TabsTrigger>}
            {isDeptManager && <TabsTrigger value="department">Department Records</TabsTrigger>}
            {isAdminLevel && <TabsTrigger value="all">All Members</TabsTrigger>}
          </TabsList>
        </RecordsFilterBar>

        {["personal", "team", "department", "all"].map((scope) => (
          <TabsContent key={scope} value={scope} className="animate-fade-in">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : records.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No records found in this date range.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {showNameColumn && <TableHead>Employee</TableHead>}
                    {showNameColumn && <TableHead>Department</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Undertime</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {records.map((r: any) => (
                    <TableRow key={r.id} className="row-hover">
                      {showNameColumn && (
                        <TableCell>
                          {r.profiles?.first_name} {r.profiles?.last_name}
                        </TableCell>
                      )}
                      {showNameColumn && (
                        <TableCell>
                          {r.profiles?.employee_details?.departments?.name ?? "—"}
                        </TableCell>
                      )}
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>
                        <ClockTimesCell
                          entries={r.clock_entries ?? []}
                          type="clock_in"
                          date={r.date}
                          onManual={() => setManualEntry({ date: r.date, type: "clock_in" })}
                        />
                      </TableCell>
                      <TableCell>
                        <ClockTimesCell
                          entries={r.clock_entries ?? []}
                          type="clock_out"
                          date={r.date}
                          onManual={() => setManualEntry({ date: r.date, type: "clock_out" })}
                        />
                      </TableCell>
                      <TableCell>{r.total_hours}h</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>
                          {r.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.late_minutes > 0 ? `${r.late_minutes}m` : "—"}</TableCell>
                      <TableCell>{r.undertime_minutes > 0 ? `${r.undertime_minutes}m` : "—"}</TableCell>
                      <TableCell>{r.overtime_minutes > 0 ? `${r.overtime_minutes}m` : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setViewing(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {viewing && (
        <RequestDetailDialog
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          title={`Attendance: ${formatDate(viewing.date)}`}
          showApproval={false}
        >
          <AttendanceDetailContent viewing={viewing} />
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Employee:</span> {viewing.profiles?.first_name} {viewing.profiles?.last_name}</div>
            <div><span className="text-muted-foreground">Date:</span> {formatDate(viewing.date)}</div>
            <div><span className="text-muted-foreground">Total Hours:</span> {viewing.total_hours}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge>{viewing.status?.replace("_", " ")}</Badge></div>
            {viewing.is_late && <div><span className="text-muted-foreground">Late:</span> {viewing.late_minutes} minutes</div>}
            {viewing.undertime_minutes > 0 && <div><span className="text-muted-foreground">Undertime:</span> {viewing.undertime_minutes} minutes</div>}
            {viewing.overtime_minutes > 0 && <div><span className="text-muted-foreground">Overtime:</span> {viewing.overtime_minutes} minutes</div>}
            {viewing.has_missing_entry && <div className="text-destructive">&#9888; Missing entry detected</div>}
          </div>
        </RequestDetailDialog>
      )}

      {manualEntry && (
        <ManualClockDialog
          open={!!manualEntry}
          onOpenChange={(o) => !o && setManualEntry(null)}
          defaultDate={manualEntry.date}
          defaultType={manualEntry.type}
          hideTrigger
        />
      )}
    </div>
  );
}

function ClockTimesCell({
  entries,
  type,
  onManual,
}: {
  entries: Array<{ id: string; type: string; timestamp: string; is_manual?: boolean }>;
  type: "clock_in" | "clock_out";
  date: string;
  onManual: () => void;
}) {
  const filtered = entries.filter((e) => e.type === type);

  if (filtered.length === 0) {
    return (
      <button
        type="button"
        onClick={onManual}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <Plus className="h-3 w-3" />
        Manual Entry
      </button>
    );
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div key={e.id} className="font-mono text-xs">
            {time}
            {e.is_manual && <span className="ml-1 text-muted-foreground">(M)</span>}
          </div>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AttendanceDetailContent({ viewing }: { viewing: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    getClockEntriesByDate(viewing.profile_id ?? viewing.profiles?.id, viewing.date).then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [viewing]);

  if (!loaded) {
    return <div className="text-sm text-muted-foreground">Loading clock entries...</div>;
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="text-sm font-medium">Clock Entries ({entries.length})</div>
      <div className="space-y-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {entries.map((e: any) => {
          const time = new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          const typeLabel = e.type === "clock_in" ? "Clock In" : "Clock Out";
          const variant = e.type === "clock_in" ? "default" : "secondary";
          return (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <Badge variant={variant} className="text-xs">{typeLabel}</Badge>
              <span className="font-mono">{time}</span>
              {e.is_manual && <Badge variant="outline" className="text-xs">Manual</Badge>}
              {e.latitude != null && e.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  📍 GPS
                </a>
              )}
              {e.selfie_url && (
                <a
                  href={e.selfie_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  📷 Selfie
                </a>
              )}
              {e.attachment_url && (
                <a
                  href={e.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  📎 File
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
