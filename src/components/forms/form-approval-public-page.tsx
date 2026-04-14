"use client";

import { useActionState, useEffect } from "react";
import { processFormApprovalByToken } from "@/lib/actions/form-submissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormApprovalPublicPage({ step, token }: { step: any; token: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      const decision = formData.get("decision") as "approved" | "rejected";
      const comment = (formData.get("comment") as string) || null;
      return await processFormApprovalByToken(token, decision, comment);
    },
    null
  );

  // Derive decided state from step status or successful action result
  const decided =
    step.status !== "pending" ||
    (state !== null && typeof state === "object" && "success" in state);

  useEffect(() => {
    if (state && typeof state === "object" && "error" in state) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((state as any).error);
    }
    if (state && typeof state === "object" && "success" in state) {
      toast.success("Decision recorded");
    }
  }, [state]);

  const submission = step.form_submission_approvals?.form_submissions;
  const form = submission?.forms;

  if (decided) {
    return (
      <Card>
        <CardHeader className="text-center">
          {step.status === "approved" || (state && "success" in (state as object)) ? (
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
          )}
          <CardTitle>Thank you</CardTitle>
          <CardDescription>Your decision has been recorded.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Approval Required</CardTitle>
        <CardDescription>
          Please review the submission below and approve or reject.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="font-medium">{form?.name}</p>
          {form?.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
          {submission?.respondent_name && (
            <p className="text-sm">Submitted by: {submission.respondent_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Submitted Data</Label>
          <div className="rounded border p-3 text-sm space-y-2 max-h-64 overflow-auto">
            {form?.form_sections
              ?.flatMap((s: { form_fields: { id: string; label: string }[] }) => s.form_fields)
              .map((f: { id: string; label: string }) => (
                <div key={f.id}>
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div>{String(submission?.data?.[f.id] ?? "—")}</div>
                </div>
              ))}
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea id="comment" name="comment" rows={3} />
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
