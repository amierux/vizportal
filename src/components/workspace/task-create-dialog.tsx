"use client";

import { useActionState, useEffect, useState } from "react";
import { createTask } from "@/lib/actions/workspace-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type TaskCreateDialogProps = {
  listId: string;
  members?: Member[];
  parentTaskId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "icon";
};

export function TaskCreateDialog({
  listId,
  members = [],
  parentTaskId,
  triggerLabel = "New Task",
  triggerVariant = "default",
  triggerSize = "sm",
}: TaskCreateDialogProps) {
  const [state, formAction, isPending] = useActionState(createTask, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(parentTaskId ? "Subtask created" : "Task created");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state, parentTaskId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: triggerVariant, size: triggerSize }))}>
        <Plus className="mr-1.5 h-4 w-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{parentTaskId ? "Add Subtask" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="list_id" value={listId} />
          {parentTaskId && (
            <input type="hidden" name="parent_task_id" value={parentTaskId} />
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" placeholder="Task name" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
            />
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assignee_id">Assignee</Label>
              <Select name="assignee_id">
                <SelectTrigger>
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
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_end_date">Target End Date</Label>
              <Input id="target_end_date" name="target_end_date" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select name="priority" defaultValue="none">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🔵 Low</SelectItem>
                <SelectItem value="none">— None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : parentTaskId ? "Add Subtask" : "Create Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
