"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type SummaryRow = {
  profileId: string;
  name: string;
  department: string;
  daysPresent: number;
  lateCount: number;
  totalLateMinutes: number;
  undertimeHours: number;
  overtimeHours: number;
  absences: number;
};

type AttendanceSummaryTableProps = {
  rows: SummaryRow[];
};

export function AttendanceSummaryTable({ rows }: AttendanceSummaryTableProps) {
  function exportCsv() {
    const headers = [
      "Employee",
      "Department",
      "Days Present",
      "Late Count",
      "Total Late (min)",
      "Undertime (hrs)",
      "Overtime (hrs)",
      "Absences",
    ];
    const csvRows = rows.map((r) =>
      [
        r.name,
        r.department,
        r.daysPresent,
        r.lateCount,
        r.totalLateMinutes,
        r.undertimeHours.toFixed(1),
        r.overtimeHours.toFixed(1),
        r.absences,
      ].join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Present</TableHead>
            <TableHead className="text-right">Late</TableHead>
            <TableHead className="text-right">Late (min)</TableHead>
            <TableHead className="text-right">Undertime</TableHead>
            <TableHead className="text-right">Overtime</TableHead>
            <TableHead className="text-right">Absences</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No data
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.profileId}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="text-right">{row.daysPresent}</TableCell>
                <TableCell className="text-right">{row.lateCount}</TableCell>
                <TableCell className="text-right">{row.totalLateMinutes}</TableCell>
                <TableCell className="text-right">{row.undertimeHours.toFixed(1)}h</TableCell>
                <TableCell className="text-right">{row.overtimeHours.toFixed(1)}h</TableCell>
                <TableCell className="text-right">{row.absences}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
