"use client";

import { formatPeso } from "@/lib/utils/payroll";
import { formatDate } from "@/lib/utils/format";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PayslipDetailProps = { entry: any };

export function PayslipDetail({ entry }: PayslipDetailProps) {
  const period = entry.payroll_periods ?? {};
  const profile = entry.profiles ?? {};
  const details = profile.employee_details ?? {};
  const customDeductions: { id: string; name: string; type: string; amount: number }[] =
    entry.payroll_custom_deductions ?? [];

  function downloadPdf() {
    const deductionRows = [
      ["Late Deduction", entry.late_deduction],
      ["Undertime Deduction", entry.undertime_deduction],
      ["Absent Deduction", entry.absent_deduction],
      ["Unpaid Leave Deduction", entry.unpaid_leave_deduction],
      ["SSS Contribution", entry.sss_contribution],
      ["PhilHealth Contribution", entry.philhealth_contribution],
      ["Pag-IBIG Contribution", entry.pagibig_contribution],
      ["Withholding Tax", entry.withholding_tax],
      ...customDeductions.map((d) => [
        `${d.name} (${d.type === "adjustment" ? "Adjustment" : "Deduction"})`,
        d.type === "adjustment" ? -d.amount : d.amount,
      ]),
    ]
      .filter(([, v]) => Number(v) !== 0)
      .map(
        ([label, val]) =>
          `<tr><td>${label}</td><td style="text-align:right">${formatPeso(Number(val))}</td></tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Payslip</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: normal; color: #555; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; border-bottom: 2px solid #333; padding: 4px 8px; }
  td { padding: 4px 8px; border-bottom: 1px solid #eee; }
  .section-header { font-weight: bold; background: #f5f5f5; }
  .total-row td { font-weight: bold; border-top: 2px solid #333; }
  .net-pay { font-size: 18px; font-weight: bold; color: #1a1a1a; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; }
  .info-item label { font-size: 11px; color: #888; display: block; }
  .info-item span { font-weight: 500; }
</style>
</head><body>
<h1>VizServe Inc. — Payslip</h1>
<h2>Pay Period: ${formatDate(period.start_date)} – ${formatDate(period.end_date)} | Pay Date: ${formatDate(period.pay_date)}</h2>
<div class="info-grid">
  <div class="info-item"><label>Employee</label><span>${profile.first_name ?? ""} ${profile.last_name ?? ""}</span></div>
  <div class="info-item"><label>Department</label><span>${details?.departments?.name ?? details?.department_id ?? "—"}</span></div>
  <div class="info-item"><label>Bank</label><span>${details?.bank_name ?? "—"}</span></div>
  <div class="info-item"><label>Account</label><span>${details?.bank_account_number ?? "—"}</span></div>
</div>
<table>
  <thead><tr><th>Earnings</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td>Basic Pay</td><td style="text-align:right">${formatPeso(entry.basic_pay ?? 0)}</td></tr>
    ${Number(entry.ot_pay) > 0 ? `<tr><td>Overtime Pay</td><td style="text-align:right">${formatPeso(entry.ot_pay)}</td></tr>` : ""}
    ${Number(entry.holiday_pay) > 0 ? `<tr><td>Holiday Pay</td><td style="text-align:right">${formatPeso(entry.holiday_pay)}</td></tr>` : ""}
    <tr class="total-row"><td>Gross Pay</td><td style="text-align:right">${formatPeso(entry.gross_pay ?? 0)}</td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th>Deductions</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    ${deductionRows}
    <tr class="total-row"><td>Total Deductions</td><td style="text-align:right">${formatPeso(entry.total_deductions ?? 0)}</td></tr>
  </tbody>
</table>
<table>
  <tbody>
    <tr><td class="net-pay">NET PAY</td><td class="net-pay" style="text-align:right">${formatPeso(entry.net_pay ?? 0)}</td></tr>
  </tbody>
</table>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  const customDeductionTotal = customDeductions.reduce(
    (sum, d) => sum + (d.type === "adjustment" ? -d.amount : d.amount),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Pay Period</p>
          <p className="font-medium">
            {formatDate(period.start_date)} – {formatDate(period.end_date)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Pay Date</p>
          <p className="font-medium">{formatDate(period.pay_date)}</p>
        </div>
      </div>

      <Separator />

      {/* Earnings */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Earnings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Basic Pay</span>
            <span>{formatPeso(entry.basic_pay ?? 0)}</span>
          </div>
          {Number(entry.ot_pay) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overtime Pay</span>
              <span>{formatPeso(entry.ot_pay)}</span>
            </div>
          )}
          {Number(entry.holiday_pay) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Holiday Pay</span>
              <span>{formatPeso(entry.holiday_pay)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Gross Pay</span>
            <span>{formatPeso(entry.gross_pay ?? 0)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Deductions */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Deductions</h3>
        <div className="space-y-2 text-sm">
          {Number(entry.late_deduction) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Late</span>
              <span className="text-destructive">− {formatPeso(entry.late_deduction)}</span>
            </div>
          )}
          {Number(entry.undertime_deduction) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Undertime</span>
              <span className="text-destructive">− {formatPeso(entry.undertime_deduction)}</span>
            </div>
          )}
          {Number(entry.absent_deduction) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Absent</span>
              <span className="text-destructive">− {formatPeso(entry.absent_deduction)}</span>
            </div>
          )}
          {Number(entry.unpaid_leave_deduction) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unpaid Leave</span>
              <span className="text-destructive">− {formatPeso(entry.unpaid_leave_deduction)}</span>
            </div>
          )}
          {Number(entry.sss_contribution) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">SSS</span>
              <span className="text-destructive">− {formatPeso(entry.sss_contribution)}</span>
            </div>
          )}
          {Number(entry.philhealth_contribution) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">PhilHealth</span>
              <span className="text-destructive">− {formatPeso(entry.philhealth_contribution)}</span>
            </div>
          )}
          {Number(entry.pagibig_contribution) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pag-IBIG</span>
              <span className="text-destructive">− {formatPeso(entry.pagibig_contribution)}</span>
            </div>
          )}
          {Number(entry.withholding_tax) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Withholding Tax</span>
              <span className="text-destructive">− {formatPeso(entry.withholding_tax)}</span>
            </div>
          )}
          {customDeductions.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-1 font-medium">Custom</p>
              {customDeductions.map((d) => (
                <div key={d.id} className="flex justify-between">
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className={d.type === "adjustment" ? "text-green-600" : "text-destructive"}>
                    {d.type === "adjustment" ? "+" : "−"} {formatPeso(d.amount)}
                  </span>
                </div>
              ))}
            </>
          )}
          {customDeductionTotal !== 0 && customDeductions.length === 0 && null}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total Deductions</span>
            <span className="text-destructive">− {formatPeso(entry.total_deductions ?? 0)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Net Pay */}
      <div className="rounded-lg bg-muted px-4 py-3 flex justify-between items-center">
        <span className="font-bold text-base">Net Pay</span>
        <span className="font-bold text-xl">{formatPeso(entry.net_pay ?? 0)}</span>
      </div>

      <Button variant="outline" onClick={downloadPdf} className="w-full">
        <Printer className="mr-2 h-4 w-4" />
        Print / Download Payslip
      </Button>
    </div>
  );
}
