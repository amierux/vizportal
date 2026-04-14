"use client";

import { useActionState, useEffect, useState } from "react";
import { updatePayrollSettings } from "@/lib/actions/payroll-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CalendarDays, Settings2 } from "lucide-react";
import type { PayrollSettings } from "@/types";

type PayrollSettingsFormProps = {
  settings: PayrollSettings | null;
};

export function PayrollSettingsForm({ settings }: PayrollSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updatePayrollSettings, null);
  const [scheduleType, setScheduleType] = useState(settings?.schedule_type ?? "semi_monthly");

  // Controlled state for toggles (needed to submit as hidden inputs)
  const [isEnabled, setIsEnabled] = useState(settings?.is_enabled ?? true);
  const [enableLate, setEnableLate] = useState(settings?.enable_late_deduction ?? true);
  const [enableUndertime, setEnableUndertime] = useState(settings?.enable_undertime_deduction ?? true);
  const [enableAbsent, setEnableAbsent] = useState(settings?.enable_absent_deduction ?? true);

  useEffect(() => {
    if (state && "success" in state) toast.success("Payroll settings saved");
    if (state && "error" in state) toast.error(state.error as string);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden inputs for boolean values */}
      <input type="hidden" name="is_enabled" value={isEnabled ? "true" : "false"} />
      <input type="hidden" name="enable_late_deduction" value={enableLate ? "true" : "false"} />
      <input type="hidden" name="enable_undertime_deduction" value={enableUndertime ? "true" : "false"} />
      <input type="hidden" name="enable_absent_deduction" value={enableAbsent ? "true" : "false"} />

      {/* Schedule Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <CardTitle className="text-base">Pay Schedule</CardTitle>
          </div>
          <CardDescription>
            Configure how often payroll is processed and when employees are paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule_type">Schedule Type</Label>
            <Select
              name="schedule_type"
              defaultValue={scheduleType}
              onValueChange={setScheduleType}
            >
              <SelectTrigger id="schedule_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="semi_monthly">Semi-Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay_day_1">
                {scheduleType === "semi_monthly" ? "Pay Day 1" : "Pay Day"}
              </Label>
              <Input
                id="pay_day_1"
                name="pay_day_1"
                type="number"
                min="1"
                max="31"
                defaultValue={settings?.pay_day_1 ?? 15}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">Day of the month (1–31)</p>
            </div>

            {scheduleType === "semi_monthly" && (
              <div className="space-y-2">
                <Label htmlFor="pay_day_2">Pay Day 2</Label>
                <Input
                  id="pay_day_2"
                  name="pay_day_2"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={settings?.pay_day_2 ?? 30}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">Second pay day of the month</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cutoff_days_before">Cutoff Days Before Pay Day</Label>
            <Input
              id="cutoff_days_before"
              name="cutoff_days_before"
              type="number"
              min="1"
              max="15"
              defaultValue={settings?.cutoff_days_before ?? 5}
              placeholder="5"
              className="max-w-[160px]"
            />
            <p className="text-xs text-muted-foreground">
              How many days before the pay day the cutoff period ends.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Processing Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll Processing</CardTitle>
          <CardDescription>
            Enable or disable payroll processing for this company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable Payroll</p>
              <p className="text-xs text-muted-foreground">
                When disabled, payroll periods cannot be created or processed.
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Computation Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            <CardTitle className="text-base">Computation Rules</CardTitle>
          </div>
          <CardDescription>
            Configure deduction rules and overtime multipliers for payroll computation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deduction Toggles */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Automatic Deductions</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Late Deduction</p>
                <p className="text-xs text-muted-foreground">Deduct pay for late arrivals</p>
              </div>
              <Switch checked={enableLate} onCheckedChange={setEnableLate} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Undertime Deduction</p>
                <p className="text-xs text-muted-foreground">Deduct pay for early departures</p>
              </div>
              <Switch checked={enableUndertime} onCheckedChange={setEnableUndertime} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Absent Deduction</p>
                <p className="text-xs text-muted-foreground">Deduct pay for unexcused absences</p>
              </div>
              <Switch checked={enableAbsent} onCheckedChange={setEnableAbsent} />
            </div>
          </div>

          {/* OT Multipliers */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Overtime Multipliers</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ot_regular_multiplier">Regular OT</Label>
                <Input
                  id="ot_regular_multiplier"
                  name="ot_regular_multiplier"
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  defaultValue={settings?.ot_regular_multiplier ?? 1.25}
                />
                <p className="text-xs text-muted-foreground">e.g. 1.25 = 125%</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ot_rest_day_multiplier">Rest Day OT</Label>
                <Input
                  id="ot_rest_day_multiplier"
                  name="ot_rest_day_multiplier"
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  defaultValue={settings?.ot_rest_day_multiplier ?? 1.30}
                />
                <p className="text-xs text-muted-foreground">e.g. 1.30 = 130%</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ot_holiday_multiplier">Holiday OT</Label>
                <Input
                  id="ot_holiday_multiplier"
                  name="ot_holiday_multiplier"
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  defaultValue={settings?.ot_holiday_multiplier ?? 2.00}
                />
                <p className="text-xs text-muted-foreground">e.g. 2.00 = 200%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Payroll Settings"}
      </Button>
    </form>
  );
}
