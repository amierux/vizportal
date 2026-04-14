"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { submitTimesheet } from "@/lib/actions/timesheet";
import { searchMyTasks } from "@/lib/actions/workspace-time-entries";
import { logTime } from "@/lib/actions/workspace-time-entries";
import { updateTimeEntry } from "@/lib/actions/workspace-time-entries";
import { ChevronLeft, ChevronRight, Plus, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Task = { id: string; name: string };
type TimeEntry = {
  id: string;
  task_id: string;
  date: string;
  duration_minutes: number;
  description: string | null;
  is_billable: boolean;
  workspace_tasks?: { id: string; name: string } | null;
};
type Submission = { status: string } | null;

type Props = {
  entries: TimeEntry[];
  submission: Submission;
  weekStartDate: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function fmtHours(minutes: number): string {
  if (!minutes) return "";
  return (minutes / 60).toFixed(1);
}

export function TimesheetWeeklyGrid({ entries, submission, weekStartDate }: Props) {
  const weekDates = getWeekDates(weekStartDate);
  const isLocked = submission?.status === "submitted" || submission?.status === "approved";

  // Group entries by task
  const taskMap = new Map<string, { task: Task; byDate: Map<string, TimeEntry[]> }>();
  for (const entry of entries) {
    const taskId = entry.task_id;
    const taskName = entry.workspace_tasks?.name ?? "Unknown Task";
    if (!taskMap.has(taskId)) {
      taskMap.set(taskId, { task: { id: taskId, name: taskName }, byDate: new Map() });
    }
    const row = taskMap.get(taskId)!;
    if (!row.byDate.has(entry.date)) row.byDate.set(entry.date, []);
    row.byDate.get(entry.date)!.push(entry);
  }
  const rows = Array.from(taskMap.values());

  // Search state for adding tasks
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cell edit dialog
  const [editCell, setEditCell] = useState<{
    taskId: string; taskName: string; date: string; existingEntry?: TimeEntry;
  } | null>(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [isPending, startTransition] = useTransition();

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const results = await searchMyTasks(q);
    setSearchResults(results as Task[]);
    setIsSearching(false);
  }

  function openCell(taskId: string, taskName: string, date: string) {
    if (isLocked) return;
    const existing = entries.find((e) => e.task_id === taskId && e.date === date);
    setEditCell({ taskId, taskName, date, existingEntry: existing });
    setEditMinutes(existing ? String(Math.round(existing.duration_minutes / 60 * 10) / 10) : "");
    setEditDesc(existing?.description ?? "");
  }

  function handleSaveCell() {
    if (!editCell) return;
    const hours = parseFloat(editMinutes);
    if (isNaN(hours) || hours <= 0) { toast.error("Enter valid hours"); return; }
    const minutes = Math.round(hours * 60);

    startTransition(async () => {
      if (editCell.existingEntry) {
        await updateTimeEntry(editCell.existingEntry.id, minutes, editDesc || null, editCell.existingEntry.is_billable);
      } else {
        const fd = new FormData();
        fd.set("task_id", editCell.taskId);
        fd.set("date", editCell.date);
        fd.set("duration", String(hours));
        fd.set("unit", "hours");
        fd.set("description", editDesc);
        fd.set("is_billable", "false");
        await logTime(undefined, fd);
      }
      toast.success("Time saved");
      setEditCell(null);
    });
  }

  function handleSubmitWeek() {
    startTransition(async () => {
      const result = await submitTimesheet(weekStartDate);
      if (result.error) toast.error(result.error);
      else toast.success("Timesheet submitted");
    });
  }

  function handleAddTask(task: Task) {
    setSearchQuery("");
    setSearchResults([]);
    // Open first weekday cell for this task
    openCell(task.id, task.name, weekDates[0]);
  }

  // Totals
  const dayTotals = weekDates.map((date) =>
    entries.filter((e) => e.date === date).reduce((s, e) => s + e.duration_minutes, 0)
  );
  const grandTotal = dayTotals.reduce((s, t) => s + t, 0);

  const weekLabel = `${weekDates[0]} – ${weekDates[6]}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{weekLabel}</span>
        {!isLocked && (
          <Button size="sm" onClick={handleSubmitWeek} disabled={isPending}>
            <Send className="w-4 h-4 mr-1" />
            Submit Week
          </Button>
        )}
        {isLocked && (
          <Badge variant={submission?.status === "approved" ? "default" : "secondary"}>
            {submission?.status === "approved" ? "Approved" : "Submitted"}
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium w-48">Task</th>
              {DAY_LABELS.map((label, i) => (
                <th key={label} className="px-2 py-2 text-center font-medium w-16">
                  <div>{label}</div>
                  <div className="text-xs text-muted-foreground">{weekDates[i].slice(5)}</div>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ task, byDate }) => {
              const rowTotal = Array.from(byDate.values())
                .flat()
                .reduce((s, e) => s + e.duration_minutes, 0);
              return (
                <tr key={task.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium truncate max-w-[12rem]" title={task.name}>
                    {task.name}
                  </td>
                  {weekDates.map((date) => {
                    const dayEntries = byDate.get(date) ?? [];
                    const mins = dayEntries.reduce((s, e) => s + e.duration_minutes, 0);
                    return (
                      <td
                        key={date}
                        className={`px-2 py-2 text-center cursor-pointer rounded transition-colors ${
                          !isLocked ? "hover:bg-primary/10" : ""
                        }`}
                        onClick={() => openCell(task.id, task.name, date)}
                      >
                        <span className={mins > 0 ? "font-medium text-primary" : "text-muted-foreground/40"}>
                          {mins > 0 ? fmtHours(mins) : "–"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-semibold">
                    {fmtHours(rowTotal) || "0"}
                  </td>
                </tr>
              );
            })}

            {/* Total row */}
            <tr className="bg-muted/30 font-semibold border-t-2">
              <td className="px-3 py-2">Total</td>
              {dayTotals.map((mins, i) => (
                <td key={i} className="px-2 py-2 text-center">
                  {mins > 0 ? fmtHours(mins) : "–"}
                </td>
              ))}
              <td className="px-3 py-2 text-center text-primary">
                {fmtHours(grandTotal) || "0"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add task row */}
      {!isLocked && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Add task… (type to search)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            {isSearching && <span className="text-xs text-muted-foreground">Searching…</span>}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-80 bg-popover border rounded-md shadow-md">
              {searchResults.map((task) => (
                <button
                  key={task.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => handleAddTask(task)}
                >
                  {task.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cell edit dialog */}
      <Dialog open={!!editCell} onOpenChange={(open) => { if (!open) setEditCell(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Log Time — {editCell?.taskName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">{editCell?.date}</p>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min="0.1"
                step="0.5"
                placeholder="Hours"
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value)}
                className="w-28"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
            <Input
              placeholder="Description (optional)"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditCell(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveCell} disabled={isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
