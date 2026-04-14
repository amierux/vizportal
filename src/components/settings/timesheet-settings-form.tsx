"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateTimesheetSettings } from "@/lib/actions/timesheet-settings";
import { Plus, Trash2 } from "lucide-react";

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const ROLE_OPTIONS = [
  { value: "team_leader", label: "Team Leader" },
  { value: "dept_manager", label: "Department Manager" },
  { value: "business_manager", label: "Business Manager" },
  { value: "director", label: "Director" },
];

type Step = { role: string; is_optional: boolean };

type TimesheetSettings = {
  reminder_email_addresses?: string[];
  submission_deadline_day?: string;
  is_approval_enabled?: boolean;
} | null;

type ApprovalConfig = {
  timesheet_approval_steps?: { role: string; is_optional: boolean; step_order: number }[];
} | null;

type Props = {
  settings: TimesheetSettings;
  approvalConfig: ApprovalConfig;
};

export function TimesheetSettingsForm({ settings, approvalConfig }: Props) {
  const [state, formAction, isPending] = useActionState(updateTimesheetSettings, null);

  const [isApprovalEnabled, setIsApprovalEnabled] = useState(
    settings?.is_approval_enabled ?? true
  );
  const [deadlineDay, setDeadlineDay] = useState(
    settings?.submission_deadline_day ?? "monday"
  );
  const [steps, setSteps] = useState<Step[]>(
    approvalConfig?.timesheet_approval_steps
      ?.sort((a, b) => a.step_order - b.step_order)
      .map((s) => ({ role: s.role, is_optional: s.is_optional })) ??
    [{ role: "team_leader", is_optional: false }]
  );

  const emailsDefault = (settings?.reminder_email_addresses ?? []).join(", ");

  useEffect(() => {
    if (state && "success" in state) toast.success("Timesheet settings saved");
    if (state && "error" in state) toast.error(state.error as string);
  }, [state]);

  function addStep() {
    setSteps((prev) => [...prev, { role: "team_leader", is_optional: false }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: keyof Step, value: string | boolean | null) {
    if (value === null) return;
    setSteps((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden inputs for non-text fields */}
      <input type="hidden" name="submission_deadline_day" value={deadlineDay} />
      <input type="hidden" name="is_approval_enabled" value={String(isApprovalEnabled)} />
      <input type="hidden" name="_steps" value={JSON.stringify(steps)} />

      {/* Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder Emails</CardTitle>
          <CardDescription>
            Recipients for the weekly non-compliance report. Separate with commas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            name="reminder_email_addresses"
            defaultValue={emailsDefault}
            placeholder="hr@vizserve.com, manager@vizserve.com"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Deadline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Deadline</CardTitle>
          <CardDescription>
            Day of the week by which timesheets must be submitted for the previous week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={deadlineDay} onValueChange={(v) => { if (v) setDeadlineDay(v); }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timesheet Approval</CardTitle>
          <CardDescription>
            Require manager approval before timesheets are finalized.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="ts-approval"
              checked={isApprovalEnabled}
              onCheckedChange={setIsApprovalEnabled}
            />
            <Label htmlFor="ts-approval">Enable approval workflow</Label>
          </div>

          {isApprovalEnabled && (
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium">Approval Chain</Label>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <Select
                    value={step.role}
                    onValueChange={(v) => updateStep(i, "role", v ?? "team_leader")}
                  >
                    <SelectTrigger className="w-48 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5 ml-1">
                    <Switch
                      id={`optional-${i}`}
                      checked={step.is_optional}
                      onCheckedChange={(v) => updateStep(i, "is_optional", v)}
                      className="scale-75"
                    />
                    <Label htmlFor={`optional-${i}`} className="text-xs text-muted-foreground cursor-pointer">
                      Optional
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeStep(i)}
                    disabled={steps.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="mt-1">
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
