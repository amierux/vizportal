"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-muted-foreground/30",
};

type TaskWithContext = {
  id: string;
  name: string;
  status_id: string;
  priority: string;
  target_end_date: string | null;
  workspace_lists: {
    id: string;
    name: string;
    workspace_folders: {
      id: string;
      name: string;
      color: string;
      icon: string;
    } | null;
  } | null;
};

type StatusMap = Record<string, { name: string; color: string }>;

type TaskRowProps = {
  task: TaskWithContext;
  statusMap: StatusMap;
};

function TaskRow({ task, statusMap }: TaskRowProps) {
  const status = statusMap[task.status_id];
  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;
  const folder = task.workspace_lists?.workspace_folders;
  const list = task.workspace_lists;

  return (
    <Link
      href={`/workspace/tasks/${task.id}`}
      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors rounded-md"
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", priorityColor)} />
      <span className="flex-1 font-medium truncate">{task.name}</span>

      {/* Breadcrumb */}
      {folder && list && (
        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <span>{folder.icon}</span>
          <span>{folder.name}</span>
          <span>/</span>
          <span>{list.name}</span>
        </span>
      )}

      {status && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-5 shrink-0"
          style={{ backgroundColor: `${status.color}20`, color: status.color }}
        >
          {status.name}
        </Badge>
      )}

      {task.target_end_date && (
        <span className="text-xs text-muted-foreground shrink-0 w-24 text-right">
          {formatDate(task.target_end_date)}
        </span>
      )}
    </Link>
  );
}

type SectionProps = {
  label: string;
  tasks: TaskWithContext[];
  statusMap: StatusMap;
  defaultOpen?: boolean;
  headerClassName?: string;
};

function Section({ label, tasks, statusMap, defaultOpen = true, headerClassName }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (tasks.length === 0) return null;

  return (
    <div className="animate-fade-in-up">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-semibold w-full text-left hover:bg-muted/30 rounded-md transition-colors",
          headerClassName
        )}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {label}
        <span className="ml-1 text-xs font-normal text-muted-foreground">({tasks.length})</span>
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 ml-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} statusMap={statusMap} />
          ))}
        </div>
      )}
    </div>
  );
}

type MyTasksViewProps = {
  tasks: TaskWithContext[];
  statusMap?: StatusMap;
};

export function MyTasksView({ tasks, statusMap = {} }: MyTasksViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  function toDate(str: string | null) {
    if (!str) return null;
    const d = new Date(str);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const overdue: TaskWithContext[] = [];
  const todayTasks: TaskWithContext[] = [];
  const upcoming: TaskWithContext[] = [];
  const later: TaskWithContext[] = [];
  const noDueDate: TaskWithContext[] = [];

  for (const task of tasks) {
    const due = toDate(task.target_end_date);
    if (!due) {
      noDueDate.push(task);
    } else if (due < today) {
      overdue.push(task);
    } else if (due.getTime() === today.getTime()) {
      todayTasks.push(task);
    } else if (due <= in7Days) {
      upcoming.push(task);
    } else {
      later.push(task);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-sm">No tasks assigned to you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-stagger">
      <Section
        label="Overdue"
        tasks={overdue}
        statusMap={statusMap}
        headerClassName="text-destructive"
      />
      <Section label="Today" tasks={todayTasks} statusMap={statusMap} />
      <Section label="Upcoming (next 7 days)" tasks={upcoming} statusMap={statusMap} />
      <Section label="Later" tasks={later} statusMap={statusMap} defaultOpen={false} />
      <Section label="No Due Date" tasks={noDueDate} statusMap={statusMap} defaultOpen={false} />
    </div>
  );
}
