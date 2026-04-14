"use client";

import { useActionState, useEffect } from "react";
import { processApprovalDecision } from "@/lib/actions/approvals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatFullName, formatDate } from "@/lib/utils/format";
import { CheckCircle, XCircle, Clock, Inbox } from "lucide-react";
import { useState } from "react";

type ApprovalInboxProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approvals: any[];
};

async function handleInlineDecision(
  _prevState: { error: string } | { success: boolean } | null,
  formData: FormData
) {
  const token = formData.get("token") as string;
  const decision = formData.get("decision") as "approved" | "rejected";
  const comment = (formData.get("comment") as string) || null;
  return processApprovalDecision(token, decision, comment);
}

export function ApprovalInbox({ approvals }: ApprovalInboxProps) {
  const [state, formAction, isPending] = useActionState(handleInlineDecision, null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Decision recorded");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedId(null);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No pending approvals</p>
          <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending Approvals</h2>
        <Badge variant="secondary">{approvals.length}</Badge>
      </div>

      {approvals.map((step) => {
        const request = step.approval_requests;
        const requester = request?.requester;
        const requesterName = requester
          ? formatFullName(requester.first_name, requester.last_name)
          : "Unknown";
        const typeLabel = request?.type === "manual_clock" ? "Manual Clock Entry" : "Leave Request";
        const isExpanded = expandedId === step.id;

        return (
          <Card key={step.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : step.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{typeLabel}</CardTitle>
                </div>
                <Badge variant="outline">
                  Step {step.step_order}/{request?.total_steps}
                </Badge>
              </div>
              <CardDescription>
                From <strong>{requesterName}</strong> · {formatDate(request?.created_at)}
              </CardDescription>
            </CardHeader>

            {isExpanded && (
              <CardContent>
                <Separator className="mb-4" />
                <form action={formAction} className="space-y-4">
                  <input type="hidden" name="token" value={step.token} />

                  <div className="space-y-2">
                    <Textarea name="comment" placeholder="Add a comment (optional)..." rows={2} />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      name="decision"
                      value="approved"
                      size="sm"
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
                      size="sm"
                      className="flex-1"
                      disabled={isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
