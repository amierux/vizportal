"use client";

import { useEffect, useState } from "react";
import { getRequestApprovalDetail, followUpApproval } from "@/lib/actions/approvals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Mail, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

type ApprovalStep = {
  id: string;
  step_order: number;
  status: "pending" | "approved" | "rejected";
  comment: string | null;
  decided_at: string | null;
  reminder_sent_at: string | null;
  approver: { first_name: string | null; last_name: string | null; email: string } | null;
};

type ApprovalDetail = {
  id: string;
  type: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  current_step: number;
  total_steps: number;
  created_at: string;
  approval_steps: ApprovalStep[];
};

type RequestDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: "leave_request" | "overtime" | "manual_clock";
  referenceId?: string;
  title: string;
  /** When false, skips the approval fetch and hides the approval section entirely. Defaults to true. */
  showApproval?: boolean;
  /** Renders custom content above the approval timeline (e.g. request fields). */
  children?: React.ReactNode;
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

export function RequestDetailDialog({
  open,
  onOpenChange,
  type,
  referenceId,
  title,
  showApproval = true,
  children,
}: RequestDetailDialogProps) {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!open || !showApproval || !type || !referenceId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const d = await getRequestApprovalDetail(type!, referenceId!);
        if (!cancelled) setDetail(d as ApprovalDetail | null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, showApproval, type, referenceId]);

  async function handleFollowUp() {
    if (!type || !referenceId) return;
    setFollowing(true);
    const result = await followUpApproval(type, referenceId);
    if ("error" in result) toast.error(result.error);
    else toast.success(`Reminder sent to ${result.sent} approver(s)`);
    setFollowing(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {children && (
          <>
            <div className="space-y-2">{children}</div>
            {showApproval && <Separator />}
          </>
        )}

        {showApproval && <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Approval Status</h3>
            {detail && detail.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleFollowUp}
                disabled={following}
              >
                <Mail className="mr-2 h-4 w-4" />
                {following ? "Sending..." : "Follow Up"}
              </Button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading approval details...</p>
          ) : !detail ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No approval workflow attached to this request.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span>Overall:</span>
                <Badge variant={STATUS_BADGE[detail.status] ?? "outline"}>
                  {detail.status}
                </Badge>
                <span className="text-muted-foreground">
                  Step {detail.current_step}/{detail.total_steps}
                </span>
              </div>

              <ol className="space-y-2">
                {detail.approval_steps.map((step) => {
                  const Icon =
                    step.status === "approved" ? CheckCircle2 :
                    step.status === "rejected" ? XCircle : Clock;
                  const iconColor =
                    step.status === "approved" ? "text-green-600" :
                    step.status === "rejected" ? "text-red-600" : "text-amber-500";
                  const name = step.approver
                    ? `${step.approver.first_name ?? ""} ${step.approver.last_name ?? ""}`.trim() || step.approver.email
                    : "Unknown approver";
                  return (
                    <li key={step.id} className="flex items-start gap-3 rounded-md border p-3">
                      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Step {step.step_order}: {name}</span>
                          <Badge variant={STATUS_BADGE[step.status] ?? "outline"} className="text-xs">
                            {step.status}
                          </Badge>
                        </div>
                        {step.comment && (
                          <p className="mt-1 text-sm text-muted-foreground italic">&quot;{step.comment}&quot;</p>
                        )}
                        {step.decided_at && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Decided {formatDate(step.decided_at)}
                          </p>
                        )}
                        {step.status === "pending" && step.reminder_sent_at && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last reminded {formatDate(step.reminder_sent_at)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
