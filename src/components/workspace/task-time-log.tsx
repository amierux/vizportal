"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { logTime, deleteTimeEntry } from "@/lib/actions/workspace-time-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Trash2 } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type TimeEntry = {
  id: string;
  date: string;
  duration_minutes: number;
  description: string | null;
  is_billable: boolean;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

type TaskTimeLogProps = {
  entries: TimeEntry[];
  taskId: string;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function TaskTimeLog({ entries, taskId }: TaskTimeLogProps) {
  const [state, formAction, isPending] = useActionState(logTime, null);
  const [deletePending, startDeleteTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
      toast.success("Time logged");
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  function handleDelete(entryId: string) {
    startDeleteTransition(async () => {
      const result = await deleteTimeEntry(entryId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Entry deleted");
    });
  }

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Clock className="h-4 w-4" />
          Time Log
        </div>
        {totalMinutes > 0 && (
          <span className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatDuration(totalMinutes)}</span>
          </span>
        )}
      </div>

      {/* Log Time Form */}
      <form ref={formRef} action={formAction} className="border rounded-lg p-4 space-y-3 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Log Time</p>
        <input type="hidden" name="task_id" value={taskId} />

        <div className="flex gap-2">
          <Input
            name="date"
            type="date"
            defaultValue={getTodayStr()}
            className="h-8 text-sm flex-1"
            required
          />
          <Input
            name="duration"
            type="number"
            min={1}
            step={0.5}
            placeholder="Duration"
            className="h-8 text-sm w-28"
            required
          />
          <select
            name="unit"
            defaultValue="hours"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="minutes">min</option>
            <option value="hours">hrs</option>
            <option value="days">days</option>
          </select>
        </div>

        <Input
          name="description"
          placeholder="Description (optional)"
          className="h-8 text-sm"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_billable"
              value="true"
              className="rounded"
            />
            <span className="text-muted-foreground">Billable</span>
          </label>
          <Button type="submit" size="sm" disabled={isPending} className="h-8">
            {isPending ? "Logging..." : "Log Time"}
          </Button>
        </div>
      </form>

      {/* Entries List */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No time logged yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-md border bg-background px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{formatDuration(entry.duration_minutes)}</span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                  {entry.is_billable && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Billable
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    by{" "}
                    {entry.profiles
                      ? formatFullName(entry.profiles.first_name, entry.profiles.last_name)
                      : "Unknown"}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.description}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deletePending}
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
