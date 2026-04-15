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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { formatFullName } from "@/lib/utils/format";
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTaskField, addTaskRemark } from "@/lib/actions/workspace-tasks";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-muted-foreground/30",
};

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🔵 Low" },
  { value: "none", label: "— None" },
];

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
  workspace_task_remarks?: {
    id: string;
    content: string;
    created_at: string;
    profile_id: string;
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

const ALL_COLUMNS = ["pic", "status", "priority", "start", "due", "remarks"] as const;
type ColId = typeof ALL_COLUMNS[number];

export function TaskListView({ tasks, statuses, members, onStatusChange }: TaskListViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(new Set(ALL_COLUMNS));

  function handleAddRemark(taskId: string) {
    const content = remarkDraft.trim();
    if (!content) {
      setEditingRemarkId(null);
      return;
    }
    startTransition(async () => {
      const result = await addTaskRemark(taskId, content);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Remark added");
      setEditingRemarkId(null);
      setRemarkDraft("");
    });
  }

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

  function handleFieldUpdate(
    taskId: string,
    field: "name" | "assignee_id" | "priority" | "start_date" | "target_end_date",
    value: string | null
  ) {
    startTransition(async () => {
      const result = await updateTaskField(taskId, field, value);
      if (result && "error" in result) {
        toast.error(result.error);
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

  const colCount = 1 + Array.from(visibleCols).length; // name + visible cols

  function renderTaskRow(task: Task, depth = 0): React.ReactNode {
    const status = statuses.find((s) => s.id === task.status_id);
    const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;

    return (
      <>
        <TableRow key={task.id} className="row-hover">
          {/* Name — always visible */}
          <TableCell>
            {editingNameId === task.id ? (
              <Input
                autoFocus
                defaultValue={task.name}
                className="h-7 text-sm"
                style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}
                onBlur={(e) => {
                  handleFieldUpdate(task.id, "name", e.target.value);
                  setEditingNameId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingNameId(null);
                }}
              />
            ) : (
              <div className="flex items-center gap-1" style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}>
                {depth > 0 && (
                  <span className="mr-1 text-muted-foreground text-xs">↳</span>
                )}
                <span
                  onClick={() => setEditingNameId(task.id)}
                  className="cursor-text hover:underline font-medium"
                >
                  <Link href={`/workspace/tasks/${task.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                    {task.name}
                  </Link>
                </span>
              </div>
            )}
          </TableCell>

          {/* PIC */}
          {visibleCols.has("pic") && (
            <TableCell>
              <Select
                value={task.assignee_id ?? "_unassigned"}
                onValueChange={(v) => {
                  const newId = v === "_unassigned" ? null : v;
                  handleFieldUpdate(task.id, "assignee_id", newId);
                }}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 w-36 text-xs border-0 shadow-none">
                  <span className="truncate">
                    {task.profiles
                      ? formatFullName(task.profiles.first_name, task.profiles.last_name)
                      : "Unassigned"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {formatFullName(m.first_name, m.last_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          )}

          {/* Status */}
          {visibleCols.has("status") && (
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
                    <span className="truncate">{status?.name ?? "—"}</span>
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
          )}

          {/* Priority */}
          {visibleCols.has("priority") && (
            <TableCell>
              <Select
                value={task.priority}
                onValueChange={(v) => {
                  if (v) handleFieldUpdate(task.id, "priority", v);
                }}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 w-32 text-xs border-0 shadow-none">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", priorityColor)} />
                    <span className="capitalize truncate">{task.priority}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          )}

          {/* Start date */}
          {visibleCols.has("start") && (
            <TableCell>
              <Input
                type="date"
                value={task.start_date ?? ""}
                onChange={(e) =>
                  handleFieldUpdate(task.id, "start_date", e.target.value || null)
                }
                className="h-7 w-32 text-xs border-0 shadow-none px-1"
                disabled={isPending}
              />
            </TableCell>
          )}

          {/* Due date */}
          {visibleCols.has("due") && (
            <TableCell>
              <Input
                type="date"
                value={task.target_end_date ?? ""}
                onChange={(e) =>
                  handleFieldUpdate(task.id, "target_end_date", e.target.value || null)
                }
                className="h-7 w-32 text-xs border-0 shadow-none px-1"
                disabled={isPending}
              />
            </TableCell>
          )}

          {/* Remarks — shows last remark; click to add new */}
          {visibleCols.has("remarks") && (
            <TableCell className="text-sm">
              {editingRemarkId === task.id ? (
                <Input
                  autoFocus
                  value={remarkDraft}
                  placeholder="Add remark..."
                  className="h-7 text-xs"
                  onChange={(e) => setRemarkDraft(e.target.value)}
                  onBlur={() => handleAddRemark(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      setEditingRemarkId(null);
                      setRemarkDraft("");
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRemarkId(task.id);
                    setRemarkDraft("");
                  }}
                  className="block w-full text-left max-w-[240px] truncate text-muted-foreground hover:text-foreground cursor-text"
                  title={(task.workspace_task_remarks ?? []).slice(-1)[0]?.content ?? "Click to add remark"}
                >
                  {(() => {
                    const last = (task.workspace_task_remarks ?? [])
                      .slice()
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                    return last?.content ?? <span className="italic">+ Add remark</span>;
                  })()}
                </button>
              )}
            </TableCell>
          )}
        </TableRow>
        {(task.workspace_tasks ?? []).map((sub) => renderTaskRow(sub as Task, depth + 1))}
      </>
    );
  }

  const colLabels: { id: ColId; label: string }[] = [
    { id: "pic", label: "PIC" },
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
    { id: "start", label: "Start Date" },
    { id: "due", label: "Due Date" },
    { id: "remarks", label: "Remarks" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters + Column toggle */}
      <div className="flex flex-wrap items-center gap-2">
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

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Settings2 className="w-4 h-4 mr-1" />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {colLabels.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleCols.has(col.id)}
                  onCheckedChange={(c) => {
                    setVisibleCols((prev) => {
                      const next = new Set(prev);
                      if (c) next.add(col.id);
                      else next.delete(col.id);
                      return next;
                    });
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              {visibleCols.has("pic") && <TableHead>PIC</TableHead>}
              {visibleCols.has("status") && (
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("status")}
                >
                  <span className="flex items-center">
                    Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {visibleCols.has("priority") && (
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("priority")}
                >
                  <span className="flex items-center">
                    Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {visibleCols.has("start") && <TableHead>Start</TableHead>}
              {visibleCols.has("due") && (
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("target_end_date")}
                >
                  <span className="flex items-center">
                    Due <SortIcon field="target_end_date" sortField={sortField} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {visibleCols.has("remarks") && <TableHead>Remarks</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-muted-foreground py-8">
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
