"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ConditionalLogicEditor } from "./conditional-logic-editor";
import { X, Plus } from "lucide-react";

type ConditionalLogic = {
  visibility?: {
    enabled: boolean;
    field_id: string;
    operator: string;
    value: string;
  };
  required_if?: {
    enabled: boolean;
    field_id: string;
    operator: string;
    value: string;
  };
  formula?: string;
};

type FormField = {
  id: string;
  label: string;
  name: string;
  type: string;
  is_required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options?: unknown[] | null;
  validation_rules?: Record<string, unknown> | null;
  conditional_logic?: ConditionalLogic | null;
};

type FieldPropertiesProps = {
  field: FormField;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allFields: any[];
  onUpdateField: (updates: Partial<FormField>) => void;
};

const OPTION_FIELD_TYPES = ["select", "multi_select", "radio", "checkbox"];
const VALIDATION_FIELD_TYPES = ["text", "number", "email", "phone", "textarea"];

export function FieldProperties({ field, allFields, onUpdateField }: FieldPropertiesProps) {
  const [newOption, setNewOption] = useState("");

  const options = (field.options as string[] | null) ?? [];
  const validationRules = (field.validation_rules as Record<string, string> | null) ?? {};

  function addOption() {
    if (!newOption.trim()) return;
    onUpdateField({ options: [...options, newOption.trim()] });
    setNewOption("");
  }

  function removeOption(index: number) {
    onUpdateField({ options: options.filter((_, i) => i !== index) });
  }

  function updateValidation(key: string, value: string) {
    const updated = { ...validationRules };
    if (value) {
      updated[key] = value;
    } else {
      delete updated[key];
    }
    onUpdateField({ validation_rules: updated });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-3 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Field Properties
        </h3>
        <Badge variant="secondary" className="mt-1 text-xs">{field.type}</Badge>
      </div>

      <div className="flex-1 p-3 space-y-5">
        {/* Label */}
        <div className="space-y-1.5">
          <Label htmlFor="field-label" className="text-sm">Label *</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onUpdateField({ label: e.target.value })}
            placeholder="Field label"
          />
        </div>

        {/* Field Name */}
        <div className="space-y-1.5">
          <Label htmlFor="field-name" className="text-sm">Field Name</Label>
          <Input
            id="field-name"
            value={field.name}
            onChange={(e) => onUpdateField({ name: e.target.value })}
            placeholder="field_name (used in data)"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Identifier used in submission data.
          </p>
        </div>

        {/* Required */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Required</Label>
          <Switch
            checked={field.is_required}
            onCheckedChange={(checked) => onUpdateField({ is_required: checked })}
          />
        </div>

        {/* Placeholder */}
        {["text", "number", "textarea", "email", "phone"].includes(field.type) && (
          <div className="space-y-1.5">
            <Label htmlFor="field-placeholder" className="text-sm">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={field.placeholder ?? ""}
              onChange={(e) => onUpdateField({ placeholder: e.target.value || null })}
              placeholder="Hint text shown in field"
            />
          </div>
        )}

        {/* Help Text */}
        <div className="space-y-1.5">
          <Label htmlFor="field-help" className="text-sm">Help Text</Label>
          <Textarea
            id="field-help"
            value={field.help_text ?? ""}
            onChange={(e) => onUpdateField({ help_text: e.target.value || null })}
            placeholder="Additional instructions for this field"
            rows={2}
          />
        </div>

        {/* Options Editor */}
        {OPTION_FIELD_TYPES.includes(field.type) && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Options</Label>
              <div className="space-y-1.5">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="flex-1 text-sm px-2 py-1 rounded-md bg-muted truncate">
                      {opt}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add option..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={!newOption.trim()}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Validation Rules */}
        {VALIDATION_FIELD_TYPES.includes(field.type) && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Validation Rules</Label>

              {field.type === "number" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={validationRules.min ?? ""}
                      onChange={(e) => updateValidation("min", e.target.value)}
                      placeholder="Min value"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={validationRules.max ?? ""}
                      onChange={(e) => updateValidation("max", e.target.value)}
                      placeholder="Max value"
                    />
                  </div>
                </div>
              )}

              {["text", "textarea"].includes(field.type) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min length</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={validationRules.min ?? ""}
                      onChange={(e) => updateValidation("min", e.target.value)}
                      placeholder="Min chars"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max length</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={validationRules.max ?? ""}
                      onChange={(e) => updateValidation("max", e.target.value)}
                      placeholder="Max chars"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Regex pattern</Label>
                <Input
                  className="h-8 text-sm font-mono"
                  value={validationRules.pattern ?? ""}
                  onChange={(e) => updateValidation("pattern", e.target.value)}
                  placeholder="^[A-Za-z]+$"
                />
              </div>
            </div>
          </>
        )}

        {/* Conditional Logic */}
        <Separator />
        <div className="space-y-2">
          <Label className="text-sm">Conditional Logic</Label>
          <ConditionalLogicEditor
            field={field}
            allFields={allFields}
            onUpdateLogic={(logic) => onUpdateField({ conditional_logic: logic })}
          />
        </div>
      </div>
    </div>
  );
}
