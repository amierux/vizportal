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
import { RecordsFilterBar } from "@/components/shared/records-filter-bar";
import { getAttendanceRecords, type RecordScope } from "@/lib/actions/records";
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
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Undertime</TableHead>
                    <TableHead>Overtime</TableHead>
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
                      <TableCell>{r.total_hours}h</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>
                          {r.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.late_minutes > 0 ? `${r.late_minutes}m` : "—"}</TableCell>
                      <TableCell>{r.undertime_minutes > 0 ? `${r.undertime_minutes}m` : "—"}</TableCell>
                      <TableCell>{r.overtime_minutes > 0 ? `${r.overtime_minutes}m` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
