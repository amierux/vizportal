"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormRenderer } from "./form-renderer";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ClipboardList, CheckCircle2, Eye, FileText } from "lucide-react";

type Assignment = {
  id: string;
  assigned_at: string;
  completed: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forms: any;
};

type MySubmission = {
  id: string;
  submitted_at: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forms: any;
};

type MyFormsListProps = {
  assignments: Assignment[];
  mySubmissions: MySubmission[];
};

const SUBMISSION_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [open, setOpen] = useState(false);
  const form = assignment.forms;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{form?.name ?? "Unnamed Form"}</CardTitle>
            {form?.description && (
              <CardDescription className="mt-0.5 line-clamp-2">{form.description}</CardDescription>
            )}
          </div>
          <Badge variant="outline" className="flex-shrink-0 text-xs">
            Assigned {formatDate(assignment.assigned_at)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "w-full")}>
            <FileText className="mr-2 h-4 w-4" />
            Fill Out
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form?.name}</DialogTitle>
            </DialogHeader>
            {form ? (
              <FormRenderer
                form={form}
                isPublic={false}
                onSubmitSuccess={() => setOpen(false)}
              />
            ) : (
              <p className="text-muted-foreground text-sm">Form not found.</p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function MyFormsList({ assignments, mySubmissions }: MyFormsListProps) {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Pending Assignments */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Pending Forms</h2>
          {assignments.length > 0 && (
            <Badge variant="secondary">{assignments.length}</Badge>
          )}
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No pending forms assigned to you.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger">
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}
      </section>

      {/* My Submissions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">My Submissions</h2>
          {mySubmissions.length > 0 && (
            <Badge variant="secondary">{mySubmissions.length}</Badge>
          )}
        </div>

        {mySubmissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No submissions yet</p>
              <p className="text-xs text-muted-foreground">Your submitted forms will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mySubmissions.map((sub) => {
                  const statusInfo = SUBMISSION_STATUS[sub.status] ?? SUBMISSION_STATUS.submitted;
                  const form = sub.forms;

                  return (
                    <TableRow key={sub.id} className="animate-stagger">
                      <TableCell>
                        <span className="font-medium">{form?.name ?? "Unnamed Form"}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.submitted_at ? formatDate(sub.submitted_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
