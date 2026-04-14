"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldPalette } from "./field-palette";
import { FormPreview } from "./form-preview";
import { FieldProperties } from "./field-properties";
import { FormSettingsPanel } from "./form-settings-panel";
import {
  addSection,
  deleteSection,
  reorderSections,
  addField,
  updateField,
  deleteField,
} from "@/lib/actions/form-builder";
import { toast } from "sonner";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conditional_logic?: any;
  position: number;
  section_id: string;
};

type FormSection = {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condition?: any;
  form_fields?: FormField[];
};

type FormBuilderProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workspaceLists: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  departments: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any[];
};

export function FormBuilder({ form, workspaceLists, departments, profiles }: FormBuilderProps) {
  const [sections, setSections] = useState<FormSection[]>(form.form_sections ?? []);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    (form.form_sections?.[0]?.id as string) ?? null
  );

  const [isPending, startTransition] = useTransition();

  // Flatten all fields for conditional logic reference
  const allFields: FormField[] = sections.flatMap((s) => s.form_fields ?? []);

  // Selected field (searched across all sections)
  const selectedField = allFields.find((f) => f.id === selectedFieldId) ?? null;

  // ─── Section Actions ────────────────────────────────────────────────────────

  function handleAddSection() {
    startTransition(async () => {
      const result = await addSection(form.id, `Section ${sections.length + 1}`);
      if (result && "error" in result) {
        toast.error(result.error);
      } else if (result && "sectionId" in result) {
        const newSection: FormSection = {
          id: result.sectionId as string,
          name: `Section ${sections.length + 1}`,
          position: sections.length,
          form_fields: [],
        };
        setSections((prev) => [...prev, newSection]);
        setActiveSectionId(result.sectionId as string);
      }
    });
  }

  function handleDeleteSection(sectionId: string) {
    startTransition(async () => {
      const result = await deleteSection(sectionId);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        setSections((prev) => {
          const updated = prev.filter((s) => s.id !== sectionId);
          if (activeSectionId === sectionId) {
            setActiveSectionId(updated[0]?.id ?? null);
          }
          return updated;
        });
        if (selectedField?.section_id === sectionId) {
          setSelectedFieldId(null);
        }
      }
    });
  }

  function handleReorderSection(sectionId: string, direction: "up" | "down") {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const updated = [...sections];
    [updated[currentIndex], updated[newIndex]] = [updated[newIndex], updated[currentIndex]];
    const reordered = updated.map((s, i) => ({ ...s, position: i }));
    setSections(reordered);

    startTransition(async () => {
      await reorderSections(
        form.id,
        reordered.map((s) => s.id)
      );
    });
  }

  // ─── Field Actions ──────────────────────────────────────────────────────────

  function handleAddField(type: string) {
    if (!activeSectionId) {
      toast.error("Select a section first");
      return;
    }

    const label = `${type.charAt(0).toUpperCase()}${type.slice(1).replace(/_/g, " ")} field`;

    startTransition(async () => {
      const result = await addField(activeSectionId, form.id, type, label);
      if (result && "error" in result) {
        toast.error(result.error);
      } else if (result && "fieldId" in result) {
        const section = sections.find((s) => s.id === activeSectionId);
        const existingFields = section?.form_fields ?? [];
        const newField: FormField = {
          id: result.fieldId as string,
          label,
          name: label.toLowerCase().replace(/\s+/g, "_"),
          type,
          is_required: false,
          position: existingFields.length,
          section_id: activeSectionId,
        };

        setSections((prev) =>
          prev.map((s) =>
            s.id === activeSectionId
              ? { ...s, form_fields: [...(s.form_fields ?? []), newField] }
              : s
          )
        );
        setSelectedFieldId(result.fieldId as string);
      }
    });
  }

  function handleDeleteField(fieldId: string) {
    startTransition(async () => {
      const result = await deleteField(fieldId);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        setSections((prev) =>
          prev.map((s) => ({
            ...s,
            form_fields: (s.form_fields ?? []).filter((f) => f.id !== fieldId),
          }))
        );
        if (selectedFieldId === fieldId) setSelectedFieldId(null);
      }
    });
  }

  function handleUpdateField(updates: Partial<FormField>) {
    if (!selectedFieldId) return;

    // Optimistic update
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        form_fields: (s.form_fields ?? []).map((f) =>
          f.id === selectedFieldId ? { ...f, ...updates } : f
        ),
      }))
    );

    startTransition(async () => {
      const updatedField = { ...selectedField, ...updates } as FormField;
      const formData = new FormData();
      formData.set("field_id", selectedFieldId);
      formData.set("label", updatedField.label);
      formData.set("name", updatedField.name);
      formData.set("type", updatedField.type);
      formData.set("is_required", String(updatedField.is_required));
      if (updatedField.placeholder) formData.set("placeholder", updatedField.placeholder);
      if (updatedField.help_text) formData.set("help_text", updatedField.help_text);
      if (updatedField.options) formData.set("options", JSON.stringify(updatedField.options));
      if (updatedField.validation_rules)
        formData.set("validation_rules", JSON.stringify(updatedField.validation_rules));
      if (updatedField.conditional_logic)
        formData.set("conditional_logic", JSON.stringify(updatedField.conditional_logic));

      const result = await updateField(null, formData);
      if (result && "error" in result) toast.error(result.error);
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {isPending && (
        <div className="h-0.5 bg-primary animate-pulse" />
      )}

      <Tabs defaultValue="builder" className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="builder" className="flex-1 overflow-hidden m-0">
          <div className="flex h-full divide-x">
            {/* Left: Field Palette */}
            <div className="w-52 flex-shrink-0 bg-background">
              <FieldPalette
                onAddField={handleAddField}
                activeSectionId={activeSectionId}
              />
            </div>

            {/* Center: Form Preview */}
            <div className="flex-1 bg-muted/20">
              <FormPreview
                sections={sections}
                selectedFieldId={selectedFieldId}
                onSelectField={(id) => setSelectedFieldId(id)}
                onSelectSection={(id) => setActiveSectionId(id)}
                activeSectionId={activeSectionId}
                onAddSection={handleAddSection}
                onDeleteSection={handleDeleteSection}
                onReorderSection={handleReorderSection}
                onDeleteField={handleDeleteField}
              />
            </div>

            {/* Right: Field Properties */}
            <div className="w-64 flex-shrink-0 bg-background">
              {selectedField ? (
                <FieldProperties
                  field={selectedField}
                  allFields={allFields}
                  onUpdateField={handleUpdateField}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 text-muted-foreground">
                  <p className="text-sm">Select a field</p>
                  <p className="text-xs mt-1">Click any field to edit its properties.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-y-auto m-0">
          <FormSettingsPanel
            form={form}
            workspaceLists={workspaceLists}
            departments={departments}
            profiles={profiles}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
