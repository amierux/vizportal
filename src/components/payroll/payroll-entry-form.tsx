"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updatePayrollEntry, addPayrollCustomDeduction, removePayrollCustomDeduction } from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { formatPeso } from "@/lib/utils/payroll";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PayrollEntryFormProps = { entry: any };

function NumericField({
  label,
  name,
  defaultValue,
  readOnly = false,
  isPeso = false,
}: {
  label: string;
  name: string;
  defaultValue: number | null | undefined;
  readOnly?: boolean;
  isPeso?: boolean;
}) {
  const value = defaultValue ?? 0;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {isPeso && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            ₱
          </span>
        )}
        <Input
          name={name}
          type="number"
          step="0.01"
          defaultValue={value}
          readOnly={readOnly}
          className={`${isPeso ? "pl-7" : ""} ${readOnly ? "bg-muted text-muted-foreground" : ""}`}
        />
      </div>
    </div>
  );
}

export function PayrollEntryForm({ entry }: PayrollEntryFormProps) {
  const [state, formAction, isPending] = useActionState(updatePayrollEntry, null);
  const [addState, addFormAction, isAddPending] = useActionState(
    addPayrollCustomDeduction,
    null
  );
  const [removePending, startRemoveTransition] = useTransition();
  const [customType, setCustomType] = useState<string>("deduction");

  const customDeductions: {
    id: string;
    name: string;
    type: string;
    amount: number;
  }[] = entry.payroll_custom_deductions ?? [];

  useEffect(() => {
    if (state && "success" in state) toast.success("Entry updated");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (addState && "success" in addState) toast.success("Custom deduction added");
    if (addState && "error" in addState) toast.error(addState.error);
  }, [addState]);

  function handleRemove(deductionId: string) {
    startRemoveTransition(async () => {
      const result = await removePayrollCustomDeduction(deductionId, entry.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Deduction removed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Main update form */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="_entryId" value={entry.id} />

        {/* Attendance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Attendance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumericField label="Days Worked" name="days_worked" defaultValue={entry.days_worked} />
            <NumericField label="Days Absent" name="days_absent" defaultValue={entry.days_absent} />
            <NumericField label="Days Late" name="days_late" defaultValue={entry.days_late} />
            <NumericField
              label="Late (minutes)"
              name="late_minutes_total"
              defaultValue={entry.late_minutes_total}
            />
            <NumericField
              label="Undertime (minutes)"
              name="undertime_minutes_total"
              defaultValue={entry.undertime_minutes_total}
            />
          </CardContent>
        </Card>

        {/* Leave */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Leave</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumericField label="Paid Leave Days" name="paid_leave_days" defaultValue={entry.paid_leave_days} />
            <NumericField
              label="Unpaid Leave Days"
              name="unpaid_leave_days"
              defaultValue={entry.unpaid_leave_days}
            />
          </CardContent>
        </Card>

        {/* Overtime */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overtime</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumericField
              label="OT Regular Hours"
              name="ot_regular_hours"
              defaultValue={entry.ot_regular_hours}
            />
            <NumericField
              label="OT Rest Day Hours"
              name="ot_rest_day_hours"
              defaultValue={entry.ot_rest_day_hours}
            />
            <NumericField
              label="OT Holiday Hours"
              name="ot_holiday_hours"
              defaultValue={entry.ot_holiday_hours}
            />
          </CardContent>
        </Card>

        {/* Earnings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Earnings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumericField
              label="Basic Pay"
              name="basic_pay"
              defaultValue={entry.basic_pay}
              isPeso
            />
            <NumericField
              label="OT Pay"
              name="ot_pay"
              defaultValue={entry.ot_pay}
              isPeso
            />
            <NumericField
              label="Holiday Pay"
              name="holiday_pay"
              defaultValue={entry.holiday_pay}
              isPeso
            />
          </CardContent>
        </Card>

        {/* Attendance Deductions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Deductions from Attendance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumericField
              label="Late Deduction"
              name="late_deduction"
              defaultValue={entry.late_deduction}
              isPeso
            />
            <NumericField
              label="Undertime Deduction"
              name="undertime_deduction"
              defaultValue={entry.undertime_deduction}
              isPeso
            />
            <NumericField
              label="Absent Deduction"
              name="absent_deduction"
              defaultValue={entry.absent_deduction}
              isPeso
            />
            <NumericField
              label="Unpaid Leave Deduction"
              name="unpaid_leave_deduction"
              defaultValue={entry.unpaid_leave_deduction}
              isPeso
            />
          </CardContent>
        </Card>

        {/* Gross Pay */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Gross Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <NumericField
              label="Gross Pay"
              name="gross_pay"
              defaultValue={entry.gross_pay}
              isPeso
            />
          </CardContent>
        </Card>

        {/* Statutory Deductions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Statutory Deductions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumericField
              label="SSS Contribution"
              name="sss_contribution"
              defaultValue={entry.sss_contribution}
              isPeso
            />
            <NumericField
              label="PhilHealth"
              name="philhealth_contribution"
              defaultValue={entry.philhealth_contribution}
              isPeso
            />
            <NumericField
              label="Pag-IBIG"
              name="pagibig_contribution"
              defaultValue={entry.pagibig_contribution}
              isPeso
            />
            <NumericField
              label="Withholding Tax"
              name="withholding_tax"
              defaultValue={entry.withholding_tax}
              isPeso
            />
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Totals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumericField
              label="Total Deductions"
              name="total_deductions"
              defaultValue={entry.total_deductions}
              isPeso
            />
            <NumericField
              label="Net Pay"
              name="net_pay"
              defaultValue={entry.net_pay}
              isPeso
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>

      <Separator />

      {/* Custom Deductions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Custom Deductions / Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing custom deductions */}
          {customDeductions.length > 0 && (
            <div className="space-y-2">
              {customDeductions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{d.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      ({d.type})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        d.type === "adjustment"
                          ? "text-green-600 font-mono"
                          : "text-destructive font-mono"
                      }
                    >
                      {d.type === "adjustment" ? "+" : "−"} {formatPeso(d.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removePending}
                      onClick={() => handleRemove(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new custom deduction */}
          <form action={addFormAction} className="space-y-3">
            <input type="hidden" name="_entryId" value={entry.id} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input name="name" placeholder="e.g. Loan Repayment" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  name="type"
                  value={customType}
                  onValueChange={(v) => setCustomType(v ?? "deduction")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deduction">Deduction</SelectItem>
                    <SelectItem value="adjustment">Adjustment (add)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₱
                </span>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isAddPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAddPending ? "Adding..." : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
