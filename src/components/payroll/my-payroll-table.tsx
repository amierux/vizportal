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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PayslipDetail } from "@/components/payroll/payslip-detail";
import { formatPeso } from "@/lib/utils/payroll";
import { formatDate } from "@/lib/utils/format";
import { Eye } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MyPayrollTableProps = { entries: any[] };

export function MyPayrollTable({ entries }: MyPayrollTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No payroll records found.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Pay Date</TableHead>
            <TableHead className="text-right">Gross Pay</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net Pay</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bank</TableHead>
            <TableHead className="text-right">Payslip</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {entries.map((entry: any) => {
            const period = entry.payroll_periods ?? {};
            return (
              <TableRow key={entry.id} className="row-hover">
                <TableCell className="text-sm">
                  {formatDate(period.start_date)} – {formatDate(period.end_date)}
                </TableCell>
                <TableCell>{formatDate(period.pay_date)}</TableCell>
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
                  <Badge variant={entry.status === "finalized" ? "default" : "outline"}>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {selectedEntry && <PayslipDetail entry={selectedEntry} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
