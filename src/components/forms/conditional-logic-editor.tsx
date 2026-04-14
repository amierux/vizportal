"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type ConditionalRule = {
  enabled: boolean;
  field_id: string;
  operator: string;
  value: string;
};

type ConditionalLogic = {
  visibility?: ConditionalRule;
  required_if?: ConditionalRule;
  formula?: string;
};

type Field = {
  id: string;
  label: string;
  type: string;
  conditional_logic?: ConditionalLogic | null;
};

type ConditionalLogicEditorProps = {
  field: Field;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allFields: any[];
  onUpdateLogic: (logic: ConditionalLogic) => void;
};

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const VALUE_FREE_OPERATORS = ["is_empty", "is_not_empty"];

function RuleEditor({
  label,
  rule,
  allFields,
  currentFieldId,
  onChange,
}: {
  label: string;
  rule: ConditionalRule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allFields: any[];
  currentFieldId: string;
  onChange: (rule: ConditionalRule) => void;
}) {
  const otherFields = allFields.filter((f) => f.id !== currentFieldId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => onChange({ ...rule, enabled: checked })}
        />
      </div>

      {rule.enabled && (
        <div className="grid grid-cols-1 gap-2 pl-2 border-l-2 border-muted">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">When field</Label>
            <Select
              value={rule.field_id}
              onValueChange={(v) => onChange({ ...rule, field_id: v ?? "" })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select a field..." />
              </SelectTrigger>
              <SelectContent>
                {otherFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Operator</Label>
            <Select
              value={rule.operator}
              onValueChange={(v) => onChange({ ...rule, operator: v ?? "" })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select operator..." />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!VALUE_FREE_OPERATORS.includes(rule.operator) && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Value</Label>
              <Input
                className="h-8 text-sm"
                value={rule.value}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                placeholder="Enter value..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConditionalLogicEditor({
  field,
  allFields,
  onUpdateLogic,
}: ConditionalLogicEditorProps) {
  const existingLogic = (field.conditional_logic ?? {}) as ConditionalLogic;

  const [visibility, setVisibility] = useState<ConditionalRule>({
    enabled: !!existingLogic.visibility?.enabled,
    field_id: existingLogic.visibility?.field_id ?? "",
    operator: existingLogic.visibility?.operator ?? "equals",
    value: existingLogic.visibility?.value ?? "",
  });

  const [requiredIf, setRequiredIf] = useState<ConditionalRule>({
    enabled: !!existingLogic.required_if?.enabled,
    field_id: existingLogic.required_if?.field_id ?? "",
    operator: existingLogic.required_if?.operator ?? "equals",
    value: existingLogic.required_if?.value ?? "",
  });

  const [formula, setFormula] = useState(existingLogic.formula ?? "");

  function handleVisibilityChange(rule: ConditionalRule) {
    setVisibility(rule);
    onUpdateLogic({ visibility: rule, required_if: requiredIf, formula });
  }

  function handleRequiredIfChange(rule: ConditionalRule) {
    setRequiredIf(rule);
    onUpdateLogic({ visibility, required_if: rule, formula });
  }

  function handleFormulaChange(value: string) {
    setFormula(value);
    onUpdateLogic({ visibility, required_if: requiredIf, formula: value });
  }

  return (
    <div className="space-y-4">
      <RuleEditor
        label="Show this field if..."
        rule={visibility}
        allFields={allFields}
        currentFieldId={field.id}
        onChange={handleVisibilityChange}
      />

      <Separator />

      <RuleEditor
        label="Required if..."
        rule={requiredIf}
        allFields={allFields}
        currentFieldId={field.id}
        onChange={handleRequiredIfChange}
      />

      {field.type === "calculated" && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Formula</Label>
            <Input
              value={formula}
              onChange={(e) => handleFormulaChange(e.target.value)}
              placeholder="e.g. {field_name} * 1.12"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Reference other fields using {"{"} field_name {"}"} syntax.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
