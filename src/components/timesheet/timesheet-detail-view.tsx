"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, CheckCircle2, XCircle, FileQuestion } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { approveTimesheet, rejectTimesheet } from "@/lib/actions/timesheet";
import { toast } from "sonner";
import type { RoleName } from "@/types";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  submitted: "secondary",
  draft: "outline",
};

type Props = {
  submission: any;
  entries: any[];
  roles: RoleName[];
  currentUserId: string;
};

export function TimesheetDetailView({ submission, entries, roles, currentUserId }: Props) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  const isAdminLevel = roles.some((r) =>
    ["admin", "hr", "business_manager", "director", "dept_manager", "team_leader"].includes(r)
  );
  const canApprove = isAdminLevel && submission.status === "submitted" && submission.profile_id !== currentUserId;

  async function handleApprove() {
    setActing(true);
    const result = await approveTimesheet(submission.id, comment);
    if (result.error) toast.error(result.error);
    else { toast.success("Timesheet approved"); router.push("/timesheet"); }
    setActing(false);
  }

  async function handleReject() {
    setActing(true);
    const result = await rejectTimesheet(submission.id, comment);
    if (result.error) toast.error(result.error);
    else { toast.success("Timesheet rejected"); router.push("/timesheet"); }
    setActing(false);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/timesheet")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Timesheet
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            Timesheet: {submission.profiles?.first_name} {submission.profiles?.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(submission.week_start_date)} — {formatDate(submission.week_end_date)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[submission.status] ?? "outline"} className="ml-auto text-sm px-3 py-1">
          {submission.status}
        </Badge>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Employee</p>
          <p className="mt-1 font-semibold">{submission.profiles?.first_name} {submission.profiles?.last_name}</p>
          <p className="text-xs text-muted-foreground">{submission.profiles?.employee_details?.departments?.name ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Week</p>
          <p className="mt-1 font-semibold">{formatDate(submission.week_start_date)}</p>
          <p className="text-xs text-muted-foreground">to {formatDate(submission.week_end_date)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Hours</p>
          <p className="mt-1 text-3xl font-bold">{((submission.total_minutes ?? 0) / 60).toFixed(1)}h</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={STATUS_VARIANTS[submission.status] ?? "outline"} className="text-sm">
              {submission.status}
            </Badge>
          </div>
          {submission.submitted_at && (
            <p className="text-xs text-muted-foreground mt-1">Submitted {formatDate(submission.submitted_at)}</p>
          )}
        </div>
      </div>

      {/* Time Entries Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Entries
        </h2>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground border rounded-lg">
            <FileQuestion className="h-10 w-10 opacity-40" />
            <p>No time entries found for this week</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Task</th>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                  <th className="px-4 py-2.5 text-left font-medium">Billable</th>
                  <th className="px-4 py-2.5 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: any) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">
                      {entry.workspace_tasks?.name ?? <span className="text-muted-foreground italic">Unknown task</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.date)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{(entry.duration_minutes / 60).toFixed(1)}h</td>
                    <td className="px-4 py-2.5">
                      {entry.is_billable ? (
                        <Badge className="bg-green-600 text-white text-xs">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[300px] truncate">{entry.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5" colSpan={2}>Total</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {(entries.reduce((sum: number, e: any) => sum + (e.duration_minutes ?? 0), 0) / 60).toFixed(1)}h
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Approve/Reject Actions */}
      {canApprove && (
        <>
          <Separator />
          <div className="space-y-3">
            <Textarea
              placeholder="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={acting}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve Timesheet
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={acting}>
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Timesheet
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
