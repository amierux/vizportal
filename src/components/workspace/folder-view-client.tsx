"use client";

import { useState, useTransition } from "react";
import { ViewSwitcher } from "./view-switcher";
import { TaskListView } from "./task-list-view";
import { TaskKanbanView } from "./task-kanban-view";
import { TaskGanttView } from "./task-gantt-view";
import { TaskCalendarView } from "./task-calendar-view";
import { updateTaskStatus } from "@/lib/actions/workspace-tasks";
import { toast } from "sonner";

type Task = {
  id: string;
  name: string;
  status_id: string;
  priority: string;
  assignee_id: string | null;
  start_date: string | null;
  target_end_date: string | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  workspace_tasks?: {
    id: string;
    name: string;
    status_id: string;
    priority: string;
    assignee_id: string | null;
  }[];
  workspace_task_checklists?: {
    workspace_checklist_items: { is_checked: boolean }[];
  }[];
};

type Status = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type View = "list" | "kanban" | "gantt" | "calendar";

type FolderViewClientProps = {
  tasks: Task[];
  statuses: Status[];
  members: Member[];
  initialView?: View;
};

export function FolderViewClient({
  tasks,
  statuses,
  members,
  initialView = "list",
}: FolderViewClientProps) {
  const [activeView, setActiveView] = useState<View>(initialView);
  const [, startTransition] = useTransition();

  function handleStatusChange(taskId: string, statusId: string) {
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, statusId);
      if (result && "error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <ViewSwitcher
        activeView={activeView}
        onViewChange={(v) => setActiveView(v as View)}
      />
      {activeView === "list" && (
        <TaskListView
          tasks={tasks}
          statuses={statuses}
          members={members}
          onStatusChange={handleStatusChange}
        />
      )}
      {activeView === "kanban" && (
        <TaskKanbanView
          tasks={tasks}
          statuses={statuses}
          members={members}
          onStatusChange={handleStatusChange}
        />
      )}
      {activeView === "gantt" && (
        <TaskGanttView tasks={tasks} statuses={statuses} />
      )}
      {activeView === "calendar" && (
        <TaskCalendarView tasks={tasks} />
      )}
    </div>
  );
}
