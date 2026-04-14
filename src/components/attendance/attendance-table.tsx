"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatFullName, formatDate } from "@/lib/utils/format";

type AttendanceRow = {
  id: string;
  date: string;
  total_hours: number;
  status: string;
  is_late: boolean;
  late_minutes: number;
  has_missing_entry: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
};

type AttendanceTableProps = {
  rows: AttendanceRow[];
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  half_day: "outline",
  on_leave: "secondary",
};

export function AttendanceTable({ rows }: AttendanceTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Hours</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Late</TableHead>
          <TableHead>Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No records found
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                {row.profiles
                  ? formatFullName(row.profiles.first_name, row.profiles.last_name)
                  : "—"}
              </TableCell>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell>{row.total_hours.toFixed(1)}h</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                  {row.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {row.is_late ? `${row.late_minutes}m` : "—"}
              </TableCell>
              <TableCell>
                {row.has_missing_entry && (
                  <Badge variant="destructive">Missing entry</Badge>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
