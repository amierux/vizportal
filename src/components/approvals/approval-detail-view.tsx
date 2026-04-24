"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processApprovalDecision } from "@/lib/actions/approvals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate, formatFullName } from "@/lib/utils/format";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const TYPE_LABELS: Record<string, string> = {
  manual_clock: "Manual Clock Entry",
  leave_request: "Leave Request",
  leave_cancellation: "Leave Cancellation",
  overtime: "Overtime Request",
};

type Props = {
  step: any;
  request: any;
  allSteps: any[];
  referenceDetails: any;
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

export function ApprovalDetailView({ step, request, allSteps, referenceDetails }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(handleDecision, null);
  const [decided, setDecided] = useState(step.status !== "pending");

  const requester = request.requester;
  const requesterName = requester
    ? formatFullName(requester.first_name, requester.last_name)
    : "Unknown";
  const typeLabel = TYPE_LABELS[request.type] ?? request.type;

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Decision recorded");
      setDecided(true);
      router.push("/approvals");
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/approvals")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Approvals
        </Button>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{typeLabel}</h1>
            <p className="text-sm text-muted-foreground">
              From <strong>{requesterName}</strong> · Filed {formatDate(request.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_BADGE[request.status] ?? "outline"} className="text-sm px-3 py-1 shrink-0">
          {request.status}
        </Badge>
      </div>

      <Separator />

      {/* Reference details */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-semibold">Request Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {request.type === "manual_clock" && referenceDetails && (
            <>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">{referenceDetails.date}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">
                  {referenceDetails.type === "clock_in" ? "Clock In" : "Clock Out"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Time: </span>
                <span className="font-medium">
                  {new Date(referenceDetails.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {referenceDetails.manual_remarks && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Remarks: </span>
                  <span>{referenceDetails.manual_remarks}</span>
                </div>
              )}
            </>
          )}

          {(request.type === "leave_request" || request.type === "leave_cancellation") && referenceDetails && (
            <>
              <div>
                <span className="text-muted-foreground">Leave Type: </span>
                <span className="font-medium">{referenceDetails.leave_types?.name ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Days: </span>
                <span className="font-medium">{referenceDetails.total_days}</span>
              </div>
              <div>
                <span className="text-muted-foreground">From: </span>
                <span className="font-medium">{formatDate(referenceDetails.start_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">To: </span>
                <span className="font-medium">{formatDate(referenceDetails.end_date)}</span>
              </div>
              {referenceDetails.reason && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{referenceDetails.reason}</span>
                </div>
              )}
            </>
          )}

          {request.type === "overtime" && referenceDetails && (
            <>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">{formatDate(referenceDetails.date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Hours: </span>
                <span className="font-medium">{referenceDetails.total_hours}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time: </span>
                <span className="font-medium">
                  {referenceDetails.start_time} — {referenceDetails.end_time}
                </span>
              </div>
              {referenceDetails.reason && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{referenceDetails.reason}</span>
                </div>
              )}
            </>
          )}

          {!referenceDetails && (
            <div className="sm:col-span-2 flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Reference details not available.
            </div>
          )}
        </div>
      </div>

      {/* Approval timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Approval Timeline</h2>
          <span className="text-xs text-muted-foreground">
            Step {request.current_step} / {request.total_steps}
          </span>
        </div>

        <ol className="space-y-2">
          {allSteps.map((s: any) => {
            const Icon =
              s.status === "approved" ? CheckCircle2 :
              s.status === "rejected" ? XCircle : Clock;
            const iconColor =
              s.status === "approved" ? "text-green-600" :
              s.status === "rejected" ? "text-red-600" : "text-amber-500";
            const approverName = s.approver
              ? `${s.approver.first_name ?? ""} ${s.approver.last_name ?? ""}`.trim() || s.approver.email
              : "Unknown approver";
            return (
              <li key={s.id} className="flex items-start gap-3 rounded-md border p-3">
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="font-medium">Step {s.step_order}: {approverName}</span>
                    <Badge variant={STATUS_BADGE[s.status] ?? "outline"} className="text-xs">
                      {s.status}
                    </Badge>
                  </div>
                  {s.comment && (
                    <p className="mt-1 text-sm text-muted-foreground italic">&quot;{s.comment}&quot;</p>
                  )}
                  {s.decided_at && (
                    <p className="mt-1 text-xs text-muted-foreground">Decided {formatDate(s.decided_at)}</p>
                  )}
                  {s.status === "pending" && s.reminder_sent_at && (
                    <p className="mt-1 text-xs text-muted-foreground">Last reminded {formatDate(s.reminder_sent_at)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Action area — only if this step is still pending */}
      {!decided && step.status === "pending" && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Your Decision</h2>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="token" value={step.token} />
              <div className="space-y-2">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Textarea
                  id="comment"
                  name="comment"
                  placeholder="Add a comment for the requester..."
                  rows={3}
                />
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
          </div>
        </>
      )}

      {/* Already decided banner */}
      {(decided || step.status !== "pending") && (
        <>
          <Separator />
          <div className="rounded-lg border p-4 flex items-center gap-3 text-sm">
            {step.status === "approved" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            ) : step.status === "rejected" ? (
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            )}
            <div>
              <p className="font-medium capitalize">{step.status}</p>
              {step.decided_at && (
                <p className="text-xs text-muted-foreground">Decided on {formatDate(step.decided_at)}</p>
              )}
              {step.comment && (
                <p className="mt-1 text-muted-foreground italic">&quot;{step.comment}&quot;</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
