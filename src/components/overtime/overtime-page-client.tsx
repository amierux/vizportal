"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequestDetailDialog } from "@/components/shared/request-detail-dialog";
import { OvertimeRequestForm } from "@/components/overtime/overtime-request-form";
import { OvertimeAnalytics } from "@/components/overtime/overtime-analytics";
import { cancelOvertimeRequest, getOvertimeRecords } from "@/lib/actions/overtime";
import { fetchOvertimeAnalytics } from "@/lib/actions/analytics";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { RoleName } from "@/types";

type Department = { id: string; name: string };

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

type Props = {
  myRequests: any[];
  analyticsData: any | null;
  roles: RoleName[];
  departments: Department[];
  isAdminLevel: boolean;
};

export function OvertimePageClient({ myRequests, analyticsData, roles, departments, isAdminLevel }: Props) {
  const [view, setView] = useState<"my" | "all">("my");
  const [records, setRecords] = useState<any[]>(myRequests);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any | null>(analyticsData);
  const [viewing, setViewing] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchAllRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOvertimeRecords({
        scope: "all",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
        departmentId: filterDept !== "all" ? filterDept : undefined,
      });
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, search, filterDept]);

  // When switching views
  useEffect(() => {
    if (view === "my") {
      // Filter myRequests client-side
      let filtered = myRequests;
      if (filterStatus !== "all") {
        filtered = filtered.filter((r: any) => r.status === filterStatus);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((r: any) =>
          r.reason?.toLowerCase().includes(q) || r.date?.includes(q)
        );
      }
      setRecords(filtered);
    } else {
      fetchAllRecords();
    }
  }, [view, filterStatus, search, myRequests, fetchAllRecords]);

  // Refresh analytics when switching to "all" view
  useEffect(() => {
    if (view === "all" && isAdminLevel) {
      fetchOvertimeAnalytics().then(setAnalytics);
    } else if (view === "my") {
      setAnalytics(analyticsData);
    }
  }, [view, isAdminLevel, analyticsData]);

  async function handleCancel(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const result = await cancelOvertimeRequest(id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Overtime request cancelled");
  }

  function handleSearch() {
    if (view === "all") fetchAllRecords();
  }

  function exportCsv() {
    const showName = view === "all";
    const headers = [
      ...(showName ? ["Employee", "Department"] : []),
      "Date", "Start", "End", "Hours", "Status", "Reason", "Filed On",
    ];
    const rows = records.map((r: any) => [
      ...(showName ? [
        `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`.trim(),
        r.profiles?.employee_details?.departments?.name ?? "",
      ] : []),
      r.date, r.start_time, r.end_time, r.total_hours, r.status,
      `"${(r.reason ?? "").replace(/"/g, '""')}"`,
      r.created_at?.split("T")[0] ?? "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overtime-${view}-records.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const showName = view === "all";
    const headers = [
      ...(showName ? ["Employee", "Department"] : []),
      "Date", "Start", "End", "Hours", "Status",
    ];
    const rows = records.map((r: any) =>
      `<tr>
        ${showName ? `<td>${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}</td><td>${r.profiles?.employee_details?.departments?.name ?? ""}</td>` : ""}
        <td>${r.date}</td><td>${r.start_time}</td><td>${r.end_time}</td>
        <td>${r.total_hours}h</td><td>${r.status}</td>
      </tr>`
    ).join("");
    const html = `<html><head><title>Overtime Records</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Overtime Records — ${view === "my" ? "My Records" : "All Members"}</h2>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  const showNameColumn = view === "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Overtime</h1>
          {isAdminLevel && (
            <Select value={view} onValueChange={(v) => setView(v as "my" | "all")}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Records</SelectItem>
                <SelectItem value="all">All Members</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <OvertimeRequestForm />
      </div>

      {/* Analytics */}
      {isAdminLevel && <OvertimeAnalytics data={analytics} />}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="text-xs text-muted-foreground mb-1 block">Search</label>
          <div className="relative">
            <Input
              placeholder={view === "all" ? "Search by name or reason..." : "Search by reason..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-8 text-sm pr-8"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={handleSearch}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm w-36" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-sm w-36" />
        </div>
        {view === "all" && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Department</label>
            <Select value={filterDept} onValueChange={setFilterDept}>
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
        )}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
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
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No overtime records found.</div>
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id} className="table-row-hover cursor-pointer" onClick={() => setViewing(r)}>
                  {showNameColumn && (
                    <TableCell className="font-medium">
                      {r.profiles?.first_name ?? ""} {r.profiles?.last_name ?? ""}
                    </TableCell>
                  )}
                  {showNameColumn && (
                    <TableCell className="text-muted-foreground">
                      {r.profiles?.employee_details?.departments?.name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{r.start_time}</TableCell>
                  <TableCell>{r.end_time}</TableCell>
                  <TableCell className="font-mono">{r.total_hours}h</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">{r.reason ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setViewing(r); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {view === "my" && r.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => handleCancel(e, r.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail Dialog */}
      {viewing && (
        <RequestDetailDialog
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          type="overtime"
          referenceId={viewing.id}
          title={`Overtime: ${formatDate(viewing.date)}`}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {(view === "all" || viewing.profiles) && (
              <>
                <div className="text-muted-foreground">Employee</div>
                <div>{viewing.profiles?.first_name ?? ""} {viewing.profiles?.last_name ?? ""}</div>
              </>
            )}
            <div className="text-muted-foreground">Date</div>
            <div>{formatDate(viewing.date)}</div>
            <div className="text-muted-foreground">Time Range</div>
            <div>{viewing.start_time} — {viewing.end_time}</div>
            <div className="text-muted-foreground">Hours</div>
            <div>{viewing.total_hours}h</div>
            <div className="text-muted-foreground">Status</div>
            <div><Badge variant={STATUS_VARIANTS[viewing.status] ?? "outline"}>{viewing.status}</Badge></div>
            <div className="text-muted-foreground">Filed</div>
            <div>{formatDate(viewing.created_at)}</div>
            {viewing.reason && (
              <>
                <div className="text-muted-foreground">Reason</div>
                <div>{viewing.reason}</div>
              </>
            )}
          </div>
        </RequestDetailDialog>
      )}
    </div>
  );
}
