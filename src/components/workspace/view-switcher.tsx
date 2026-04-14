"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LayoutList, Columns2, GanttChart, CalendarDays } from "lucide-react";

type View = "list" | "kanban" | "gantt" | "calendar";

type ViewSwitcherProps = {
  activeView: View;
  onViewChange: (view: View) => void;
};

const VIEWS: { id: View; label: string; icon: React.ElementType; comingSoon?: boolean }[] = [
  { id: "list", label: "List", icon: LayoutList },
  { id: "kanban", label: "Kanban", icon: Columns2 },
  { id: "gantt", label: "Gantt", icon: GanttChart, comingSoon: true },
  { id: "calendar", label: "Calendar", icon: CalendarDays, comingSoon: true },
];

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 border-b pb-2">
      {VIEWS.map(({ id, label, icon: Icon, comingSoon }) => (
        <button
          key={id}
          type="button"
          disabled={comingSoon}
          onClick={() => !comingSoon && onViewChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            activeView === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            comingSoon && "opacity-50 cursor-not-allowed"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
          {comingSoon && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-0.5">
              Soon
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
