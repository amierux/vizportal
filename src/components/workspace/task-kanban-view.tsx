"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatFullName } from "@/lib/utils/format";
import { GitBranch } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-muted-foreground/30",
};

type Task = {
  id: string;
  name: string;
  status_id: string;
  priority: string;
  assignee_id: string | null;
  target_end_date: string | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  workspace_tasks?: { id: string }[];
};

type Status = {
  id: string;
  name: string;
  color: string;
  position: number;
};


type TaskKanbanViewProps = {
  tasks: Task[];
  statuses: Status[];
  members?: { id: string; first_name: string | null; last_name: string | null }[];
  onStatusChange?: (taskId: string, statusId: string) => void | Promise<void>;
};

export function TaskKanbanView({ tasks, statuses, onStatusChange }: TaskKanbanViewProps) {
  const [isPending, startTransition] = useTransition();

  const sortedStatuses = statuses.slice().sort((a, b) => a.position - b.position);

  function getTasksForStatus(statusId: string) {
    return tasks.filter((t) => t.status_id === statusId);
  }

  function handleMoveTo(taskId: string, newStatusId: string) {
    startTransition(async () => {
      if (onStatusChange) {
        await onStatusChange(taskId, newStatusId);
      }
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
      {sortedStatuses.map((status) => {
        const columnTasks = getTasksForStatus(status.id);

        return (
          <div key={status.id} className="flex flex-col gap-2 w-72 shrink-0">
            {/* Column Header */}
            <div className="flex items-center gap-2 px-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-sm font-semibold">{status.name}</span>
              <Badge variant="secondary" className="text-xs ml-auto px-1.5 h-5">
                {columnTasks.length}
              </Badge>
            </div>

            {/* Task Cards */}
            <div className="flex flex-col gap-2">
              {columnTasks.length === 0 && (
                <div className="rounded-md border-2 border-dashed py-6 text-center text-xs text-muted-foreground">
                  No tasks
                </div>
              )}
              {columnTasks.map((task) => {
                const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;
                const subtaskCount = task.workspace_tasks?.length ?? 0;
                const otherStatuses = sortedStatuses.filter((s) => s.id !== status.id);

                return (
                  <Card key={task.id} className="card-hover relative overflow-hidden">
                    {/* Priority color bar at top */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-0.5 ${priorityColor}`}
                    />
                    <CardContent className="pt-4 pb-3 px-3 space-y-2">
                      <Link
                        href={`/workspace/tasks/${task.id}`}
                        className="block text-sm font-medium hover:underline line-clamp-2"
                      >
                        {task.name}
                      </Link>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {task.profiles && (
                          <span className="truncate">
                            {formatFullName(task.profiles.first_name, task.profiles.last_name)}
                          </span>
                        )}
                        {task.target_end_date && (
                          <span className="ml-auto shrink-0">
                            {formatDate(task.target_end_date)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {subtaskCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <GitBranch className="h-3 w-3" />
                            {subtaskCount}
                          </span>
                        )}

                        {/* Move to dropdown */}
                        {otherStatuses.length > 0 && (
                          <div className="ml-auto">
                            <Select
                              value=""
                              onValueChange={(v) => v && handleMoveTo(task.id, v)}
                              disabled={isPending}
                            >
                              <SelectTrigger className="h-6 w-20 text-[10px] px-2 border-dashed">
                                <SelectValue placeholder="Move to" />
                              </SelectTrigger>
                              <SelectContent>
                                {otherStatuses.map((s) => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    <span className="flex items-center gap-1.5">
                                      <span
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: s.color }}
                                      />
                                      {s.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
