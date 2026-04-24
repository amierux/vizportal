"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import { AttendanceAnalytics } from "@/components/attendance/attendance-analytics";
import { getAttendanceSummaries } from "@/lib/actions/attendance";
import { formatFullName, formatDate } from "@/lib/utils/format";
import { SGT_TIMEZONE } from "@/lib/constants";

type Department = { id: string; name: string };

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
  { value: "rest_day", label: "Rest Day" },
];

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  late: "secondary",
  absent: "destructive",
  half_day: "outline",
  on_leave: "secondary",
  rest_day: "outline",
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialRows: any[];
  initialDate: string;
  departments: Department[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analyticsData: any;
};

export function AttendanceManageClient({
  initialRows,
  initialDate,
  departments,
  analyticsData,
}: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [records, setRecords] = useState<any[]>(initialRows);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: SGT_TIMEZONE });
  const [date, setDate] = useState(initialDate);
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAttendanceSummaries({
        date,
        departmentId: filterDept !== "all" ? filterDept : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        perPage: 200,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecords((data as any) ?? []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [date, filterDept, filterStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Client-side search filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = search
    ? records.filter((r: any) => {
        const q = search.toLowerCase();
        const name = `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.toLowerCase();
        const dept = (r.profiles?.employee_details?.departments?.name ?? "").toLowerCase();
        return name.includes(q) || dept.includes(q);
      })
    : records;

  function exportCsv() {
    const headers = ["Employee", "Department", "Date", "Hours", "Status", "Late (min)", "Missing Entry"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = filtered.map((r: any) => [
      `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.trim(),
      r.profiles?.employee_details?.departments?.name ?? "",
      r.date,
      r.total_hours,
      r.status,
      r.late_minutes ?? 0,
      r.has_missing_entry ? "Yes" : "No",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const headers = ["Employee", "Department", "Date", "Hours", "Status", "Late"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = filtered.map((r: any) =>
      `<tr>
        <td>${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}</td>
        <td>${r.profiles?.employee_details?.departments?.name ?? ""}</td>
        <td>${r.date}</td>
        <td>${r.total_hours}h</td>
        <td>${r.status}</td>
        <td>${r.late_minutes > 0 ? `${r.late_minutes}m` : "—"}</td>
      </tr>`
    ).join("");
    const html = `<html><head><title>Attendance — ${date}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Attendance Records — ${date}</h2>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance Management</h1>

      <AttendanceAnalytics data={analyticsData} />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Date</label>
          <Input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            className="h-8 text-sm w-40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Department</label>
          <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs text-muted-foreground mb-1 block">Search</label>
          <div className="relative">
            <Input
              placeholder="Search by name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm pr-8"
            />
            <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="outline" size="sm" className="h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPdf}>
              <FileText className="w-4 h-4 mr-2" />PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No attendance records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {filtered.map((row: any) => (
                <TableRow
                  key={row.id}
                  className="table-row-hover cursor-pointer"
                  onClick={() => router.push(`/attendance/view/${row.id}`)}
                >
                  <TableCell className="font-medium">
                    {row.profiles
                      ? formatFullName(row.profiles.first_name, row.profiles.last_name)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.profiles?.employee_details?.departments?.name ?? "—"}
                  </TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{(row.total_hours ?? 0).toFixed(1)}h</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                      {row.status?.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.is_late ? `${row.late_minutes}m` : "—"}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
