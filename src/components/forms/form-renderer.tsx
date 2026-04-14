"use client";

import { useState, useEffect, useTransition } from "react";
import { submitForm } from "@/lib/actions/form-submissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "./signature-pad";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

type ConditionalRule = {
  enabled: boolean;
  field_id: string;
  operator: string;
  value: string;
};

type FormField = {
  id: string;
  label: string;
  name: string;
  type: string;
  is_required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options?: string[] | null;
  validation_rules?: Record<string, string> | null;
  conditional_logic?: {
    visibility?: ConditionalRule;
    required_if?: ConditionalRule;
    formula?: string;
  } | null;
};

type FormSection = {
  id: string;
  name: string;
  description?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condition?: any;
  form_fields?: FormField[];
};

type FormRendererProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  isPublic?: boolean;
  onSubmitSuccess?: (submissionId: string) => void;
};

// ─── Condition Evaluator ──────────────────────────────────────────────────────

function evaluateCondition(
  rule: ConditionalRule | undefined,
  data: Record<string, unknown>
): boolean {
  if (!rule || !rule.enabled || !rule.field_id) return false;

  const fieldValue = data[rule.field_id];
  const strValue = String(fieldValue ?? "");
  const ruleValue = rule.value ?? "";

  switch (rule.operator) {
    case "equals":
      return strValue === ruleValue;
    case "not_equals":
      return strValue !== ruleValue;
    case "contains":
      return strValue.includes(ruleValue);
    case "greater_than":
      return parseFloat(strValue) > parseFloat(ruleValue);
    case "less_than":
      return parseFloat(strValue) < parseFloat(ruleValue);
    case "is_empty":
      return !strValue || strValue === "undefined" || strValue === "null";
    case "is_not_empty":
      return !!strValue && strValue !== "undefined" && strValue !== "null";
    default:
      return false;
  }
}

// ─── Field Renderer ───────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
  isRequired?: boolean;
  error?: string;
}) {
  const options = (field.options as string[]) ?? [];

  const inputProps = {
    id: field.id,
    placeholder: field.placeholder ?? undefined,
    className: error ? "border-destructive" : undefined,
  };

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <Input
          {...inputProps}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
    case "calculated":
      return (
        <Input
          {...inputProps}
          type="number"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          readOnly={field.type === "calculated"}
        />
      );

    case "date":
      return (
        <Input
          {...inputProps}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "textarea":
      return (
        <Textarea
          id={field.id}
          placeholder={field.placeholder ?? undefined}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={error ? "border-destructive" : undefined}
        />
      );

    case "select":
      return (
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger className={error ? "border-destructive" : undefined}>
            <SelectValue placeholder={field.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi_select": {
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${field.id}-${opt}`}
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, opt]);
                  } else {
                    onChange(selected.filter((s) => s !== opt));
                  }
                }}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "checkbox": {
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${field.id}-${opt}`}
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, opt]);
                  } else {
                    onChange(selected.filter((s) => s !== opt));
                  }
                }}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "radio":
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                id={`${field.id}-${opt}`}
                name={field.id}
                value={opt}
                checked={(value as string) === opt}
                onChange={() => onChange(opt)}
                className="h-4 w-4 border-input accent-primary"
              />
              <Label htmlFor={`${field.id}-${opt}`} className="font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      );

    case "file":
      return (
        <Input
          id={field.id}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onChange(file);
          }}
          className={error ? "border-destructive" : undefined}
        />
      );

    case "signature":
      return (
        <SignaturePad
          value={(value as string) ?? null}
          onChange={(base64) => onChange(base64)}
        />
      );

    default:
      return (
        <Input
          {...inputProps}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FormRenderer({ form, isPublic = false, onSubmitSuccess }: FormRendererProps) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sections: FormSection[] = form.form_sections ?? [];
  const allFields: FormField[] = sections.flatMap((s) => s.form_fields ?? []);

  // Auto-calculate calculated fields
  useEffect(() => {
    const calcFields = allFields.filter((f) => f.type === "calculated");
    if (!calcFields.length) return;

    let changed = false;
    const next = { ...data };

    for (const field of calcFields) {
      const formula = field.conditional_logic?.formula;
      if (!formula) continue;

      // Replace {field_name} placeholders with current values
      let result = formula;
      for (const f of allFields) {
        const placeholder = `{${f.name}}`;
        if (result.includes(placeholder)) {
          result = result.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), String(data[f.id] ?? 0));
        }
      }

      try {
        // Safe arithmetic evaluation: only numbers, operators, parens, spaces
        const sanitized = result.replace(/[^0-9+\-*/().\s]/g, "");
        if (!sanitized.trim()) continue;
        // Use Function constructor (safer than eval, still needs care)
        const computed = String(new Function(`"use strict"; return (${sanitized})`)());
        if (computed !== String(next[field.id] ?? "")) {
          next[field.id] = computed;
          changed = true;
        }
      } catch {
        // Formula error — skip silently
      }
    }

    if (changed) setData(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Field visibility
  function isFieldVisible(field: FormField): boolean {
    const vis = field.conditional_logic?.visibility;
    if (!vis?.enabled) return true;
    return evaluateCondition(vis, data);
  }

  // Section visibility
  function isSectionVisible(section: FormSection): boolean {
    if (!section.condition?.enabled) return true;
    return evaluateCondition(section.condition, data);
  }

  // Dynamic required
  function isFieldRequired(field: FormField): boolean {
    if (field.is_required) return true;
    const requiredIf = field.conditional_logic?.required_if;
    if (!requiredIf?.enabled) return false;
    return evaluateCondition(requiredIf, data);
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const section of sections) {
      if (!isSectionVisible(section)) continue;
      for (const field of section.form_fields ?? []) {
        if (!isFieldVisible(field)) continue;
        const required = isFieldRequired(field);
        const value = data[field.id];

        if (required) {
          const isEmpty =
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0);
          if (isEmpty) {
            newErrors[field.id] = `${field.label} is required`;
            continue;
          }
        }

        // Regex validation
        const rules = field.validation_rules ?? {};
        if (rules.pattern && typeof value === "string" && value) {
          try {
            if (!new RegExp(rules.pattern).test(value)) {
              newErrors[field.id] = `${field.label} format is invalid`;
            }
          } catch {
            // Invalid regex — skip
          }
        }

        // Min/max for number
        if (field.type === "number" && value !== undefined && value !== "") {
          const num = parseFloat(String(value));
          if (rules.min && num < parseFloat(rules.min)) {
            newErrors[field.id] = `${field.label} must be at least ${rules.min}`;
          }
          if (rules.max && num > parseFloat(rules.max)) {
            newErrors[field.id] = `${field.label} must be at most ${rules.max}`;
          }
        }

        // Min/max length for text
        if (["text", "textarea"].includes(field.type) && typeof value === "string" && value) {
          if (rules.min && value.length < parseInt(rules.min)) {
            newErrors[field.id] = `${field.label} must be at least ${rules.min} characters`;
          }
          if (rules.max && value.length > parseInt(rules.max)) {
            newErrors[field.id] = `${field.label} must be at most ${rules.max} characters`;
          }
        }
      }
    }

    if (isPublic && !respondentName.trim()) {
      newErrors["__respondent_name"] = "Your name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(fieldId: string, value: unknown) {
    setData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    // Separate File objects — file upload would happen here in production
    // For now, remove File objects from data (server side handles upload)
    const submitData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val instanceof File) {
        // In a full implementation: uploadFormFile() first, then store URL
        // For this submission, we skip file binary (handled by page layer)
        submitData[key] = null;
      } else {
        submitData[key] = val;
      }
    }

    startTransition(async () => {
      const result = await submitForm(
        form.id,
        submitData,
        isPublic ? respondentName : undefined,
        isPublic ? respondentEmail : undefined
      );

      if (result && "error" in result) {
        toast.error(result.error);
      } else if (result && "submissionId" in result) {
        setSubmitted(true);
        toast.success("Form submitted!");
        onSubmitSuccess?.(result.submissionId as string);
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h2 className="text-xl font-semibold">Submitted!</h2>
        <p className="text-muted-foreground">Thank you for your response.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      {/* Public respondent fields */}
      {isPublic && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Details</CardTitle>
            <CardDescription>Required to identify your submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="respondent-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="respondent-name"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Your full name"
                className={errors["__respondent_name"] ? "border-destructive" : undefined}
              />
              {errors["__respondent_name"] && (
                <p className="text-xs text-destructive">{errors["__respondent_name"]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="respondent-email">Email</Label>
              <Input
                id="respondent-email"
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{form.name}</h1>
        {form.description && (
          <p className="text-muted-foreground text-sm">{form.description}</p>
        )}
      </div>

      {/* Sections + Fields */}
      {sections.map((section) => {
        if (!isSectionVisible(section)) return null;
        const fields = section.form_fields ?? [];
        const visibleFields = fields.filter(isFieldVisible);

        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.name}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {visibleFields.map((field) => {
                const required = isFieldRequired(field);
                const error = errors[field.id];

                return (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id} className="text-sm font-medium">
                      {field.label}
                      {required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    <FieldRenderer
                      field={field}
                      value={data[field.id]}
                      onChange={(val) => handleChange(field.id, val)}
                      isRequired={required}
                      error={error}
                    />

                    {field.help_text && !error && (
                      <p className="text-xs text-muted-foreground">{field.help_text}</p>
                    )}
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                  </div>
                );
              })}

              {visibleFields.length === 0 && (
                <p className="text-sm text-muted-foreground">No fields in this section.</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
