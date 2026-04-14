"use client";

import { useActionState, useEffect, useState } from "react";
import { updateApprovalConfig } from "@/lib/actions/approval-configs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "team_leader", label: "Team Leader" },
  { value: "dept_manager", label: "Department Manager" },
  { value: "business_manager", label: "Business Manager" },
  { value: "director", label: "Director" },
];

const ROLE_OPTIONS_WITH_RELIEVER = [
  { value: "reliever", label: "Reliever" },
  ...ROLE_OPTIONS,
];

const TYPE_LABELS: Record<string, string> = {
  manual_clock: "Manual Clock In/Out",
  leave_request: "Leave Request",
  overtime: "Overtime",
};

const APPROVAL_TYPES = ["manual_clock", "leave_request", "overtime"] as const;

type ApprovalConfigStep = {
  role: string;
  is_optional: boolean;
  step_order: number;
};

type ApprovalConfig = {
  type: string;
  is_enabled: boolean;
  approval_config_steps: ApprovalConfigStep[];
};

type ApprovalChainEditorProps = {
  configs: ApprovalConfig[];
};

type StepItem = {
  role: string;
  is_optional: boolean;
};

function ApprovalTypeCard({
  type,
  config,
}: {
  type: string;
  config: ApprovalConfig | undefined;
}) {
  const [state, formAction, isPending] = useActionState(updateApprovalConfig, null);
  const [isEnabled, setIsEnabled] = useState(config?.is_enabled ?? false);
  const [steps, setSteps] = useState<StepItem[]>(
    config?.approval_config_steps?.map((s) => ({
      role: s.role,
      is_optional: s.is_optional,
    })) ?? [{ role: "team_leader", is_optional: false }]
  );

  useEffect(() => {
    if (state && "success" in state) toast.success(`${TYPE_LABELS[type]} approval chain saved`);
    if (state && "error" in state) toast.error(state.error as string);
  }, [state, type]);

  function addStep() {
    setSteps((prev) => [...prev, { role: "team_leader", is_optional: false }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStepRole(index: number, role: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, role } : s)));
  }

  function updateStepOptional(index: number, is_optional: boolean) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, is_optional } : s)));
  }

  const roleOptions = type === "leave_request" ? ROLE_OPTIONS_WITH_RELIEVER : ROLE_OPTIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{TYPE_LABELS[type] ?? type}</CardTitle>
        <CardDescription>
          Configure the approval chain for {TYPE_LABELS[type]?.toLowerCase() ?? type} requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Hidden fields */}
          <input type="hidden" name="_type" value={type} />
          <input type="hidden" name="is_enabled" value={isEnabled ? "true" : "false"} />
          <input type="hidden" name="_steps" value={JSON.stringify(steps)} />

          {/* Enable toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Enable approval for {TYPE_LABELS[type]?.toLowerCase() ?? type}</span>
          </label>

          {/* Steps list */}
          {isEnabled && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Approval Steps</p>
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No steps configured. Add a step below.
                </p>
              )}
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 rounded-md border p-2">
                  <span className="min-w-[1.5rem] text-sm text-muted-foreground">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <Select
                      value={step.role}
                      onValueChange={(val) => updateStepRole(index, val)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={step.is_optional}
                      onChange={(e) => updateStepOptional(index, e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
                className="mt-1"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Step
              </Button>
            </div>
          )}

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ApprovalChainEditor({ configs }: ApprovalChainEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Approval Chain Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure per-type approval chains. Each type can be enabled independently with its own ordered approver roles.
        </p>
      </div>
      {APPROVAL_TYPES.map((type) => (
        <ApprovalTypeCard
          key={type}
          type={type}
          config={configs.find((c) => c.type === type)}
        />
      ))}
    </div>
  );
}
