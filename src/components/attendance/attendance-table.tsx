"use client";

import { useRouter } from "next/navigation";
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
import { Eye } from "lucide-react";
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
  const router = useRouter();

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
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No records found
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className="table-row-hover cursor-pointer"
              onClick={() => router.push(`/attendance/view/${row.id}`)}
            >
              <TableCell>
                {row.profiles
                  ? formatFullName(row.profiles.first_name, row.profiles.last_name)
                  : "—"}
              </TableCell>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell>{row.total_hours.toFixed(1)}h</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                  {row.status.replace(/_/g, " ")}
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
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/attendance/view/${row.id}`);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
