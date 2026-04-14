"use client";

import { cn } from "@/lib/utils";
import {
  Type,
  Hash,
  Calendar,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Circle,
  Paperclip,
  PenTool,
  Mail,
  Phone,
  Calculator,
  List,
} from "lucide-react";

type FieldType = {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const FIELD_TYPES: FieldType[] = [
  { type: "text", label: "Text", icon: Type, description: "Short text input" },
  { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
  { type: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { type: "textarea", label: "Textarea", icon: AlignLeft, description: "Long text" },
  { type: "select", label: "Select", icon: ChevronDown, description: "Dropdown select" },
  { type: "multi_select", label: "Multi-Select", icon: List, description: "Multiple selection" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, description: "Checkbox options" },
  { type: "radio", label: "Radio", icon: Circle, description: "Single choice" },
  { type: "file", label: "File", icon: Paperclip, description: "File attachment" },
  { type: "signature", label: "Signature", icon: PenTool, description: "Signature capture" },
  { type: "email", label: "Email", icon: Mail, description: "Email address" },
  { type: "phone", label: "Phone", icon: Phone, description: "Phone number" },
  { type: "calculated", label: "Calculated", icon: Calculator, description: "Auto-calculated" },
];

type FieldPaletteProps = {
  onAddField: (type: string) => void;
  activeSectionId: string | null;
};

export function FieldPalette({ onAddField, activeSectionId }: FieldPaletteProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Field Types
        </h3>
        {!activeSectionId && (
          <p className="text-xs text-muted-foreground mt-1">Select a section first</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-1 gap-1">
          {FIELD_TYPES.map((field) => {
            const Icon = field.icon;
            return (
              <button
                key={field.type}
                onClick={() => onAddField(field.type)}
                disabled={!activeSectionId}
                className={cn(
                  "flex items-center gap-2.5 w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                )}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium leading-none">{field.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {field.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
