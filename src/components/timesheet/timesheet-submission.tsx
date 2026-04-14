"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { submitTimesheet } from "@/lib/actions/timesheet";
import { CheckCircle2, Clock, XCircle, FileText, Send } from "lucide-react";

type Submission = {
  id: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submitted_at?: string | null;
  week_start_date: string;
} | null;

type Props = {
  submission: Submission;
  weekStartDate: string;
};

export function TimesheetSubmission({ submission, weekStartDate }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitTimesheet(weekStartDate);
      if (result.error) toast.error(result.error);
      else toast.success("Timesheet submitted successfully");
    });
  }

  if (!submission || submission.status === "draft") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Not submitted</p>
          <p className="text-xs text-muted-foreground">Submit your timesheet before the deadline</p>
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          <Send className="w-4 h-4 mr-1" />
          Submit
        </Button>
      </div>
    );
  }

  if (submission.status === "submitted") {
    const submittedDate = submission.submitted_at
      ? new Date(submission.submitted_at).toLocaleDateString("en-PH", {
          month: "short", day: "numeric", year: "numeric",
        })
      : "—";
    return (
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <Clock className="w-5 h-5 text-blue-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">Awaiting review</p>
          <p className="text-xs text-muted-foreground">Submitted on {submittedDate}</p>
        </div>
        <Badge variant="secondary">Submitted</Badge>
      </div>
    );
  }

  if (submission.status === "approved") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">Timesheet Approved</p>
          <p className="text-xs text-green-600/80 dark:text-green-500/80">
            Week of {submission.week_start_date}
          </p>
        </div>
        <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>
      </div>
    );
  }

  if (submission.status === "rejected") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4">
        <XCircle className="w-5 h-5 text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Timesheet Rejected</p>
          <p className="text-xs text-red-600/80 dark:text-red-500/80">
            Revise your entries and resubmit
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleSubmit} disabled={isPending}>
          Edit &amp; Resubmit
        </Button>
      </div>
    );
  }

  return null;
}
