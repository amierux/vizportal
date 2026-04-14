"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecordsFilterBar } from "@/components/shared/records-filter-bar";
import { PayslipDetail } from "@/components/payroll/payslip-detail";
import { markBankCredited } from "@/lib/actions/payroll";
import { formatPeso } from "@/lib/utils/payroll";
import { formatDate, formatFullName } from "@/lib/utils/format";
import { Eye, CreditCard } from "lucide-react";
import { toast } from "sonner";

type Department = { id: string; name: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AllPayrollTableProps = { entries: any[]; departments: Department[] };

export function AllPayrollTable({ entries, departments }: AllPayrollTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [filtered, setFiltered] = useState(entries);
  const [isPending, startTransition] = useTransition();

  function handleFilter(filters: {
    startDate: string;
    endDate: string;
    search: string;
    departmentId: string;
  }) {
    let result = entries;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((e) => {
        const name = formatFullName(
          e.profiles?.first_name,
          e.profiles?.last_name
        ).toLowerCase();
        return name.includes(q);
      });
    }
    if (filters.departmentId && filters.departmentId !== "all") {
      result = result.filter(
        (e) =>
          e.profiles?.employee_details?.department_id === filters.departmentId
      );
    }
    setFiltered(result);
  }

  function exportCsv() {
    const headers = [
      "Employee",
      "Department",
      "Gross Pay",
      "Deductions",
      "Net Pay",
      "Status",
      "Bank",
    ];
    const rows = filtered.map((e) =>
      [
        formatFullName(e.profiles?.first_name, e.profiles?.last_name),
        e.profiles?.employee_details?.departments?.name ?? "",
        e.gross_pay ?? 0,
        e.total_deductions ?? 0,
        e.net_pay ?? 0,
        e.status,
        e.bank_credited ? "Credited" : "Pending",
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll-all-members.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const headers = [
      "Employee",
      "Department",
      "Gross Pay",
      "Deductions",
      "Net Pay",
      "Status",
      "Bank",
    ];
    const rows = filtered
      .map(
        (e) =>
          `<tr>
        <td>${formatFullName(e.profiles?.first_name, e.profiles?.last_name)}</td>
        <td>${e.profiles?.employee_details?.departments?.name ?? "—"}</td>
        <td>${formatPeso(e.gross_pay ?? 0)}</td>
        <td>${formatPeso(e.total_deductions ?? 0)}</td>
        <td>${formatPeso(e.net_pay ?? 0)}</td>
        <td>${e.status}</td>
        <td>${e.bank_credited ? "Credited" : "Pending"}</td>
      </tr>`
      )
      .join("");

    const html = `<html><head><title>Payroll — All Members</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}</style>
      </head><body><h2>Payroll — All Members</h2>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  function handleMarkCredited(entryId: string) {
    startTransition(async () => {
      const result = await markBankCredited(entryId);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Marked as credited");
      }
    });
  }

  return (
    <>
      <div className="space-y-4">
        <RecordsFilterBar
          departments={departments}
          onFilter={handleFilter}
          onExportCsv={exportCsv}
          onExportPdf={exportPdf}
          showDepartmentFilter
          showNameSearch
        />

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No payroll entries found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Pay Date</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {filtered.map((entry: any) => (
                <TableRow key={entry.id} className="row-hover">
                  <TableCell>
                    {formatFullName(
                      entry.profiles?.first_name,
                      entry.profiles?.last_name
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.profiles?.employee_details?.departments?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {formatDate(entry.payroll_periods?.pay_date ?? entry.pay_date)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPeso(entry.gross_pay ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-destructive">
                    − {formatPeso(entry.total_deductions ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {formatPeso(entry.net_pay ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "finalized" ? "default" : "outline"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={entry.bank_credited ? "default" : "secondary"}
                      className={entry.bank_credited ? "bg-green-600" : ""}
                    >
                      {entry.bank_credited ? "Credited" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!entry.bank_credited && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleMarkCredited(entry.id)}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payslip —{" "}
              {formatFullName(
                selectedEntry?.profiles?.first_name,
                selectedEntry?.profiles?.last_name
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && <PayslipDetail entry={selectedEntry} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
