"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFullName, formatDate } from "@/lib/utils/format";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-muted-foreground/30",
};

type Subtask = {
  id: string;
  name: string;
  status_id: string;
  priority: string;
  assignee_id: string | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

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
  workspace_tasks?: Subtask[];
  workspace_task_checklists?: {
    workspace_checklist_items: { is_checked: boolean }[];
  }[];
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

type TaskListViewProps = {
  tasks: Task[];
  statuses: Status[];
  members: Member[];
  onStatusChange?: (taskId: string, statusId: string) => void | Promise<void>;
};

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc" ? (
    <ChevronUp className="h-3 w-3 ml-1" />
  ) : (
    <ChevronDown className="h-3 w-3 ml-1" />
  );
}

type SortField = "name" | "priority" | "target_end_date" | "status";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export function TaskListView({ tasks, statuses, members, onStatusChange }: TaskListViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleStatusChange(taskId: string, statusId: string) {
    startTransition(async () => {
      if (onStatusChange) {
        await onStatusChange(taskId, statusId);
      }
    });
  }

  function getProgress(task: Task): string {
    const checklists = task.workspace_task_checklists ?? [];
    let total = 0;
    let done = 0;
    for (const cl of checklists) {
      for (const item of cl.workspace_checklist_items) {
        total++;
        if (item.is_checked) done++;
      }
    }
    if (total === 0) return "—";
    return `${done}/${total}`;
  }

  // Filter
  let filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status_id !== filterStatus) return false;
    if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  // Sort
  filtered = filtered.slice().sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else if (sortField === "priority")
      cmp = (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99);
    else if (sortField === "target_end_date") {
      const da = a.target_end_date ?? "9999";
      const db = b.target_end_date ?? "9999";
      cmp = da.localeCompare(db);
    } else if (sortField === "status") {
      cmp = (statuses.findIndex((s) => s.id === a.status_id) ?? 99) -
            (statuses.findIndex((s) => s.id === b.status_id) ?? 99);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function renderTaskRow(task: Task, depth = 0): React.ReactNode {
    const status = statuses.find((s) => s.id === task.status_id);
    const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;

    return (
      <>
        <TableRow key={task.id} className="row-hover">
          <TableCell>
            <Link
              href={`/workspace/tasks/${task.id}`}
              className="hover:underline font-medium"
              style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}
            >
              {depth > 0 && (
                <span className="mr-1 text-muted-foreground text-xs">↳</span>
              )}
              {task.name}
            </Link>
          </TableCell>
          <TableCell>
            {task.profiles ? (
              <span className="text-sm">
                {formatFullName(task.profiles.first_name, task.profiles.last_name)}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </TableCell>
          <TableCell>
            {onStatusChange ? (
              <Select
                value={task.status_id}
                onValueChange={(v) => v && handleStatusChange(task.id, v)}
                disabled={isPending}
              >
                <SelectTrigger
                  className="h-7 w-36 text-xs border-0 rounded-full px-2"
                  style={{
                    backgroundColor: status ? `${status.color}20` : undefined,
                    color: status?.color,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              status && (
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: `${status.color}20`, color: status.color }}
                >
                  {status.name}
                </Badge>
              )
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", priorityColor)} />
              <span className="text-xs capitalize">{task.priority}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {formatDate(task.start_date)}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {formatDate(task.target_end_date)}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {getProgress(task)}
          </TableCell>
        </TableRow>
        {(task.workspace_tasks ?? []).map((sub) => renderTaskRow(sub as Task, depth + 1))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={(v) => setFilterAssignee(v ?? "all")}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {formatFullName(m.first_name, m.last_name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? "all")}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">🔴 Urgent</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🔵 Low</SelectItem>
            <SelectItem value="none">— None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <span className="flex items-center">
                  Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead>PIC</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("status")}
              >
                <span className="flex items-center">
                  Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("priority")}
              >
                <span className="flex items-center">
                  Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead>Start</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("target_end_date")}
              >
                <span className="flex items-center">
                  Due <SortIcon field="target_end_date" sortField={sortField} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => renderTaskRow(task))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
