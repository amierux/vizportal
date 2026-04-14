"use client";

import { useActionState, useEffect, useState } from "react";
import { updateFormSettings } from "@/lib/actions/form-builder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Copy, Globe, GripVertical } from "lucide-react";

type ApprovalStep = {
  step_order: number;
  role: string;
  is_optional: boolean;
};

type FormSettingsPanelProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workspaceLists: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  departments: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any[];
};

const AVAILABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

export function FormSettingsPanel({ form, workspaceLists, departments, profiles }: FormSettingsPanelProps) {
  const [state, formAction, isPending] = useActionState(updateFormSettings, null);

  // Approval
  const [approvalEnabled, setApprovalEnabled] = useState(form.approval_enabled ?? false);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>(
    form.form_approval_configs?.form_approval_steps ?? []
  );
  const [newRole, setNewRole] = useState("");

  // Save to list
  const [saveToListEnabled, setSaveToListEnabled] = useState(form.save_to_list_enabled ?? false);
  const [targetListId, setTargetListId] = useState(form.target_list_id ?? "");

  // Public link
  const [isPublic, setIsPublic] = useState(form.is_public ?? false);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/forms/public/${form.public_token}`
      : `/forms/public/${form.public_token}`;

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(form.schedule_enabled ?? false);
  const [scheduleCron, setScheduleCron] = useState(form.schedule_cron ?? "");
  const [scheduleTarget, setScheduleTarget] = useState(form.schedule_target ?? "all_employees");
  const [scheduleTargetIds, setScheduleTargetIds] = useState<string[]>(
    form.schedule_target_ids ?? []
  );

  useEffect(() => {
    if (state && "success" in state) toast.success("Settings saved");
    if (state && "error" in state) toast.error((state as { error: string }).error);
  }, [state]);

  function addApprovalStep() {
    if (!newRole) return;
    const step: ApprovalStep = {
      step_order: approvalSteps.length + 1,
      role: newRole,
      is_optional: false,
    };
    setApprovalSteps([...approvalSteps, step]);
    setNewRole("");
  }

  function removeApprovalStep(index: number) {
    const updated = approvalSteps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, step_order: i + 1 }));
    setApprovalSteps(updated);
  }

  function toggleScheduleTargetId(id: string) {
    setScheduleTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-fade-in-up">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="form_id" value={form.id} />
        <input type="hidden" name="approval_enabled" value={String(approvalEnabled)} />
        <input type="hidden" name="approval_steps" value={JSON.stringify(approvalSteps)} />
        <input type="hidden" name="save_to_list_enabled" value={String(saveToListEnabled)} />
        <input type="hidden" name="target_list_id" value={targetListId} />
        <input type="hidden" name="is_public" value={String(isPublic)} />
        <input type="hidden" name="schedule_enabled" value={String(scheduleEnabled)} />
        <input type="hidden" name="schedule_cron" value={scheduleCron} />
        <input type="hidden" name="schedule_target" value={scheduleTarget} />
        <input
          type="hidden"
          name="schedule_target_ids"
          value={JSON.stringify(scheduleTargetIds)}
        />

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
            <CardDescription>Name and description visible to respondents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" defaultValue={form.name} required placeholder="Form name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={form.description ?? ""}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Approval */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Approval Workflow</CardTitle>
                <CardDescription>Require approvals before a submission is accepted.</CardDescription>
              </div>
              <Switch checked={approvalEnabled} onCheckedChange={setApprovalEnabled} />
            </div>
          </CardHeader>
          {approvalEnabled && (
            <CardContent className="space-y-3">
              <Label className="text-sm">Approval Chain</Label>
              {approvalSteps.length === 0 && (
                <p className="text-sm text-muted-foreground">No steps configured.</p>
              )}
              <div className="space-y-2">
                {approvalSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">Step {step.step_order}</Badge>
                    <span className="flex-1 text-sm capitalize">{step.role}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeApprovalStep(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Select value={newRole} onValueChange={(v) => setNewRole(v ?? "")}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addApprovalStep} disabled={!newRole}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save to List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Save to Workspace List</CardTitle>
                <CardDescription>Create a task in a workspace list for each submission.</CardDescription>
              </div>
              <Switch checked={saveToListEnabled} onCheckedChange={setSaveToListEnabled} />
            </div>
          </CardHeader>
          {saveToListEnabled && (
            <CardContent>
              <Select
                value={targetListId}
                onValueChange={(v) => setTargetListId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a workspace list..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaceLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          )}
        </Card>

        {/* Public Link */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Public Link</CardTitle>
                <CardDescription>Allow anyone with the link to submit this form without logging in.</CardDescription>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </CardHeader>
          {isPublic && (
            <CardContent>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted border">
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm truncate text-muted-foreground font-mono">
                  {publicUrl}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scheduled Distribution</CardTitle>
                <CardDescription>Automatically assign this form on a schedule.</CardDescription>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
          </CardHeader>
          {scheduleEnabled && (
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Cron Expression</Label>
                <Input
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="0 9 * * 1 (every Monday at 9AM)"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Standard 5-field cron. Example: <code>0 9 1 * *</code> = 1st of every month.
                </p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-sm">Target</Label>
                <Select
                  value={scheduleTarget}
                  onValueChange={(v) => setScheduleTarget(v ?? "all_employees")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_employees">All Employees</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="specific">Specific People</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleTarget === "department" && (
                <div className="space-y-2">
                  <Label className="text-sm">Departments</Label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map((dept) => {
                      const selected = scheduleTargetIds.includes(dept.id);
                      return (
                        <Badge
                          key={dept.id}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleScheduleTargetId(dept.id)}
                        >
                          {dept.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {scheduleTarget === "specific" && (
                <div className="space-y-2">
                  <Label className="text-sm">People</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {profiles.map((profile) => {
                      const selected = scheduleTargetIds.includes(profile.id);
                      const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
                      return (
                        <Badge
                          key={profile.id}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleScheduleTargetId(profile.id)}
                        >
                          {name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
