"use client";

import { useTransition, useState } from "react";
import { processTaskApproval } from "@/lib/actions/workspace-tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Clock } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type ApprovalStep = {
  id: string;
  step_order: number;
  status: string;
  comment: string | null;
  decided_at: string | null;
  approver: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type PendingApproval = {
  id: string;
  to_status_id: string;
  requested_by: string;
  status: string;
  created_at: string;
  requested_by_profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  workspace_task_approval_steps: ApprovalStep[];
};

type TaskStatusApprovalProps = {
  approvals: PendingApproval[];
  currentUserId: string;
};

export function TaskStatusApproval({ approvals, currentUserId }: TaskStatusApprovalProps) {
  const [pending, startTransition] = useTransition();
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

  if (approvals.length === 0) return null;

  function handleDecision(stepId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      const comment = commentMap[stepId] || null;
      const result = await processTaskApproval(stepId, decision, comment);
      if (result && "error" in result) toast.error(result.error);
      else toast.success(decision === "approved" ? "Approved" : "Rejected");
    });
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => {
        const requesterName = approval.requested_by_profile
          ? formatFullName(approval.requested_by_profile.first_name, approval.requested_by_profile.last_name)
          : "Someone";

        // Find current user's pending step
        const myPendingStep = approval.workspace_task_approval_steps.find(
          (s) => s.approver?.id === currentUserId && s.status === "pending"
        );

        const sortedSteps = [...approval.workspace_task_approval_steps].sort(
          (a, b) => a.step_order - b.step_order
        );

        return (
          <div
            key={approval.id}
            className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Status change pending approval
              </span>
              <Badge variant="outline" className="ml-auto text-xs border-yellow-400 text-yellow-700 dark:text-yellow-400">
                Pending
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Requested by <span className="font-medium">{requesterName}</span>
            </p>

            {/* Approval steps */}
            <div className="space-y-1">
              {sortedSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      step.status === "approved"
                        ? "bg-green-500"
                        : step.status === "rejected"
                        ? "bg-red-500"
                        : "bg-yellow-400"
                    }`}
                  />
                  <span className="text-muted-foreground">
                    Step {step.step_order}:{" "}
                    {step.approver
                      ? formatFullName(step.approver.first_name, step.approver.last_name)
                      : "Unknown"}
                  </span>
                  <span className="text-muted-foreground capitalize">&mdash; {step.status}</span>
                  {step.comment && (
                    <span className="italic text-muted-foreground">&ldquo;{step.comment}&rdquo;</span>
                  )}
                </div>
              ))}
            </div>

            {/* Approver actions */}
            {myPendingStep && (
              <div className="space-y-2 pt-1 border-t border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Your approval is required</span>
                </div>
                <textarea
                  placeholder="Comment (optional)"
                  rows={2}
                  value={commentMap[myPendingStep.id] ?? ""}
                  onChange={(e) =>
                    setCommentMap((prev) => ({ ...prev, [myPendingStep.id]: e.target.value }))
                  }
                  className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                    disabled={pending}
                    onClick={() => handleDecision(myPendingStep.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    disabled={pending}
                    onClick={() => handleDecision(myPendingStep.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
