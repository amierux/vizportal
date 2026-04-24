"use client";

import { formatPeso } from "@/lib/utils/payroll";

type PayrollData = {
  grossPay: number;
  netPay: number;
  periodStart: string;
  periodEnd: string;
} | null;

type Props = {
  data: PayrollData;
};

export function PayrollSummaryWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Latest Payroll</p>
      </div>
      <div>
        {!data ? (
          <p className="text-sm text-muted-foreground">No payroll yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Period: {data.periodStart} to {data.periodEnd}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross Pay</span>
              <span className="font-medium">{formatPeso(data.grossPay)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Pay</span>
              <span className="text-lg font-bold text-green-600">{formatPeso(data.netPay)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
