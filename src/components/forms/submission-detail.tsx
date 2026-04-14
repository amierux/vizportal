"use client";

import { useState, useTransition } from "react";
import { approveSubmission, rejectSubmission } from "@/lib/actions/form-submissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDate, formatFullName } from "@/lib/utils/format";
import { CheckCircle, XCircle, Download, User } from "lucide-react";

type FormField = {
  id: string;
  label: string;
  name: string;
  type: string;
};

type FormSection = {
  id: string;
  name: string;
  form_fields?: FormField[];
};

type SubmissionDetailProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submission: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  canApprove?: boolean;
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function FieldValueDisplay({ field, value }: { field: FormField; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground text-sm italic">—</span>;
  }

  // Signature: base64 image
  if (field.type === "signature" && typeof value === "string" && value.startsWith("data:image")) {
    return (
      <div className="border rounded-md p-2 bg-white inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Signature" className="max-h-24 max-w-xs" />
      </div>
    );
  }

  // File: URL
  if (field.type === "file" && typeof value === "string" && value.startsWith("http")) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:no-underline"
      >
        <Download className="h-3.5 w-3.5" />
        Download file
      </a>
    );
  }

  // Array (multi-select, checkbox)
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <Badge key={i} variant="secondary">{String(v)}</Badge>
        ))}
      </div>
    );
  }

  return <span className="text-sm">{String(value)}</span>;
}

export function SubmissionDetail({ submission, form, canApprove = false }: SubmissionDetailProps) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const statusInfo = STATUS_BADGES[submission.status] ?? STATUS_BADGES.submitted;
  const submitter = submission.submitter;
  const submitterName = submitter
    ? formatFullName(submitter.first_name, submitter.last_name)
    : submission.respondent_name ?? "Anonymous";

  const sections: FormSection[] = form?.form_sections ?? [];
  const data = submission.data ?? {};

  function handleApprove() {
    startTransition(async () => {
      const result = await approveSubmission(submission.id, comment || undefined);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Submission approved");
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectSubmission(submission.id, comment || undefined);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Submission rejected");
    });
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Submission</CardTitle>
              <CardDescription>
                {form?.name ?? "Unknown Form"} · {submission.submitted_at ? formatDate(submission.submitted_at) : "Not submitted"}
              </CardDescription>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{submitterName}</span>
            {(submitter?.email ?? submission.respondent_email) && (
              <span>· {submitter?.email ?? submission.respondent_email}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submitted Data by Section */}
      {sections.map((section) => {
        const fields = section.form_fields ?? [];
        if (!fields.length) return null;

        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {section.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field) => {
                // Try to find value by field id first, then by field name
                const value = data[field.id] !== undefined ? data[field.id] : data[field.name];

                return (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <FieldValueDisplay field={field} value={value} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* If no sections / no form definition, show raw data */}
      {sections.length === 0 && Object.keys(data).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Submitted Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{key}</Label>
                <p className="text-sm">{Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approval Actions */}
      {canApprove && submission.status === "submitted" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Decision</CardTitle>
            <CardDescription>Approve or reject this submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-1.5">
              <Label>Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the submitter..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleApprove}
                disabled={isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already decided */}
      {["approved", "rejected"].includes(submission.status) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm">
              {submission.status === "approved" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="capitalize font-medium">{submission.status}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
