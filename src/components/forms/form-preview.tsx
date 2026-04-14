"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: string;
  is_required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
};

type FormSection = {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  form_fields?: FormField[];
};

type FormPreviewProps = {
  sections: FormSection[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onSelectSection: (sectionId: string) => void;
  activeSectionId: string | null;
  onAddSection: () => void;
  onDeleteSection: (sectionId: string) => void;
  onReorderSection: (sectionId: string, direction: "up" | "down") => void;
  onDeleteField: (fieldId: string) => void;
};

function FieldTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    text: "Text",
    number: "Number",
    date: "Date",
    textarea: "Textarea",
    select: "Select",
    multi_select: "Multi-Select",
    checkbox: "Checkbox",
    radio: "Radio",
    file: "File Upload",
    signature: "Signature",
    email: "Email",
    phone: "Phone",
    calculated: "Calculated",
  };
  return (
    <Badge variant="outline" className="text-xs font-normal">
      {labels[type] ?? type}
    </Badge>
  );
}

export function FormPreview({
  sections,
  selectedFieldId,
  onSelectField,
  onSelectSection,
  activeSectionId,
  onAddSection,
  onDeleteSection,
  onReorderSection,
  onDeleteField,
}: FormPreviewProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 p-4 space-y-4">
        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p className="text-sm">No sections yet.</p>
            <p className="text-xs mt-1">Click &quot;Add Section&quot; below to get started.</p>
          </div>
        )}

        {sections.map((section, sectionIndex) => {
          const isActive = activeSectionId === section.id;
          const fields = section.form_fields ?? [];

          return (
            <div
              key={section.id}
              className={cn(
                "rounded-lg border transition-colors",
                isActive ? "border-primary ring-1 ring-primary" : "border-border"
              )}
              onClick={() => onSelectSection(section.id)}
            >
              {/* Section Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-t-lg border-b">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-semibold flex-1 truncate">{section.name}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onReorderSection(section.id, "up")}
                    disabled={sectionIndex === 0}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onReorderSection(section.id, "down")}
                    disabled={sectionIndex === sections.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onDeleteSection(section.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Fields */}
              <div className="p-3 space-y-2 min-h-[60px]">
                {fields.length === 0 && (
                  <div className="flex items-center justify-center py-4 rounded-md border border-dashed text-xs text-muted-foreground">
                    No fields — click a field type on the left to add one
                  </div>
                )}

                {fields.map((field) => {
                  const isSelected = selectedFieldId === field.id;
                  return (
                    <div
                      key={field.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectField(field.id);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                        "hover:border-primary/50 hover:bg-primary/5",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background"
                      )}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{field.label}</span>
                          {field.is_required && (
                            <span className="text-destructive text-xs">*</span>
                          )}
                        </div>
                        {field.placeholder && (
                          <p className="text-xs text-muted-foreground truncate">{field.placeholder}</p>
                        )}
                      </div>
                      <FieldTypeLabel type={field.type} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteField(field.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Section */}
      <div className="sticky bottom-0 bg-background border-t p-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddSection}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}
