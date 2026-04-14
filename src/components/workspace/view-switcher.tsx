"use client";

import { cn } from "@/lib/utils";
import { LayoutList, Columns2, GanttChart, CalendarDays } from "lucide-react";

type View = "list" | "kanban" | "gantt" | "calendar";

type ViewSwitcherProps = {
  activeView: View;
  onViewChange: (view: View) => void;
};

const VIEWS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "list", label: "List", icon: LayoutList },
  { id: "kanban", label: "Kanban", icon: Columns2 },
  { id: "gantt", label: "Gantt", icon: GanttChart },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 border-b pb-2">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onViewChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            activeView === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
