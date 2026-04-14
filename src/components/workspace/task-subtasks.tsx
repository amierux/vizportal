"use client";

import { Badge } from "@/components/ui/badge";
import { TaskCreateDialog } from "./task-create-dialog";
import { GitBranch } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type Subtask = {
  id: string;
  name: string;
  status_id: string;
  priority: string;
  assignee_id: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Status = {
  id: string;
  name: string;
  color: string;
};

type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type TaskSubtasksProps = {
  subtasks: Subtask[];
  listId: string;
  parentTaskId: string;
  members?: Member[];
  statuses?: Status[];
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-muted",
};

export function TaskSubtasks({
  subtasks,
  listId,
  parentTaskId,
  members = [],
  statuses = [],
}: TaskSubtasksProps) {
  function getStatus(statusId: string) {
    return statuses.find((s) => s.id === statusId);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          Subtasks
          {subtasks.length > 0 && (
            <span className="text-xs font-normal">({subtasks.length})</span>
          )}
        </div>
        <TaskCreateDialog
          listId={listId}
          parentTaskId={parentTaskId}
          members={members}
          triggerLabel="Add Subtask"
          triggerVariant="ghost"
          triggerSize="sm"
        />
      </div>

      {subtasks.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No subtasks.</p>
      )}

      <div className="space-y-1.5">
        {subtasks.map((subtask) => {
          const status = getStatus(subtask.status_id);
          const priorityColor = PRIORITY_COLORS[subtask.priority] ?? PRIORITY_COLORS.none;

          return (
            <div
              key={subtask.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm bg-muted/10 row-hover"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: status?.color ?? "#94a3b8" }}
              />
              <span className="flex-1 truncate">{subtask.name}</span>
              {subtask.profiles && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFullName(subtask.profiles.first_name, subtask.profiles.last_name)}
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
              <span className={`h-2 w-2 rounded-full shrink-0 ${priorityColor}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
