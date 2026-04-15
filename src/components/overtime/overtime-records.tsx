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
import { getOvertimeRecords } from "@/lib/actions/overtime";
import { formatDate } from "@/lib/utils/format";
import type { RoleName } from "@/types";

type Department = { id: string; name: string };

type OvertimeRecordsProps = {
  userRoles: RoleName[];
  departments: Department[];
};

type RecordScope = "personal" | "team" | "department" | "all";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

export function OvertimeRecords({ userRoles, departments }: OvertimeRecordsProps) {
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
    const data = await getOvertimeRecords({
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
    const headers = ["Employee", "Department", "Date", "Start", "End", "Hours", "Status", "Reason", "Filed On"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r: any) => [
      `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.trim(),
      r.profiles?.employee_details?.departments?.name ?? "",
      r.date,
      r.start_time,
      r.end_time,
      r.total_hours,
      r.status,
      `"${(r.reason ?? "").replace(/"/g, '""')}"`,
      r.created_at?.split("T")[0] ?? "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overtime-records-${activeScope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const headers = ["Employee", "Department", "Date", "Start", "End", "Hours", "Status"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r: any) =>
      `<tr>
        <td>${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}</td>
        <td>${r.profiles?.employee_details?.departments?.name ?? ""}</td>
        <td>${r.date}</td>
        <td>${r.start_time}</td>
        <td>${r.end_time}</td>
        <td>${r.total_hours}h</td>
        <td>${r.status}</td>
      </tr>`
    ).join("");

    const html = `<html><head><title>Overtime Records</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Overtime Records</h2>
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
      <h2 className="text-lg font-semibold">Overtime Records</h2>
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
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
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
                      <TableCell>{r.start_time}</TableCell>
                      <TableCell>{r.end_time}</TableCell>
                      <TableCell>{r.total_hours}h</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">{r.reason ?? "—"}</TableCell>
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
