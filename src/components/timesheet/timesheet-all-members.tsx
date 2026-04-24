"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { approveTimesheet, rejectTimesheet } from "@/lib/actions/timesheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Download, Eye, FileSpreadsheet, FileText, Clock, FileQuestion } from "lucide-react";
import { getTimesheetEntries } from "@/lib/actions/workspace-time-entries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";

type Department = { id: string; name: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Submission = any;

type Props = {
  submissions: Submission[];
  departments: Department[];
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-600 hover:bg-green-600 text-white">Approved</Badge>;
    case "submitted":
      return <Badge variant="secondary">Submitted</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

function fmtHours(minutes: number) {
  return (minutes / 60).toFixed(1) + " hrs";
}

function exportCSV(data: Submission[]) {
  const rows = [
    ["Employee", "Department", "Week Start", "Week End", "Total Hours", "Status"],
    ...data.map((s) => [
      `${s.profiles?.first_name ?? ""} ${s.profiles?.last_name ?? ""}`.trim(),
      s.profiles?.employee_details?.departments?.name ?? "—",
      s.week_start_date,
      s.week_end_date,
      ((s.total_minutes ?? 0) / 60).toFixed(1),
      s.status,
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timesheets-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(data: Submission[]) {
  const headers = ["Employee", "Department", "Week", "Hours", "Status"];
  const rows = data.map((s) =>
    `<tr>
      <td>${s.profiles?.first_name ?? ""} ${s.profiles?.last_name ?? ""}</td>
      <td>${s.profiles?.employee_details?.departments?.name ?? "—"}</td>
      <td>${s.week_start_date} → ${s.week_end_date}</td>
      <td>${((s.total_minutes ?? 0) / 60).toFixed(1)}h</td>
      <td>${s.status}</td>
    </tr>`
  ).join("");
  const html = `<html><head><title>Timesheets</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
    </head><body><h2>Timesheet Report</h2>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

export function TimesheetAllMembers({ submissions, departments }: Props) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const [actionDialog, setActionDialog] = useState<{
    submissionId: string; type: "approve" | "reject"; employeeName: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewing, setViewing] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [viewEntries, setViewEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  async function handleView(submission: Submission) {
    setViewing(submission);
    setEntriesLoading(true);
    try {
      const entries = await getTimesheetEntries(
        submission.profile_id,
        submission.week_start_date,
        submission.week_end_date,
      );
      setViewEntries(entries);
    } catch {
      setViewEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }

  const filtered = submissions.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterDept !== "all" && s.profiles?.employee_details?.department_id !== filterDept) return false;
    if (filterStart && s.week_start_date < filterStart) return false;
    if (filterEnd && s.week_start_date > filterEnd) return false;
    return true;
  });

  function handleAction(type: "approve" | "reject", submissionId: string, employeeName: string) {
    setComment("");
    setActionDialog({ submissionId, type, employeeName });
  }

  function confirmAction() {
    if (!actionDialog) return;
    startTransition(async () => {
      let result;
      if (actionDialog.type === "approve") {
        result = await approveTimesheet(actionDialog.submissionId, comment);
      } else {
        result = await rejectTimesheet(actionDialog.submissionId, comment);
      }
      if (result.error) toast.error(result.error);
      else toast.success(`Timesheet ${actionDialog.type === "approve" ? "approved" : "rejected"}`);
      setActionDialog(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="h-8 text-sm w-36" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="h-8 text-sm w-36" />
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
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportCSV(filtered)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportPDF(filtered)}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Employee</th>
              <th className="px-3 py-2 text-left font-medium">Department</th>
              <th className="px-3 py-2 text-left font-medium">Week</th>
              <th className="px-3 py-2 text-right font-medium">Total Hours</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No timesheets found
                </td>
              </tr>
            )}
            {filtered.map((s: Submission) => {
              const name = `${s.profiles?.first_name ?? ""} ${s.profiles?.last_name ?? ""}`.trim() || "—";
              const dept = s.profiles?.employee_details?.departments?.name ?? "—";
              return (
                <tr key={s.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{dept}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {s.week_start_date} – {s.week_end_date}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtHours(s.total_minutes ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleView(s)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {s.status === "submitted" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAction("approve", s.id, name)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleAction("reject", s.id, name)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View detail dialog — full width */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); setViewEntries([]); } }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Timesheet: {viewing?.profiles?.first_name ?? ""} {viewing?.profiles?.last_name ?? ""}
            </DialogTitle>
          </DialogHeader>

          {viewing && (
            <div className="text-sm space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="font-medium">{viewing.profiles?.first_name} {viewing.profiles?.last_name}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Week</p>
                  <p className="font-medium">{formatDate(viewing.week_start_date)} — {formatDate(viewing.week_end_date)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="text-xl font-bold">{((viewing.total_minutes ?? 0) / 60).toFixed(1)}h</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5"><StatusBadge status={viewing.status} /></div>
                </div>
              </div>

              {/* Time Entries Breakdown */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Time Entries
                </h4>
                {entriesLoading ? (
                  <div className="text-muted-foreground text-sm py-4 text-center">Loading entries...</div>
                ) : viewEntries.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground text-sm">
                    <FileQuestion className="h-8 w-8 opacity-40" />
                    No time entries found for this week
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Task</th>
                          <th className="px-3 py-2 text-left font-medium">Date</th>
                          <th className="px-3 py-2 text-right font-medium">Hours</th>
                          <th className="px-3 py-2 text-left font-medium">Billable</th>
                          <th className="px-3 py-2 text-left font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewEntries.map((entry: any) => (
                          <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 font-medium">
                              {entry.workspace_tasks?.name ?? <span className="text-muted-foreground italic">Unknown task</span>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.date)}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {(entry.duration_minutes / 60).toFixed(1)}h
                            </td>
                            <td className="px-3 py-2">
                              {entry.is_billable ? (
                                <Badge className="bg-green-600 text-white text-xs">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[300px] truncate">
                              {entry.description || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-semibold">
                          <td className="px-3 py-2" colSpan={2}>Total</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {(viewEntries.reduce((sum: number, e: any) => sum + (e.duration_minutes ?? 0), 0) / 60).toFixed(1)}h
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Approve / Reject buttons inside detail view */}
              {viewing.status === "submitted" && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      const name = `${viewing.profiles?.first_name ?? ""} ${viewing.profiles?.last_name ?? ""}`.trim();
                      setViewing(null);
                      setViewEntries([]);
                      handleAction("approve", viewing.id, name);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Approve Timesheet
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const name = `${viewing.profiles?.first_name ?? ""} ${viewing.profiles?.last_name ?? ""}`.trim();
                      setViewing(null);
                      setViewEntries([]);
                      handleAction("reject", viewing.id, name);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject Timesheet
                  </Button>
                </div>
              )}

              {/* Show submitted date if available */}
              {viewing.submitted_at && (
                <p className="text-xs text-muted-foreground">
                  Submitted on {formatDate(viewing.submitted_at)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "approve" ? "Approve" : "Reject"} Timesheet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {actionDialog?.type === "approve" ? "Approving" : "Rejecting"} timesheet for{" "}
              <span className="font-medium text-foreground">{actionDialog?.employeeName}</span>.
            </p>
            <Textarea
              placeholder="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.type === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={isPending}
            >
              {actionDialog?.type === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
