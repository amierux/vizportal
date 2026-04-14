"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatFullName } from "@/lib/utils/format";
import { Download, Eye, Search } from "lucide-react";
import { useRouter } from "next/navigation";

type Submission = {
  id: string;
  submitted_at: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  respondent_name?: string | null;
  respondent_email?: string | null;
  data: Record<string, unknown>;
  submitter?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
};

type SubmissionsTableProps = {
  submissions: Submission[];
  formName: string;
  formId: string;
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function getRespondentName(sub: Submission): string {
  if (sub.submitter?.first_name || sub.submitter?.last_name) {
    return formatFullName(sub.submitter.first_name ?? null, sub.submitter.last_name ?? null);
  }
  if (sub.respondent_name) return sub.respondent_name;
  if (sub.respondent_email) return sub.respondent_email;
  return "Anonymous";
}

function exportToCsv(submissions: Submission[], formName: string) {
  if (!submissions.length) return;

  // Collect all keys from all submissions
  const allKeys = Array.from(
    new Set(submissions.flatMap((s) => Object.keys(s.data ?? {})))
  );

  const headers = ["Respondent", "Submitted At", "Status", ...allKeys];
  const rows = submissions.map((sub) => {
    const name = getRespondentName(sub);
    const date = sub.submitted_at ? formatDate(sub.submitted_at) : "";
    const status = sub.status;
    const dataValues = allKeys.map((k) => {
      const val = sub.data?.[k];
      if (Array.isArray(val)) return val.join(", ");
      if (typeof val === "string" && val.startsWith("data:image")) return "[Signature]";
      return String(val ?? "");
    });
    return [name, date, status, ...dataValues];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${formName.replace(/\s+/g, "_")}_submissions.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function SubmissionsTable({ submissions, formName, formId }: SubmissionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = submissions.filter((sub) => {
    if (!search) return true;
    const name = getRespondentName(sub).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search respondents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCsv(submissions, formName)}
          disabled={!submissions.length}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            {search ? "No submissions match your search." : "No submissions yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Respondent</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => {
                const statusInfo = STATUS_BADGES[sub.status] ?? STATUS_BADGES.submitted;
                const name = getRespondentName(sub);

                return (
                  <TableRow key={sub.id} className="animate-stagger">
                    <TableCell>
                      <div>
                        <p className="font-medium">{name}</p>
                        {sub.respondent_email && (
                          <p className="text-xs text-muted-foreground">{sub.respondent_email}</p>
                        )}
                        {sub.submitter?.email && (
                          <p className="text-xs text-muted-foreground">{sub.submitter.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.submitted_at ? formatDate(sub.submitted_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/forms/${formId}/submissions/${sub.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
