"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { finalizePayroll, bulkMarkCredited } from "@/lib/actions/payroll";
import { formatPeso } from "@/lib/utils/payroll";
import { formatFullName } from "@/lib/utils/format";
import {
  CheckCircle2,
  XCircle,
  Pencil,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmployeeReadinessTableProps = { entries: any[]; periodId: string };

function ReadinessIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );
}

export function EmployeeReadinessTable({
  entries,
  periodId,
}: EmployeeReadinessTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleFinalize() {
    startTransition(async () => {
      const result = await finalizePayroll(periodId);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Payroll finalized successfully");
      }
    });
  }

  function handleBulkCredited() {
    startTransition(async () => {
      const result = await bulkMarkCredited(periodId);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("All entries marked as credited");
      }
    });
  }

  function exportCsv() {
    const headers = [
      "Employee",
      "Department",
      "Salary Ready",
      "Schedule Ready",
      "Bank Ready",
      "Net Pay",
    ];
    const rows = entries.map((e) => {
      const details = e.profiles?.employee_details ?? {};
      const hasSalary = !!details.salary;
      const hasSchedule = Array.isArray(details.employee_schedules)
        ? details.employee_schedules.length > 0
        : false;
      const hasBank = !!details.bank_account_number;
      return [
        formatFullName(e.profiles?.first_name, e.profiles?.last_name),
        details?.departments?.name ?? "",
        hasSalary ? "Yes" : "No",
        hasSchedule ? "Yes" : "No",
        hasBank ? "Yes" : "No",
        e.net_pay ?? 0,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll-readiness.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const headers = ["Employee", "Department", "Salary", "Schedule", "Bank", "Net Pay"];
    const rows = entries
      .map((e) => {
        const details = e.profiles?.employee_details ?? {};
        const hasSalary = !!details.salary;
        const hasSchedule = Array.isArray(details.employee_schedules)
          ? details.employee_schedules.length > 0
          : false;
        const hasBank = !!details.bank_account_number;
        return `<tr>
          <td>${formatFullName(e.profiles?.first_name, e.profiles?.last_name)}</td>
          <td>${details?.departments?.name ?? "—"}</td>
          <td>${hasSalary ? "✓" : "✗"}</td>
          <td>${hasSchedule ? "✓" : "✗"}</td>
          <td>${hasBank ? "✓" : "✗"}</td>
          <td>${formatPeso(e.net_pay ?? 0)}</td>
        </tr>`;
      })
      .join("");

    const html = `<html><head><title>Payroll Readiness</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Payroll Readiness</h2>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  const allReady = entries.every((e) => {
    const d = e.profiles?.employee_details ?? {};
    const hasSchedule = Array.isArray(d.employee_schedules)
      ? d.employee_schedules.length > 0
      : false;
    return !!d.salary && hasSchedule && !!d.bank_account_number;
  });

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {entries.length} employee{entries.length !== 1 ? "s" : ""} in this
          period
          {!allReady && (
            <span className="ml-2 text-destructive font-medium">
              — Some employees are not ready
            </span>
          )}
        </p>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleBulkCredited}
          >
            Mark All Credited
          </Button>
          <Button
            size="sm"
            disabled={isPending || !allReady}
            onClick={handleFinalize}
          >
            {isPending ? "Processing..." : "Finalize Payroll"}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-center">Salary</TableHead>
            <TableHead className="text-center">Schedule</TableHead>
            <TableHead className="text-center">Bank</TableHead>
            <TableHead className="text-right">Net Pay</TableHead>
            <TableHead className="text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {entries.map((entry: any) => {
            const details = entry.profiles?.employee_details ?? {};
            const hasSalary = !!details.salary;
            const hasSchedule = Array.isArray(details.employee_schedules)
              ? details.employee_schedules.length > 0
              : false;
            const hasBank = !!details.bank_account_number;

            return (
              <TableRow key={entry.id} className="row-hover">
                <TableCell>
                  {formatFullName(
                    entry.profiles?.first_name,
                    entry.profiles?.last_name
                  )}
                </TableCell>
                <TableCell>
                  {details?.departments?.name ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <ReadinessIcon ok={hasSalary} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <ReadinessIcon ok={hasSchedule} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <ReadinessIcon ok={hasBank} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {entry.net_pay != null ? formatPeso(entry.net_pay) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/payroll/process/${entry.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
