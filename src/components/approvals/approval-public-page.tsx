"use client";

import { useActionState, useEffect, useState } from "react";
import { processApprovalDecision } from "@/lib/actions/approvals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatFullName } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/format";
import { CheckCircle, XCircle, Clock } from "lucide-react";

type ApprovalPublicPageProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  referenceDetails: any;
  token: string;
};

async function handleDecision(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const token = formData.get("token") as string;
  const decision = formData.get("decision") as "approved" | "rejected";
  const comment = (formData.get("comment") as string) || null;
  return processApprovalDecision(token, decision, comment);
}

export function ApprovalPublicPage({ step, referenceDetails, token }: ApprovalPublicPageProps) {
  const [state, formAction, isPending] = useActionState(handleDecision, null);
  const [decided, setDecided] = useState(step.status !== "pending");

  const request = step.approval_requests;
  const requester = request?.requester;
  const requesterName = requester
    ? formatFullName(requester.first_name, requester.last_name)
    : "Unknown";

  const typeLabel = request?.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Decision recorded successfully");
      setDecided(true);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>;
  };

  if (decided && step.status !== "pending") {
    return (
      <Card>
        <CardHeader className="text-center">
          {step.status === "approved" ? (
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
          )}
          <CardTitle>Already Decided</CardTitle>
          <CardDescription>
            This request was {step.status} on {formatDate(step.decided_at)}.
          </CardDescription>
        </CardHeader>
        {step.comment && (
          <CardContent>
            <p className="text-sm text-muted-foreground">Comment: {step.comment}</p>
          </CardContent>
        )}
      </Card>
    );
  }

  if (decided) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle>Decision Recorded</CardTitle>
          <CardDescription>Thank you for your response.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{typeLabel}</CardTitle>
        </div>
        <CardDescription>
          Submitted by <strong>{requesterName}</strong> on {formatDate(request?.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium">Request Details</p>
          {request?.type === "manual_clock" && referenceDetails && (
            <>
              <p className="text-sm">Date: {referenceDetails.date}</p>
              <p className="text-sm">Type: {referenceDetails.type === "clock_in" ? "Clock In" : "Clock Out"}</p>
              <p className="text-sm">Time: {new Date(referenceDetails.timestamp).toLocaleTimeString()}</p>
              {referenceDetails.manual_remarks && (
                <p className="text-sm">Remarks: {referenceDetails.manual_remarks}</p>
              )}
            </>
          )}
          {request?.type === "leave_request" && referenceDetails && (
            <>
              <p className="text-sm">Leave Type: {referenceDetails.leave_types?.name ?? "N/A"}</p>
              <p className="text-sm">From: {referenceDetails.start_date} — To: {referenceDetails.end_date}</p>
              <p className="text-sm">Total Days: {referenceDetails.total_days}</p>
              {referenceDetails.reason && (
                <p className="text-sm">Reason: {referenceDetails.reason}</p>
              )}
            </>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Step {step.step_order} of {request?.total_steps} · {statusBadge("pending")}
        </div>

        <Separator />

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea id="comment" name="comment" placeholder="Add a comment..." rows={3} />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              name="decision"
              value="approved"
              className="flex-1"
              disabled={isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="destructive"
              className="flex-1"
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
