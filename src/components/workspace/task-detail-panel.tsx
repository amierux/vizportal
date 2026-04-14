"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateTask, updateTaskStatus } from "@/lib/actions/workspace-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatFullName } from "@/lib/utils/format";
import { TaskRemarks } from "./task-remarks";
import { TaskChecklists } from "./task-checklists";
import { TaskAttachments } from "./task-attachments";
import { TaskSubtasks } from "./task-subtasks";
import { Save } from "lucide-react";

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🔵 Low" },
  { value: "none", label: "— None" },
];

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
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

type ChecklistTemplate = {
  id: string;
  name: string;
};

type TaskDetailPanelProps = {
  task: {
    id: string;
    list_id: string;
    name: string;
    description: string | null;
    status_id: string;
    priority: string;
    assignee_id: string | null;
    start_date: string | null;
    target_end_date: string | null;
    profiles?: Profile | null;
    workspace_tasks?: {
      id: string;
      name: string;
      status_id: string;
      priority: string;
      assignee_id: string | null;
      profiles?: Profile | null;
    }[];
    workspace_task_remarks?: {
      id: string;
      content: string;
      created_at: string;
      profiles: Profile | null;
    }[];
    workspace_task_checklists?: {
      id: string;
      name: string;
      workspace_checklist_items: {
        id: string;
        name: string;
        is_checked: boolean;
        position: number;
      }[];
    }[];
    workspace_task_attachments?: {
      id: string;
      file_name: string;
      file_url: string;
      uploaded_by: string;
      created_at: string;
      profiles?: { first_name: string | null; last_name: string | null } | null;
    }[];
  };
  statuses: Status[];
  members: Member[];
  checklistTemplates?: ChecklistTemplate[];
};

export function TaskDetailPanel({
  task,
  statuses,
  members,
  checklistTemplates = [],
}: TaskDetailPanelProps) {
  const [state, formAction, isPending] = useActionState(updateTask, null);
  const [statusPending, startStatusTransition] = useTransition();
  const [currentStatusId, setCurrentStatusId] = useState(task.status_id);

  useEffect(() => {
    if (state && "success" in state) toast.success("Task saved");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  function handleStatusChange(newStatusId: string) {
    setCurrentStatusId(newStatusId);
    startStatusTransition(async () => {
      const result = await updateTaskStatus(task.id, newStatusId);
      if (result && "error" in result) {
        toast.error(result.error);
        setCurrentStatusId(task.status_id);
      }
    });
  }

  const currentStatus = statuses.find((s) => s.id === currentStatusId);

  return (
    <div className="flex flex-col gap-0 h-full animate-fade-in-up">
      {/* Header */}
      <form action={formAction} className="space-y-4 p-6 border-b">
        <input type="hidden" name="task_id" value={task.id} />
        <input type="hidden" name="status_id" value={currentStatusId} />

        {/* Task Name */}
        <Input
          name="name"
          defaultValue={task.name}
          className="text-xl font-semibold border-0 border-b rounded-none px-0 h-auto text-foreground focus-visible:ring-0 focus-visible:border-primary"
          placeholder="Task name"
          required
        />

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status */}
          <Select value={currentStatusId} onValueChange={(v) => v && handleStatusChange(v)} disabled={statusPending}>
            <SelectTrigger
              className="w-36 h-8 text-xs font-medium border-0 rounded-full px-3"
              style={{
                backgroundColor: currentStatus ? `${currentStatus.color}20` : undefined,
                color: currentStatus?.color,
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select name="priority" defaultValue={task.priority}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee */}
          <Select name="assignee_id" defaultValue={task.assignee_id ?? ""}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {formatFullName(m.first_name, m.last_name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dates */}
          <Input
            name="start_date"
            type="date"
            defaultValue={task.start_date ?? ""}
            className="h-8 w-36 text-xs"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            name="target_end_date"
            type="date"
            defaultValue={task.target_end_date ?? ""}
            className="h-8 w-36 text-xs"
          />

          <Button type="submit" size="sm" disabled={isPending} className="ml-auto h-8">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Description */}
        <textarea
          name="description"
          defaultValue={task.description ?? ""}
          placeholder="Add a description..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        />
      </form>

      {/* Body Sections */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Subtasks */}
        <TaskSubtasks
          subtasks={task.workspace_tasks ?? []}
          listId={task.list_id}
          parentTaskId={task.id}
          members={members}
          statuses={statuses}
        />

        <Separator />

        {/* Checklists */}
        <TaskChecklists
          checklists={task.workspace_task_checklists ?? []}
          taskId={task.id}
          checklistTemplates={checklistTemplates}
        />

        <Separator />

        {/* Attachments */}
        <TaskAttachments
          attachments={task.workspace_task_attachments ?? []}
          taskId={task.id}
        />
      </div>

      {/* Footer: Remarks */}
      <div className="border-t p-6 bg-muted/20">
        <TaskRemarks
          remarks={task.workspace_task_remarks ?? []}
          taskId={task.id}
        />
      </div>
    </div>
  );
}
