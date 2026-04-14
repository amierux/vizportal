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

type ApproverEntry =
  | { type: "user"; profile_id: string; name: string; email: string }
  | { type: "external"; email: string; name: string };

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

/** Derive initial approvers from the form's nested approval config (v2 shape). */
function deriveInitialApprovers(form: Record<string, unknown>): ApproverEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (form.form_approval_configs as any) ?? null;
  if (!config) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvers: any[] = Array.isArray(config.form_approvers)
    ? config.form_approvers
    : [];
  return approvers
    .sort((a, b) => a.step_order - b.step_order)
    .map((a): ApproverEntry => {
      if (a.profile_id) {
        return {
          type: "user",
          profile_id: a.profile_id,
          name: a.profiles
            ? [a.profiles.first_name, a.profiles.last_name].filter(Boolean).join(" ") ||
              a.profiles.email
            : a.profile_id,
          email: a.profiles?.email ?? "",
        };
      }
      return {
        type: "external",
        email: a.approver_email ?? "",
        name: a.approver_name ?? a.approver_email ?? "",
      };
    });
}

export function FormSettingsPanel({ form, workspaceLists, departments, profiles }: FormSettingsPanelProps) {
  const [state, formAction, isPending] = useActionState(updateFormSettings, null);

  // Approval
  const [approvalEnabled, setApprovalEnabled] = useState<boolean>(form.approval_enabled ?? false);
  const [approvalMode, setApprovalMode] = useState<"hierarchical" | "any_one" | "any_order">(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (form.form_approval_configs as any)?.approval_mode ?? "hierarchical"
  );
  const [approvers, setApprovers] = useState<ApproverEntry[]>(deriveInitialApprovers(form));
  const [approverSearch, setApproverSearch] = useState("");

  // Save to list
  const [saveToListEnabled, setSaveToListEnabled] = useState<boolean>(form.save_to_list_enabled ?? false);
  const [targetListId, setTargetListId] = useState<string>(form.target_list_id ?? "");

  // Public link
  const [isPublic, setIsPublic] = useState<boolean>(form.is_public ?? false);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/forms/public/${form.public_token}`
      : `/forms/public/${form.public_token}`;

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(form.schedule_enabled ?? false);
  const [scheduleCron, setScheduleCron] = useState<string>(form.schedule_cron ?? "");
  const [scheduleTarget, setScheduleTarget] = useState<string>(form.schedule_target ?? "all_employees");
  const [scheduleTargetIds, setScheduleTargetIds] = useState<string[]>(
    form.schedule_target_ids ?? []
  );

  useEffect(() => {
    if (state && "success" in state) toast.success("Settings saved");
    if (state && "error" in state) toast.error((state as { error: string }).error);
  }, [state]);

  // Filtered profile list (exclude already-added internal approvers)
  const addedIds = new Set(
    approvers.filter((a): a is Extract<ApproverEntry, { type: "user" }> => a.type === "user").map((a) => a.profile_id)
  );
  const filteredProfiles = profiles.filter((p) => {
    if (addedIds.has(p.id)) return false;
    if (!approverSearch) return true;
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
    return (
      fullName.includes(approverSearch.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(approverSearch.toLowerCase())
    );
  });

  // External approver form state
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");

  function addApprover(profile: { id: string; first_name: string | null; last_name: string | null; email: string }) {
    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
    setApprovers((prev) => [...prev, { type: "user", profile_id: profile.id, name, email: profile.email }]);
    setApproverSearch("");
  }

  function addExternalApprover() {
    const trimEmail = extEmail.trim();
    const trimName = extName.trim();
    if (!trimEmail) return;
    setApprovers((prev) => [...prev, { type: "external", email: trimEmail, name: trimName || trimEmail }]);
    setExtName("");
    setExtEmail("");
  }

  function removeApprover(index: number) {
    setApprovers((prev) => prev.filter((_, i) => i !== index));
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
        <input type="hidden" name="approval_mode" value={approvalMode} />
        <input
          type="hidden"
          name="approvers"
          value={JSON.stringify(approvers)}
        />
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
            <CardContent className="space-y-4">
              {/* Approval Mode */}
              <div className="space-y-2">
                <Label className="text-sm">Approval Mode</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="_approval_mode_ui"
                      value="hierarchical"
                      checked={approvalMode === "hierarchical"}
                      onChange={() => setApprovalMode("hierarchical")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Hierarchical — approvers must approve in order</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="_approval_mode_ui"
                      value="any_one"
                      checked={approvalMode === "any_one"}
                      onChange={() => setApprovalMode("any_one")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Any One — any single approver can approve</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="_approval_mode_ui"
                      value="any_order"
                      checked={approvalMode === "any_order"}
                      onChange={() => setApprovalMode("any_order")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Any Order — all approvers must approve, order doesn&apos;t matter</span>
                  </label>
                </div>
              </div>

              <Separator />

              {/* Approvers list */}
              <div className="space-y-2">
                <Label className="text-sm">Approvers</Label>
                {approvers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No approvers added yet.</p>
                )}
                <div className="space-y-1.5">
                  {approvers.map((approver, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {approvalMode === "hierarchical" && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Step {index + 1}
                        </Badge>
                      )}
                      {approver.type === "external" && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          External
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{approver.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{approver.email}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => removeApprover(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Internal Approver */}
              <div className="space-y-1.5">
                <Label className="text-sm">Add User Approver</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  className="text-sm"
                />
                {approverSearch && filteredProfiles.length > 0 && (
                  <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                    {filteredProfiles.map((profile) => {
                      const name =
                        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
                        profile.email;
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => addApprover(profile)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                          </div>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
                {approverSearch && filteredProfiles.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No matching profiles found.</p>
                )}
              </div>

              <Separator />

              {/* Add External Approver */}
              <div className="space-y-1.5">
                <Label className="text-sm">Add External Approver</Label>
                <p className="text-xs text-muted-foreground">
                  Send approval requests to someone outside VizPortal via email.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Name"
                    value={extName}
                    onChange={(e) => setExtName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={extEmail}
                    onChange={(e) => setExtEmail(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addExternalApprover}
                    disabled={!extEmail.trim()}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
