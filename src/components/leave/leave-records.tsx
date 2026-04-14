"use client";

import { useState, useCallback } from "react";
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
import { getLeaveRecords, type RecordScope } from "@/lib/actions/records";
import { formatDate } from "@/lib/utils/format";
import type { RoleName } from "@/types";

type Department = { id: string; name: string };

type LeaveRecordsProps = {
  userRoles: RoleName[];
  departments: Department[];
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

export function LeaveRecords({ userRoles, departments }: LeaveRecordsProps) {
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
    const data = await getLeaveRecords({
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
    setRecords([]);
  }

  function exportCsv() {
    const headers = ["Employee", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reason", "Filed On"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r: any) => [
      `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.trim(),
      r.leave_types?.name ?? "",
      r.start_date,
      r.end_date,
      r.total_days,
      r.status,
      `"${(r.reason ?? "").replace(/"/g, '""')}"`,
      r.created_at?.split("T")[0] ?? "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-records-${activeScope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const headers = ["Employee", "Leave Type", "Start", "End", "Days", "Status", "Filed"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r: any) =>
      `<tr>
        <td>${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}</td>
        <td>${r.leave_types?.name ?? ""}</td>
        <td>${r.start_date}</td>
        <td>${r.end_date}</td>
        <td>${r.total_days}</td>
        <td>${r.status}</td>
        <td>${r.created_at?.split("T")[0] ?? ""}</td>
      </tr>`
    ).join("");

    const html = `<html><head><title>Leave Records</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Leave Records</h2>
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
      <h2 className="text-lg font-semibold">Leave Records</h2>
      <Tabs defaultValue="personal" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="personal">My Records</TabsTrigger>
          {isTeamLeader && <TabsTrigger value="team">Team Records</TabsTrigger>}
          {isDeptManager && <TabsTrigger value="department">Department Records</TabsTrigger>}
          {isAdminLevel && <TabsTrigger value="all">All Members</TabsTrigger>}
        </TabsList>

        {["personal", "team", "department", "all"].map((scope) => (
          <TabsContent key={scope} value={scope}>
            <RecordsFilterBar
              departments={departments}
              onFilter={handleFilter}
              onExportCsv={exportCsv}
              onExportPdf={exportPdf}
              showDepartmentFilter={scope !== "personal"}
            />

            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : records.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No records found. Use the filters above and click Filter.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {showNameColumn && <TableHead>Employee</TableHead>}
                    {showNameColumn && <TableHead>Department</TableHead>}
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {records.map((r: any) => (
                    <TableRow key={r.id}>
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
                      <TableCell>
                        {r.leave_types?.name ?? "—"}{" "}
                        <span className="text-muted-foreground">({r.leave_types?.code})</span>
                      </TableCell>
                      <TableCell>{formatDate(r.start_date)}</TableCell>
                      <TableCell>{formatDate(r.end_date)}</TableCell>
                      <TableCell>{r.total_days}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
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
